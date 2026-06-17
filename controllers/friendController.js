import Friend from "../Models/Friend.js";
import User from "../Models/Auth.js";
import CallHistory from "../Models/CallHistory.js";
// Invite/email helpers removed to keep backend focused on VoIP features

// Send friend request
export const sendFriendRequest = async (req, res) => {
  try {
    const { userId, friendId } = req.body;

    // Validate
    if (!userId || !friendId) {
      return res
        .status(400)
        .json({ message: "userId and friendId are required" });
    }

    if (userId === friendId) {
      return res
        .status(400)
        .json({ message: "Cannot send friend request to yourself" });
    }

    // Check if user exists
    const user = await User.findById(userId);
    const friend = await User.findById(friendId);

    if (!user || !friend) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if already friends or request exists
    const existingRequest = await Friend.findOne({
      $or: [
        { userId, friendId },
        { userId: friendId, friendId: userId },
      ],
    });

    if (existingRequest) {
      return res
        .status(400)
        .json({
          message: "Friend request already exists or users are already friends",
        });
    }

    // Create friend request
    const friendRequest = new Friend({
      userId,
      friendId,
      status: "pending",
    });

    await friendRequest.save();

    return res.status(201).json({
      message: "Friend request sent successfully",
      friendRequest,
    });
  } catch (error) {
    console.error("Error in sendFriendRequest:", error);
    return res.status(500).json({ message: "Error sending friend request" });
  }
};

// Accept friend request
export const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ message: "requestId is required" });
    }

    const friendRequest = await Friend.findById(requestId);

    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    // Update status
    friendRequest.status = "accepted";
    friendRequest.acceptedAt = new Date();
    await friendRequest.save();

    // Also create reverse relationship
    const reverseRequest = new Friend({
      userId: friendRequest.friendId,
      friendId: friendRequest.userId,
      status: "accepted",
      acceptedAt: new Date(),
    });
    await reverseRequest.save();

    return res.status(200).json({
      message: "Friend request accepted",
      friendRequest,
    });
  } catch (error) {
    console.error("Error in acceptFriendRequest:", error);
    return res.status(500).json({ message: "Error accepting friend request" });
  }
};

// Reject friend request
export const rejectFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ message: "requestId is required" });
    }

    await Friend.findByIdAndDelete(requestId);

    return res.status(200).json({ message: "Friend request rejected" });
  } catch (error) {
    console.error("Error in rejectFriendRequest:", error);
    return res.status(500).json({ message: "Error rejecting friend request" });
  }
};

// Get friends list
export const getFriends = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const friends = await Friend.find({
      userId,
      status: "accepted",
    }).populate("friendId", "email displayName name image");

    return res.status(200).json({
      message: "Friends retrieved successfully",
      friends: friends.map((f) => ({
        id: f._id,
        friendId: f.friendId._id,
        email: f.friendId.email,
        displayName: f.friendId.displayName || f.friendId.name,
        image: f.friendId.image,
        acceptedAt: f.acceptedAt,
      })),
    });
  } catch (error) {
    console.error("Error in getFriends:", error);
    return res.status(500).json({ message: "Error retrieving friends" });
  }
};

// Get pending friend requests
export const getPendingRequests = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const requests = await Friend.find({
      friendId: userId,
      status: "pending",
    }).populate("userId", "email displayName name image");

    return res.status(200).json({
      message: "Pending requests retrieved successfully",
      requests: requests.map((r) => ({
        id: r._id,
        senderId: r.userId._id,
        email: r.userId.email,
        displayName: r.userId.displayName || r.userId.name,
        image: r.userId.image,
        requestedAt: r.requestedAt,
      })),
    });
  } catch (error) {
    console.error("Error in getPendingRequests:", error);
    return res.status(500).json({ message: "Error retrieving requests" });
  }
};

// Save call history
export const saveCallHistory = async (req, res) => {
  try {
    const {
      callerId,
      receiverId,
      callType,
      duration,
      status,
      recordingUrl,
      recordingSize,
      notes,
    } = req.body;

    if (!callerId || !receiverId) {
      return res
        .status(400)
        .json({ message: "callerId and receiverId are required" });
    }

    const callHistory = new CallHistory({
      callerId,
      receiverId,
      callType: callType || "video",
      duration: duration || 0,
      status: status || "completed",
      recordingUrl,
      recordingSize,
      notes,
      endedAt: new Date(),
    });

    await callHistory.save();

    return res.status(201).json({
      message: "Call history saved",
      callHistory,
    });
  } catch (error) {
    console.error("Error in saveCallHistory:", error);
    return res.status(500).json({ message: "Error saving call history" });
  }
};

// Get call history
export const getCallHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const history = await CallHistory.find({
      $or: [{ callerId: userId }, { receiverId: userId }],
    })
      .populate("callerId", "email displayName name image")
      .populate("receiverId", "email displayName name image")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await CallHistory.countDocuments({
      $or: [{ callerId: userId }, { receiverId: userId }],
    });

    return res.status(200).json({
      message: "Call history retrieved successfully",
      history,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip),
    });
  } catch (error) {
    console.error("Error in getCallHistory:", error);
    return res.status(500).json({ message: "Error retrieving call history" });
  }
};

// Block user
export const blockUser = async (req, res) => {
  try {
    const { userId, blockUserId } = req.body;

    if (!userId || !blockUserId) {
      return res
        .status(400)
        .json({ message: "userId and blockUserId are required" });
    }

    // Remove any existing friendship
    await Friend.deleteMany({
      $or: [
        { userId, friendId: blockUserId },
        { userId: blockUserId, friendId: userId },
      ],
    });

    // Create block relationship
    const blockRelationship = new Friend({
      userId,
      friendId: blockUserId,
      status: "blocked",
    });

    await blockRelationship.save();

    return res.status(200).json({
      message: "User blocked successfully",
      blockRelationship,
    });
  } catch (error) {
    console.error("Error in blockUser:", error);
    return res.status(500).json({ message: "Error blocking user" });
  }
};

// Unblock user
export const unblockUser = async (req, res) => {
  try {
    const { userId, unblockUserId } = req.body;

    if (!userId || !unblockUserId) {
      return res
        .status(400)
        .json({ message: "userId and unblockUserId are required" });
    }

    await Friend.findOneAndDelete({
      userId,
      friendId: unblockUserId,
      status: "blocked",
    });

    return res.status(200).json({ message: "User unblocked successfully" });
  } catch (error) {
    console.error("Error in unblockUser:", error);
    return res.status(500).json({ message: "Error unblocking user" });
  }
};

// Send invite email to a friend for joining a call
// Invite endpoints removed per request to keep only VoIP core features

// Search user by email or displayName
export const searchUser = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ message: "Search query is required" });
    }

    // Search by email or displayName
    const users = await User.find({
      $or: [
        { email: { $regex: query, $options: "i" } },
        { displayName: { $regex: query, $options: "i" } },
      ],
    }).select("_id email displayName");

    return res.status(200).json({
      message: "Users found",
      users: users.slice(0, 10), // Limit to 10 results
    });
  } catch (error) {
    console.error("Error in searchUser:", error);
    return res.status(500).json({ message: "Error searching users" });
  }
};
