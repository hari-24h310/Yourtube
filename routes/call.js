import express from "express";
import { startCall } from "../controllers/call.js";
const router = express.Router();

router.post("/", startCall);

export default router;