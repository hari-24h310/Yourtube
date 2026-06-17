import { sendEmailOTP, sendMobileOTP, isSouthIndia } from "../utils/otp.js";
import otpService from "../utils/otpService.js";

// SEND OTP
export const sendOTP = async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({ message: "Email or phone required." });
    }

    const isEmail = identifier.includes("@");

    let region = "";

    // IP detection (safe fallback)
    try {
      const ipRes = await fetch("https://ipapi.co/json/");
      const ipData = await ipRes.json();
      region = ipData.region || "";
    } catch (err) {
      console.log("IP detection failed:", err.message);
    }

    // rate limit check
    const allowed = await otpService.canSendOTP(identifier);
    if (!allowed) {
      return res.status(429).json({
        message: "Rate limit exceeded. Try again later.",
      });
    }

    // generate OTP
    const otp = await otpService.generateOTP(identifier);

    // EMAIL FLOW
    if (isEmail) {
      await sendEmailOTP(identifier, otp);
      return res.json({
        method: "email",
        message: "OTP sent via Email",
      });
    }

    // SMS FLOW (South India special rule)
    if (isSouthIndia(region)) {
      await sendMobileOTP(identifier, otp);
      return res.json({
        method: "sms",
        message: "OTP sent via SMS (South India mode)",
      });
    }

    // DEFAULT SMS FLOW
    await sendMobileOTP(identifier, otp);
    return res.json({
      method: "sms",
      message: "OTP sent via SMS",
    });

  } catch (err) {
    console.error("sendOTP error:", err);
    return res.status(500).json({
      message: "Failed to send OTP",
      error: err.message,
    });
  }
};