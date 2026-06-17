import express from "express";
import { getPlan, upgradePlan } from "../controllers/plan.js";

const router = express.Router();

// Get current plan
router.get("/:userId", getPlan);

// Upgrade plan after payment success
router.post("/upgrade", upgradePlan);

export default router;