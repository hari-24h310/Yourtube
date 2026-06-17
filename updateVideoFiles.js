import mongoose from "mongoose";
import dotenv from "dotenv";
import video from "./Models/video.js";

dotenv.config();

const updateVideoFilePaths = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Update all videos to use the actual video file that exists
    const result = await video.updateMany(
      {},
      { filepath: "uploads/2025-06-25T06-09-29.296Z-vdo.mp4" }
    );

    console.log(`Updated ${result.modifiedCount} videos`);
    console.log("Video file paths updated successfully");

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

updateVideoFilePaths();
