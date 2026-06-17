import express from "express";
import { 
  verifyFirebasePhone, 
  verifyClerkEmail, 
  updateUserCity 
} from "../controllers/otpAuthController.js";

const router = express.Router();

// =====================================================
// FIREBASE PHONE OTP ROUTES
// =====================================================

/**
 * POST /auth/firebase-phone-verify
 * Frontend sends: { phone, uid, displayName }
 * Backend creates/logins user, issues JWT
 */
router.post("/firebase-phone-verify", verifyFirebasePhone);

// =====================================================
// CLERK EMAIL OTP ROUTES
// =====================================================

/**
 * POST /auth/clerk-email-verify
 * Frontend sends: { email, clerkId, displayName }
 * Backend creates/logins user, issues JWT
 */
router.post("/clerk-email-verify", verifyClerkEmail);

// =====================================================
// UPDATE USER CITY
// =====================================================

/**
 * POST /auth/update-city
 * Frontend sends: { userId, city }
 * Updates user's city after login
 */
router.post("/update-city", updateUserCity);

export default router;
