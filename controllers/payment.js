import Razorpay from "razorpay";
import crypto from "crypto";
import Order from "../Models/Order.js";
import PaymentLog from "../Models/PaymentLog.js";
import UserPlan from "../Models/UserPlan.js";
import User from "../Models/Auth.js";
import { sendInvoiceEmail } from "../utils/emailService.js";
import { upgradeUserPlan } from "./plan.js";

// Initialize Razorpay client if credentials are provided. If not, run in mock mode for local/dev.
let razorpay = null;
let RAZORPAY_AVAILABLE = false;
try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    RAZORPAY_AVAILABLE = true;
  } else {
    console.warn('Razorpay keys not set — running in MOCK payment mode. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET for real payments.');
  }
} catch (e) {
  console.warn('Failed to initialize Razorpay — entering MOCK mode.', e?.message || e);
  razorpay = null;
  RAZORPAY_AVAILABLE = false;
}

const getPlanDisplayName = (planType = "") => {
  const normalized = String(planType).toLowerCase();
  if (normalized === "bronze") return "Bronze";
  if (normalized === "silver") return "Silver";
  if (normalized === "gold") return "Gold";
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "Plan";
};

const sendPaymentSuccessEmail = async ({ userId, order, planType, amount, paymentId, orderId, expiryDate }) => {
  try {
    const user = await User.findById(userId).lean();
    if (!user?.email) {
      console.warn("Skipping payment invoice email because no email was found for the user", { userId });
      return false;
    }

    const normalizedPlan = String(planType || order?.plan || "").toLowerCase();
    const planMeta = {
      bronze: { watchTimeLimit: "7 minutes", downloadLimit: "Unlimited", validity: "30 days" },
      silver: { watchTimeLimit: "10 minutes", downloadLimit: "Unlimited", validity: "30 days" },
      gold: { watchTimeLimit: "Unlimited", downloadLimit: "Unlimited", validity: "30 days" },
    }[normalizedPlan] || { watchTimeLimit: "As per plan", downloadLimit: "Unlimited", validity: "30 days" };

    const amountInRupees = Number(amount || 0) / 100;

    return await sendInvoiceEmail({
      email: user.email,
      planName: getPlanDisplayName(normalizedPlan),
      amount: amountInRupees.toFixed(2),
      paymentId: paymentId || order?.razorpayPaymentId || "N/A",
      orderId: orderId || order?.razorpayOrderId || order?.receipt || order?._id,
      expiryDate: expiryDate || order?.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      planDetails: planMeta,
    });
  } catch (error) {
    console.error("Payment success email failed:", error);
    return false;
  }
};

// ----------------------
// CREATE ORDER
// ----------------------
export const createPaymentOrder = async (req, res) => {
  try {
    const { amount, currency = "INR", userId, plan, planType } = req.body;
    const selectedPlan = plan || planType;

    if (!userId || !selectedPlan || !amount) {
      return res.status(400).json({
        success: false,
        message: "userId, plan, and amount are required",
      });
    }

    const receiptId = `rcpt_${Date.now()}`;

    if (RAZORPAY_AVAILABLE && razorpay) {
      const options = {
        amount, // Razorpay expects the amount in paise
        currency,
        receipt: receiptId,
      };

      const order = await razorpay.orders.create(options);

      // save in DB
      await Order.create({
        userId,
        plan: selectedPlan,
        amount,
        currency,
        razorpayOrderId: order.id,
        status: "pending",
        planUpgraded: false,
        receipt: order.receipt,
      });

      return res.json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        plan: selectedPlan,
        userId,
      });
    }

    // MOCK mode (no Razorpay keys): create a fake order record and return mock flag
    const mockOrderId = `mock_order_${Date.now()}`;
    await Order.create({
      userId,
      plan: selectedPlan,
      amount,
      currency,
      razorpayOrderId: mockOrderId,
      status: "pending",
      planUpgraded: false,
      receipt: receiptId,
    });

    return res.json({
      success: true,
      mock: true,
      orderId: mockOrderId,
      amount,
      currency,
      receipt: receiptId,
      plan: selectedPlan,
      userId,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// ----------------------
// VERIFY PAYMENT (frontend fallback)
// ----------------------
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, mock } = req.body;

    // If real Razorpay configured, verify signature
    if (RAZORPAY_AVAILABLE && process.env.RAZORPAY_KEY_SECRET) {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ success: false, message: "Missing payment verification fields" });
      }

      const body = razorpay_order_id + "|" + razorpay_payment_id;

      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false, message: "Invalid signature" });
      }

      const order = await Order.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        {
          status: "success",
          razorpayPaymentId: razorpay_payment_id,
        },
        { new: true }
      );

      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      if (!order.planUpgraded) {
        const upgradedPlan = await upgradeUserPlan(order.userId, order.plan, razorpay_payment_id, razorpay_order_id);
        order.planUpgraded = true;
        await order.save();
        await sendPaymentSuccessEmail({
          userId: order.userId,
          order,
          planType: order.plan,
          amount: order.amount,
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
          expiryDate: upgradedPlan?.expiryDate,
        });
      }

      return res.json({ success: true, message: "Payment verified", planUpgraded: true });
    }

    // MOCK or fallback verification (development): accept mock payloads
    // Allow verify when `mock` flag present or order id starts with mock_order_
    const mockOrderId = razorpay_order_id;
    if (!mockOrderId) {
      return res.status(400).json({ success: false, message: "Missing order id for mock verification" });
    }

    const order = await Order.findOneAndUpdate(
      { razorpayOrderId: mockOrderId },
      {
        status: "success",
        razorpayPaymentId: razorpay_payment_id || `mock_payment_${Date.now()}`,
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found (mock)" });
    }

    if (!order.planUpgraded) {
      const upgradedPlan = await upgradeUserPlan(order.userId, order.plan, razorpay_payment_id || `mock_payment_${Date.now()}`, mockOrderId);
      order.planUpgraded = true;
      await order.save();
      await sendPaymentSuccessEmail({
        userId: order.userId,
        order,
        planType: order.plan,
        amount: order.amount,
        paymentId: razorpay_payment_id || `mock_payment_${Date.now()}`,
        orderId: mockOrderId,
        expiryDate: upgradedPlan?.expiryDate,
      });
    }

    return res.json({ success: true, message: "(MOCK) Payment verified", planUpgraded: true, mock: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ----------------------
// WEBHOOK (MOST IMPORTANT)
// ----------------------
export const razorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    // Use raw body if available (index.js config stores it on req.rawBody)
    const payloadBuffer = req.rawBody ? req.rawBody : Buffer.from(JSON.stringify(req.body));
    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(payloadBuffer);
    const digest = shasum.digest("hex");
    const razorpaySignature = req.headers["x-razorpay-signature"];

    if (digest !== razorpaySignature) {
      console.warn("Webhook signature mismatch", { digest, razorpaySignature });
      return res.status(400).json({ message: "Invalid webhook signature" });
    }

    const event = req.body.event;

    // ----------------------
    // PAYMENT SUCCESS
    // ----------------------
    if (event === "payment.captured") {
      const payment = req.body.payload.payment.entity;
      const order = await Order.findOne({ razorpayOrderId: payment.order_id });

      if (order) {
        let upgradedPlan = null;
        if (!order.planUpgraded) {
          upgradedPlan = await upgradeUserPlan(order.userId, order.plan, payment.id, payment.order_id);
          order.planUpgraded = true;
        }

        order.status = "success";
        order.razorpayPaymentId = payment.id;
        order.paymentDetails = payment;
        await order.save();

        await sendPaymentSuccessEmail({
          userId: order.userId,
          order,
          planType: order.plan,
          amount: order.amount,
          paymentId: payment.id,
          orderId: payment.order_id,
          expiryDate: upgradedPlan?.expiryDate,
        });
      }

      // Log success
      try {
        await PaymentLog.create({
          orderId: payment.order_id,
          paymentId: payment.id,
          status: 'captured',
          payload: payment,
        });
      } catch (e) {
        console.error("Failed to log payment capture:", e);
      }
    }

    // ----------------------
    // PAYMENT FAILED
    // ----------------------
    if (event === "payment.failed") {
      const payment = req.body.payload.payment.entity;

      await Order.findOneAndUpdate(
        { razorpayOrderId: payment.order_id },
        {
          status: "failed",
          paymentDetails: payment,
        }
      );
      // Log failure for later retry and debugging
      try {
        await PaymentLog.create({
          orderId: payment.order_id,
          paymentId: payment.id,
          status: 'failed',
          payload: payment,
          reason: payment.error_description || null,
        });
      } catch (e) {
        console.error("Failed to log payment failure:", e);
      }
    }

    res.json({ status: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Webhook error" });
  }
};


// ----------------------
// PLANS (sample)
// ----------------------
export const getPlanDetails = async (req, res) => {
  const plans = [
    { type: "bronze", name: "Bronze", price: 10, watchTimeLimit: "7 minutes" },
    { type: "silver", name: "Silver", price: 50, watchTimeLimit: "10 minutes" },
    { type: "gold", name: "Gold", price: 100, watchTimeLimit: "Unlimited" },
  ];

  res.json({ plans });
};


// ----------------------
// USER PLAN INFO
// ----------------------
export const getUserPlanInfo = async (req, res) => {
  try {
    const { userId } = req.params;

    const order = await Order.findOne({ userId, status: "success" });

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};