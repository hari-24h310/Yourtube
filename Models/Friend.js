import mongoose from "mongoose";

const friendSchema = mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  friendId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  status: {
    type: String,
    enum: ["pending", "accepted", "blocked"],
    default: "pending",
  },
  requestedAt: { type: Date, default: Date.now },
  acceptedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("friend", friendSchema);
