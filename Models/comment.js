import mongoose from "mongoose";
const commentschema = mongoose.Schema(
  {
    userid: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    videoid: {
      type: mongoose.Schema.Types.Mixed,
      ref: "videofiles",
      required: true,
    },
    commentbody: { type: String, required: true },
    usercommented: { type: String },
    userCity: { type: String, default: "Unknown" },
    userLanguage: { type: String, default: "en" },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    translations: [
      {
        language: String,
        text: String,
      },
    ],
    status: { type: String, default: "active", enum: ["active", "blocked"] },
    commentedon: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("comment", commentschema);
