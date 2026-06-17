import mongoose from "mongoose";

const userPlanSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    planType: {
      type: String,
      enum: ["free", "bronze", "silver", "gold"],
      default: "free",
    },
    downloadLimit: {
      type: Number,
      default: 1, // 1 video per day for free plan
    },
    watchTimeLimit: {
      type: Number,
      default: 5, // 5 minutes for free plan
    },
    isActive: { type: Boolean, default: true },
    startDate: { type: Date, default: Date.now },
    expiryDate: { type: Date, default: null }, // null for free/active, date for paid plans
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("userplan", userPlanSchema);
