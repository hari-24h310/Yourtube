import video from "../Models/video.js";
import mongoose from "mongoose";

export const uploadvideo = async (req, res) => {
  if (req.file === undefined) {
    return res
      .status(404)
      .json({ message: "plz upload a mp4 video file only" });
  } else {
    try {
      const file = new video({
        videotitle: req.body.videotitle,
        filename: req.file.originalname,
        filepath: req.file.path,
        filetype: req.file.mimetype,
        filesize: req.file.size,
        videochanel: req.body.videochanel,
        uploader: req.body.uploader,
      });
      await file.save();
      return res.status(201).json("file uploaded successfully");
    } catch (error) {
      console.error(" error:", error);
      return res.status(500).json({ message: "Something went wrong" });
    }
  }
};
export const getallvideo = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      // DB not connected — return seeded sample videos as a fallback
      try {
        const { sampleVideos } = await import("../seed.js");
        return res.status(200).json({ videos: sampleVideos });
      } catch (impErr) {
        console.error("Fallback sampleVideos import error:", impErr);
        return res.status(500).json({ message: "Database not connected" });
      }
    }

    const files = await video.find();
    return res.status(200).json({ videos: files });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
