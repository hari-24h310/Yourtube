import User from "../Models/Auth.js";
import jwt from "jsonwebtoken";

// =====================================================
// FIREBASE PHONE OTP - Backend Handler
// =====================================================

/**
 * POST /auth/firebase-phone-verify
 * Receive phone verification from Firebase frontend
 * Create/Login user in MongoDB
 * Issue JWT token
 */
export const verifyFirebasePhone = async (req, res) => {
  try {
    const { phone, uid, displayName = null } = req.body;

    if (!phone || !uid) {
      return res.status(400).json({
        success: false,
        message: "Phone and UID required",
      });
    }

    // Check if user exists
    let user = await User.findOne({ phone });

    if (!user) {
      // Create new user
      user = new User({
        phone,
        firebaseUid: uid,
        displayName: displayName || "User",
        email: null,
        authMethod: "firebase_phone",
        isPhoneVerified: true,
        city: "Unknown", // Will be updated by client-side geolocation
      });

      await user.save();
      console.log("✅ New user created via Firebase Phone OTP:", phone);
    } else {
      // Update existing user with Firebase UID if not set
      if (!user.firebaseUid) {
        user.firebaseUid = uid;
        user.isPhoneVerified = true;
        await user.save();
      }
      console.log("✅ User logged in via Firebase Phone OTP:", phone);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, phone: user.phone, authMethod: "firebase_phone" },
      process.env.JWT_SECRET || "your_secret_key",
      { expiresIn: "30d" }
    );

    res.status(200).json({
      success: true,
      message: "Phone verified successfully",
      token,
      user: {
        _id: user._id,
        phone: user.phone,
        displayName: user.displayName,
        email: user.email,
        authMethod: "firebase_phone",
      },
    });
  } catch (error) {
    console.error("Firebase Phone Verification Error:", error);
    res.status(500).json({
      success: false,
      message: "Phone verification failed",
      error: error.message,
    });
  }
};

// =====================================================
// CLERK EMAIL OTP - Backend Handler
// =====================================================

/**
 * POST /auth/clerk-email-verify
 * Receive email verification from Clerk frontend
 * Create/Login user in MongoDB
 * Issue JWT token
 */
export const verifyClerkEmail = async (req, res) => {
  try {
    const { email, clerkId, displayName = null } = req.body;

    if (!email || !clerkId) {
      return res.status(400).json({
        success: false,
        message: "Email and Clerk ID required",
      });
    }

    // Check if user exists by email
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user
      user = new User({
        email,
        clerkId,
        displayName: displayName || "User",
        phone: null,
        authMethod: "clerk_email",
        isEmailVerified: true,
        city: "Unknown", // Will be updated by client-side geolocation
      });

      await user.save();
      console.log("✅ New user created via Clerk Email OTP:", email);
    } else {
      // Update existing user with Clerk ID if not set
      if (!user.clerkId) {
        user.clerkId = clerkId;
        user.isEmailVerified = true;
        await user.save();
      }
      console.log("✅ User logged in via Clerk Email OTP:", email);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, authMethod: "clerk_email" },
      process.env.JWT_SECRET || "your_secret_key",
      { expiresIn: "30d" }
    );

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
      token,
      user: {
        _id: user._id,
        email: user.email,
        displayName: user.displayName,
        phone: user.phone,
        authMethod: "clerk_email",
      },
    });
  } catch (error) {
    console.error("Clerk Email Verification Error:", error);
    res.status(500).json({
      success: false,
      message: "Email verification failed",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE USER CITY (Called after login)
// =====================================================

/**
 * POST /auth/update-city
 * Update user's city after login (using geolocation)
 */
export const updateUserCity = async (req, res) => {
  try {
    const { userId, city } = req.body;

    if (!userId || !city) {
      return res.status(400).json({
        success: false,
        message: "User ID and city required",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { city },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "City updated",
      user,
    });
  } catch (error) {
    console.error("Update City Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update city",
      error: error.message,
    });
  }
};
