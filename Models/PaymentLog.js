import mongoose from "mongoose";

const paymentLogSchema = mongoose.Schema(
  {
    orderId: { type: String },
    paymentId: { type: String },
    status: { type: String },
    reason: { type: String },
    payload: { type: Object },
  },
  { timestamps: true }
);

export default mongoose.model("paymentlog", paymentLogSchema);
