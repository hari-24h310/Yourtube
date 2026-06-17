import express from "express";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  getPendingRequests,
  saveCallHistory,
  getCallHistory,
  blockUser,
  unblockUser,
  searchUser,
} from "../controllers/friendController.js";

const router = express.Router();

// Friend request endpoints
router.post("/send-request", sendFriendRequest);
router.post("/accept-request", acceptFriendRequest);
router.post("/reject-request", rejectFriendRequest);

// Friends list
router.get("/list/:userId", getFriends);
router.get("/pending/:userId", getPendingRequests);

// Search users
router.get("/search", searchUser);

// Call history
router.post("/call-history", saveCallHistory);
router.get("/call-history/:userId", getCallHistory);

// Send invite email
// Note: server-side invite endpoints removed to keep backend focused on VoIP features

// Block/Unblock
router.post("/block", blockUser);
router.post("/unblock", unblockUser);

export default router;
