import express from "express";
import {
  requestOtp,
  verifyOtpAndLogin,
  getUserTheme,
  getPublicTheme,
  devGetOtp,
  devVerifyOtp,
  devExpireOtp,
  devExpireOtpV2,
  devInspectOtp,
} from "../controllers/regionAuthController.js";

const router = express.Router();

// Request OTP (email or SMS based on region)
router.post("/request-otp", requestOtp);

// Verify OTP and login/register
router.post("/verify-otp", verifyOtpAndLogin);

// Get user's theme and region info
router.get("/theme/:userId", getUserTheme);

// Get public theme (without authentication)
router.get("/public-theme", getPublicTheme);
// Development-only route to fetch stored OTP (only when NODE_ENV !== 'production')
router.get("/dev/otp", devGetOtp);
router.post("/dev/verify-otp", devVerifyOtp);
router.post("/dev/expire-otp", devExpireOtp);
router.get("/dev/expire-otp-v2", devExpireOtpV2);
router.get("/dev/inspect", devInspectOtp);
// Note: Development-only debug routes removed for production safety

export default router;
