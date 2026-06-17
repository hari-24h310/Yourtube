import mongoose from "mongoose";
import DownloadLog from "../Models/DownloadLog.js";
import UserPlan from "../Models/UserPlan.js";
import Video from "../Models/video.js";

// =====================
// DOWNLOAD VIDEO
// =====================
export const downloadVideo = async (req, res) => {
  try {
    const { userId, videoId } = req.body;

    if (!userId || !videoId) {
      return res.status(400).json({ message: "userId and videoId required" });
    }

    const userObjectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : null;

    if (!userObjectId) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    // PLAN CHECK
    const plan = await UserPlan.findOne({
      userId: userObjectId,
      isActive: true,
    });

    const isPremium =
      plan &&
      ["bronze", "silver", "gold"].includes(plan.planType) &&
      (!plan.expiryDate || plan.expiryDate > new Date());

    // FREE LIMIT CHECK (1 per day)
    if (!isPremium) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayCount = await DownloadLog.countDocuments({
        userId: userObjectId,
        downloadedAt: { $gte: todayStart },
      });

      if (todayCount >= 1) {
        return res.status(403).json({
          message: "Free plan allows only 1 download per day",
          requiresUpgrade: true,
        });
      }
    }

    // GET VIDEO - try by ObjectId first, then by filename
    let video;
    if (mongoose.Types.ObjectId.isValid(videoId)) {
      video = await Video.findById(videoId);
    }

    if (!video) {
      video = await Video.findOne({ filename: videoId });
    }

    const backendBase =
      process.env.BACKEND_URL ||
      `http://localhost:${process.env.PORT || 5000}`;

    const sampleVideoFallback = {
      "sample-web-dev": {
        videotitle: "Learn Web Development in 2024",
        videochanel: "Tech Academy",
        filepath: "/video/vdo.mp4",
        filesize: "45 MB",
      },
      "sample-react-hooks": {
        videotitle: "React Hooks Explained - Complete Guide",
        videochanel: "Code Masters",
        filepath: "/video/vdo.mp4",
        filesize: "38 MB",
      },
      "sample-nextjs": {
        videotitle: "Next.js Full Stack Development",
        videochanel: "Modern Dev",
        filepath: "/video/vdo.mp4",
        filesize: "55 MB",
      },
    };

    let fallbackVideo = null;
    if (!video && typeof videoId === "string") {
      fallbackVideo = sampleVideoFallback[videoId] || null;
    }

    if (!video && !fallbackVideo) {
      return res.status(404).json({ message: "Video not found" });
    }

    const videoUrl =
      (video && (video.videoUrl || video.url)) ||
      (video && video.filepath
        ? `${backendBase}/${video.filepath.replace(/^\//, "")}`
        : fallbackVideo
        ? `${backendBase}/${fallbackVideo.filepath.replace(/^\//, "")}`
        : "");

    if (!videoUrl) {
      console.error("No video URL found for video:", video?._id || videoId);
      return res.status(400).json({ message: "Video URL not available" });
    }

    // SAVE LOG
    const log = await DownloadLog.create({
      userId: userObjectId,
      videoId: video ? video._id : new mongoose.Types.ObjectId(),
      videotitle: video
        ? video.videotitle || "Unknown"
        : fallbackVideo?.videotitle || "Unknown",
      videochanel: video
        ? video.videochanel || "Unknown Channel"
        : fallbackVideo?.videochanel || "Unknown Channel",
      filepath: video ? video.filepath || "" : fallbackVideo?.filepath || "",
      filesize: video ? video.filesize || "0 MB" : fallbackVideo?.filesize || "0 MB",
      videoUrl,
      downloadedAt: new Date(),
    });

    // Calculate remaining downloads for today (free plan only)
    let remaining = -1; // unlimited for premium
    if (!isPremium) {
      remaining = Math.max(0, 1 - 1); // 1 per day, already used 1
    }

    return res.json({
      message: "Download recorded successfully",
      videoUrl,
      downloadId: log._id,
      remaining,
    });
  } catch (err) {
    console.error("downloadVideo error:", err.message, err.stack);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

// =====================
// HISTORY
// =====================
export const getDownloadHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const userObjectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    const downloads = await DownloadLog.find({ userId: userObjectId }).sort({
      downloadedAt: -1,
    });

    res.json(downloads);
  } catch (err) {
    console.error("getDownloadHistory error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// =====================
// DELETE DOWNLOAD
// =====================
export const deleteDownload = async (req, res) => {
  try {
    const { downloadId } = req.params;

    await DownloadLog.findByIdAndDelete(downloadId);

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// =====================
// STATUS CHECK
// =====================
export const getDownloadStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    const userObjectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    const plan = await UserPlan.findOne({ userId: userObjectId, isActive: true });

    const isPremium =
      plan &&
      ["bronze", "silver", "gold"].includes(plan.planType) &&
      (!plan.expiryDate || plan.expiryDate > new Date());

    if (isPremium) {
      return res.json({
        isPremium: true,
        limit: -1,
        downloadsToday: 0,
      });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const count = await DownloadLog.countDocuments({
      userId: userObjectId,
      downloadedAt: { $gte: todayStart },
    });

    return res.json({
      isPremium: false,
      limit: 1,
      downloadsToday: count,
    });
  } catch (err) {
    console.error("getDownloadStatus error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// =====================
// USER PLAN (simple)
// =====================
export const getUserPlan = async (req, res) => {
  try {
    const { userId } = req.params;

    const userObjectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    const plan = await UserPlan.findOne({ userId: userObjectId, isActive: true });

    if (!plan) {
      return res.json({
        success: true,
        plan: "free",
      });
    }

    return res.json({
      success: true,
      plan: plan.planType,
    });
  } catch (err) {
    console.error("getUserPlan error:", err);
    res.status(500).json({ message: "Server error" });
  }
};