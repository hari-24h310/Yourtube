import express from "express";
import { login, updateprofile } from "../controllers/auth.js";
import { sendOTP } from "../controllers/authOTP.js";
const routes = express.Router();

// existing routes
routes.post("/login", login);
routes.patch("/update/:id", updateprofile);

// OTP routes
routes.post("/send-otp", sendOTP);

export default routes;