import express from "express";
import { sendInvoiceEmail } from "../utils/emailService.js";

const router = express.Router();

// POST /email/test
// Body: { email }
router.post("/test", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "email is required" });

  try {
    const ok = await sendInvoiceEmail({
      email,
      planName: "Test Plan",
      amount: 0,
      paymentId: `test_payment_${Date.now()}`,
      orderId: `test_order_${Date.now()}`,
      expiryDate: new Date(),
    });

    if (!ok) return res.status(500).json({ message: "Failed to send test email" });

    return res.status(200).json({ message: "Test email sent" });
  } catch (error) {
    console.error("/email/test error:", error);
    return res.status(500).json({ message: error?.message || "Email test failed" });
  }
});

export default router;
