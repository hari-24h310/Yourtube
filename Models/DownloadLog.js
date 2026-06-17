import mongoose from "mongoose";

const downloadLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: false,
    },
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      required: true,
    },
    videotitle: { type: String, default: "Unknown" },
    videochanel: { type: String, default: "Unknown Channel" },
    filepath: { type: String, default: "" },
    filesize: { type: String, default: "0 MB" },
    videoUrl: { type: String, required: true },
    downloadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Index for fast daily lookup per user
downloadLogSchema.index({ userId: 1, downloadedAt: -1 });

const DownloadLog = mongoose.model("DownloadLog", downloadLogSchema);
export default DownloadLog;
