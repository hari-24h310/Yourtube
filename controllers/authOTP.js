import otpService from "../utils/otpService.js";
import { sendEmailOTP, sendMobileOTP } from "../utils/otp.js";

// ---------------- SEND OTP ----------------
export const sendOTP = async (req, res) => {
  try {
    let { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({ message: "Email or phone required" });
    }

    identifier = identifier.trim().toLowerCase();

    const isEmail = identifier.includes("@");

    // rate limit check
    const allowed = await otpService.canSendOTP(identifier);
    if (!allowed) {
      return res.status(429).json({ message: "Rate limit exceeded" });
    }

    // generate OTP
    const otp = await otpService.generateOTP(identifier);

    // send OTP
    if (isEmail) {
      await sendEmailOTP(identifier, otp);
      return res.json({ message: "OTP sent to email", method: "email" });
    } else {
      await sendMobileOTP(identifier, otp);
      return res.json({ message: "OTP sent to mobile", method: "sms" });
    }
  } catch (err) {
    console.error("sendOTP error:", err);
    return res.status(500).json({ message: "Failed to send OTP" });
  }
};

// ---------------- VERIFY OTP ----------------
export const verifyOTP = async (req, res) => {
  try {
    let { identifier, otp } = req.body;

    if (!identifier || !otp) {
      return res.status(400).json({ message: "Missing fields" });
    }

    identifier = identifier.trim().toLowerCase();

    const result = await otpService.verifyOTP(identifier, otp);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json({ success: true, message: "OTP verified" });
  } catch (err) {
    console.error("verifyOTP error:", err);
    return res.status(500).json({ message: "Verification failed" });
  }
};