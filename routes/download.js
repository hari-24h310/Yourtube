import express from "express";
import {
  downloadVideo,
  getDownloadHistory,
  getDownloadStatus,
  deleteDownload,
  getUserPlan,
} from "../controllers/download.js";

const router = express.Router();

// download video
router.post("/video", downloadVideo);

// history
router.get("/history/:userId", getDownloadHistory);

// status (free/premium + limit)
router.get("/status/:userId", getDownloadStatus);

// delete
router.delete("/:downloadId", deleteDownload);

// plan
router.get("/plan/:userId", getUserPlan);

export default router;