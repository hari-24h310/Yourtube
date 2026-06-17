import express from "express";
import { login, updateprofile } from "../controllers/auth.js";
import { sendOTP, verifyOTPLogin } from "../controllers/authotp.js";

const routes = express.Router();

// existing routes
routes.post("/login", login);
routes.patch("/update/:id", updateprofile);

// OTP routes (ADDED)
routes.post("/send-otp", sendOTP);
routes.post("/verify-otp", verifyOTPLogin);

export default routes;