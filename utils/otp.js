import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { Resend } from "resend";
import crypto from "crypto";
import Otp from "../Models/Otp.js";

const getResend = () => new Resend(process.env.RESEND_API_KEY);

export const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const hashOtp = (otp) => {
  return crypto.createHash("sha256").update(otp).digest("hex");
};

export const sendEmailOtp = async (email, otp) => {
  try {
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured in .env");
      throw new Error("Email service is not configured. Please set RESEND_API_KEY in .env");
    }

    const { data, error } = await getResend().emails.send({
      from: "YourTube <onboarding@resend.dev>",
      to: email,
      subject: "YourTube Login Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #ff0000; text-align: center;">🎬 YourTube</h2>
          <p>Hi there!</p>
          <p>Your login verification code is:</p>
          <div style="background-color: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <h1 style="color: #ff0000; letter-spacing: 5px; margin: 0;">${otp}</h1>
          </div>
          <p>This code will expire in <strong>10 minutes</strong>.</p>
          <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend API error:", error);
      throw new Error(`Failed to send email: ${error.message || error}`);
    }

    console.log("Email sent via Resend:", data);
    return true;
  } catch (error) {
    console.error("Error sending email OTP:", error.message || error);
    throw error; // Re-throw so caller knows it failed
  }
};

export const sendSmsOtp = async (phoneNumber, otp) => {
  try {
    // Check if Twilio is configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.warn("Twilio SMS is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env");
      if (process.env.NODE_ENV === "production") {
        throw new Error("Twilio SMS service is not configured for production");
      }
      // In development, mock the SMS send
      console.log(`[DEV MODE] SMS OTP would be sent to ${phoneNumber}: ${otp}`);
      return true;
    }

    // Import Twilio client
    const twilio = (await import("twilio")).default;
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    // Send SMS
    const message = await client.messages.create({
      body: `Your YourTube verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    console.log("SMS sent successfully:", message.sid);
    return true;
  } catch (error) {
    console.error("Error sending SMS OTP:", error);
    if (process.env.NODE_ENV === "production") {
      throw error; // Fail loudly in production
    }
    // In development, still return true to allow testing
    return true;
  }
};

export const storeOtp = async (identifier, otp, method, ip) => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
  const existing = await Otp.findOne({ identifier, used: false, expiresAt: { $gt: new Date() } });
  if (existing) {
    if (existing.resendCount >= 5) {
      return { success: false, message: "Resend limit exceeded. Please try again later." };
    }
    existing.resendCount = existing.resendCount + 1;
    existing.otpHash = hashOtp(otp);
    existing.ip = ip || existing.ip;
    existing.expiresAt = expiresAt;
    await existing.save();
    return { success: true, debugOtp: process.env.NODE_ENV === "production" ? undefined : otp };
  }
  const doc = new Otp({
    identifier,
    method: method === "email" ? "email" : "sms",
    otpHash: hashOtp(otp),
    ip,
    expiresAt,
  });
  await doc.save();
  return { success: true, debugOtp: process.env.NODE_ENV === "production" ? undefined : otp };
};

export const verifyOtp = async (identifier, inputOtp) => {
  const record = await Otp.findOne({ identifier, used: false }).sort({ createdAt: -1 });
  if (!record) return { success: false, message: "OTP not found. Please request a new OTP." };
  if (new Date() > record.expiresAt) return { success: false, message: "OTP has expired. Please request a new OTP." };
  if (record.attempts >= 5) {
    record.used = true;
    await record.save();
    return { success: false, message: "Too many failed attempts. Please request a new OTP." };
  }
  const inputHash = hashOtp(inputOtp);
  if (inputHash !== record.otpHash) {
    record.attempts = (record.attempts || 0) + 1;
    await record.save();
    return { success: false, message: `Incorrect OTP. ${5 - record.attempts} attempts remaining.` };
  }
  record.used = true;
  await record.save();
  return { success: true, message: "OTP verified successfully." };
};

export const getStoredOtp = async (identifier) => {
  if (process.env.NODE_ENV === "production") return null;
  const record = await Otp.findOne({ identifier }).sort({ createdAt: -1 });
  if (!record) return null;
  return { otpHash: record.otpHash, method: record.method, expiresAt: record.expiresAt, used: record.used, resendCount: record.resendCount, attempts: record.attempts };
};

export const sendEmailOTP = sendEmailOtp;
export const sendMobileOTP = sendSmsOtp;

export const verifyOTP = async (identifier, otp) => {
  const result = await verifyOtp(identifier, otp);
  return { valid: result.success, reason: result.message };
};

export const isSouthIndia = (region) => {
  const southIndiaStates = ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana", "Puducherry"];
  return southIndiaStates.includes(region);
};