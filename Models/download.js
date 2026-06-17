import express from "express";
import { downloadVideo, getDownloadHistory, getDownloadStatus } from "../controllers/download.js";

const router = express.Router();

router.post("/video", downloadVideo);
router.get("/history/:userId", getDownloadHistory);
router.get("/status/:userId", getDownloadStatus);

export default router;

// Add to server/index.js:
// import downloadRoutes from './routes/download.js';
// app.use('/download', downloadRoutes);
