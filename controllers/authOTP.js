import { sendEmailOTP, sendMobileOTP, isSouthIndia } from "../utils/otp.js";
import otpService from "../utils/otpService.js";
import Auth from "../Models/Auth.js";
import jwt from "jsonwebtoken";

// SEND OTP
export const sendOTP = async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({ message: "Email or phone required." });
    }

    const isEmail = identifier.includes("@");

    // EMAIL OTP
    if (isEmail) {
      const allowed = await otpService.canSendOTP(identifier);
      if (!allowed) return res.status(429).json({ message: "Rate limit exceeded. Try again later." });

      const otp = await otpService.generateOTP(identifier);
      await sendEmailOTP(identifier, otp);

      return res.json({ method: "email", message: "Email OTP sent" });
    }

    // PHONE OTP
    let region = "";

    try {
      const ip =
        req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;

      const ipRes = await fetch(`https://ipapi.co/${ip}/json/`);
      const ipData = await ipRes.json();

      region = ipData.region || "";
    } catch (err) {
      console.log("IP detection failed:", err.message);
    }

    if (isSouthIndia(region)) {
      const allowed = await otpService.canSendOTP(identifier);
      if (!allowed) return res.status(429).json({ message: "Rate limit exceeded. Try again later." });
      const otp = await otpService.generateOTP(identifier);
      await sendMobileOTP(identifier, otp);
      return res.json({ method: "sms", message: "OTP sent via SMS (South India mode)" });
    } else {
      const allowed = await otpService.canSendOTP(identifier);
      if (!allowed) return res.status(429).json({ message: "Rate limit exceeded. Try again later." });
      const otp = await otpService.generateOTP(identifier);
      await sendMobileOTP(identifier, otp);
      return res.json({ method: "sms", message: "OTP sent via SMS" });
    }
  } catch (err) {
    console.error("sendOTP error:", err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

// VERIFY OTP + LOGIN
export const verifyOTPLogin = async (req, res) => {
  try {
    const { identifier, otp } = req.body;

    if (!identifier || !otp) {
      return res.status(400).json({ message: "identifier and otp required" });
    }

    // account lock check
    if (await otpService.isAccountLocked(identifier)) {
      return res.status(423).json({ message: "Account locked due to multiple failed attempts. Try later." });
    }

    const canVerify = await otpService.canVerifyOTP(identifier);
    if (!canVerify) {
      return res.status(429).json({ message: "Too many verification attempts. Request a new OTP." });
    }

    const result = await otpService.verifyOTP(identifier, otp);

    if (!result.success) {
      await otpService.recordFailedLogin(identifier);
      return res.status(401).json({ message: result.reason });
    }

    // reset failed login counters on success
    await otpService.resetFailedLogin(identifier);

    const isEmail = identifier.includes("@");

    // FIXED FIELD NAME (phoneNumber)
    let user = await Auth.findOne(
      isEmail ? { email: identifier } : { phoneNumber: identifier }
    );

    // CREATE USER IF NOT EXISTS
    if (!user) {
      user = await Auth.create({
        email: isEmail ? identifier : undefined,
        phoneNumber: !isEmail ? identifier : undefined,
        username: isEmail
          ? identifier.split("@")[0]
          : `user_${identifier.slice(-4)}`,
        authMethod: "otp",
        lastLoginTime: new Date(),
      });
    } else {
      user.lastLoginTime = new Date();
      await user.save();
    }

    // JWT TOKEN
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "30d" }
    );

    return res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        city: user.city,
      },
    });
  } catch (err) {
    console.error("verifyOTPLogin error:", err);
    res.status(500).json({ message: "Server error" });
  }
};