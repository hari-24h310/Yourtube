import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  plan: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  receipt: { type: String },

  razorpayOrderId: String,
  razorpayPaymentId: String,
  planUpgraded: { type: Boolean, default: false },

  status: {
    type: String,
    enum: ["pending", "success", "failed"],
    default: "pending",
  },

  paymentDetails: Object,

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Order", orderSchema);