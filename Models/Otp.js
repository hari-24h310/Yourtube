import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  identifier: String,
  method: String,
  purpose: String,
  otpHash: String,
  attempts: { type: Number, default: 0 },
  resendCount: { type: Number, default: 0 },
  lastResendAt: Date,
  ip: String,
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date,
});

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Otp", otpSchema);