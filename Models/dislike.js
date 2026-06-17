import mongoose from "mongoose";

const dislikeschema = mongoose.Schema(
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
    dislikedon: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("dislikes", dislikeschema);
