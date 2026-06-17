import mongoose from "mongoose";
const likeschema = mongoose.Schema(
  {
    viewer: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    videoid: {
      type: mongoose.Schema.Types.Mixed,
      ref: "videofiles",
      required: true,
    },
    likedon: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("like", likeschema);
