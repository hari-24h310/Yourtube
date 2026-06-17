import express from "express";
import {
  createPaymentOrder,
  verifyPayment,
  getPlanDetails,
  getUserPlanInfo,
  razorpayWebhook
} from "../controllers/payment.js";

const routes = express.Router();

// Create payment order
routes.post("/create-order", createPaymentOrder);

// Verify payment (frontend fallback)
routes.post("/verify", verifyPayment);

// 🔐 WEBHOOK (IMPORTANT)
routes.post("/webhook", razorpayWebhook);

// Get all plan details
routes.get("/plans", getPlanDetails);

// Get user's plan info
routes.get("/user-plan/:userId", getUserPlanInfo);

export default routes;