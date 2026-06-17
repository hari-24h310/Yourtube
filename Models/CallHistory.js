import mongoose from "mongoose";

const callHistorySchema = mongoose.Schema({
  callerId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  callType: { type: String, enum: ["audio", "video", "screen-share"], default: "video" },
  duration: { type: Number, default: 0 }, // in seconds
  status: {
    type: String,
    enum: ["completed", "missed", "declined", "failed"],
    default: "completed",
  },
  recordingUrl: { type: String }, // URL to stored recording
  recordingSize: { type: Number }, // Size in bytes
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("callhistory", callHistorySchema);
