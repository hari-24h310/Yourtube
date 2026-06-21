import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import sgMail from "@sendgrid/mail";
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
import crypto from "crypto";
import Otp from "../Models/Otp.js";

export const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const hashOtp = (otp) => {
  return crypto.createHash("sha256").update(otp).digest("hex");
};

async function sendEmailOtp(email, otp) {
  await sgMail.send({
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: "Your OTP Code",
    text: `Your OTP is: ${otp}. Valid for 10 minutes.`,
  });
  return true;
}

export const sendSmsOtp = async (phoneNumber, otp) => {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.warn("Twilio SMS is not configured.");
      if (process.env.NODE_ENV === "production") {
        throw new Error("Twilio SMS service is not configured for production");
      }
      console.log(`[DEV MODE] SMS OTP would be sent to ${phoneNumber}: ${otp}`);
      return true;
    }
    const twilio = (await import("twilio")).default;
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const message = await client.messages.create({
      body: `Your YourTube verification code is: ${otp}. Valid for 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
    console.log("SMS sent successfully:", message.sid);
    return true;
  } catch (error) {
    console.error("Error sending SMS OTP:", error);
    if (process.env.NODE_ENV === "production") throw error;
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
export { sendEmailOtp };

export const verifyOTP = async (identifier, otp) => {
  const result = await verifyOtp(identifier, otp);
  return { valid: result.success, reason: result.message };
};

export const isSouthIndia = (region) => {
  const southIndiaStates = ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana", "Puducherry"];
  return southIndiaStates.includes(region);
};