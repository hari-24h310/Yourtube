import User from "../Models/Auth.js";
import {
  getUserLocation,
  isSouthIndian,
  getOtpMethod,
} from "../utils/geolocationService.js";
import {
  generateOtp,
  sendEmailOtp,
  sendSmsOtp,
  storeOtp,
  verifyOtp,
  getStoredOtp,
} from "../utils/otp.js";
import { getThemeContext } from "../services/themeService.js";

// Request OTP for login
export const requestOtp = async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;

    // Validate input
    if (!email && !phoneNumber) {
      return res
        .status(400)
        .json({ message: "Email or phone number is required" });
    }

    // Get user's IP address
    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;

    // Get user's location
    const location = await getUserLocation(clientIp);

    // Determine OTP method based on region (South India = email, others = SMS)
    const preferredMethod = getOtpMethod(location.region);

    // Generate OTP
    const otp = generateOtp();

    // Determine identifier (email or phone)
    const identifier = email || phoneNumber;

    // Use region-based preference, but respect user's input channel (email=email, phone=sms)
    // If both provided, use region preference
    let actualMethod = preferredMethod; // Default to region preference
    if (email && !phoneNumber) {
      actualMethod = "email"; // User provided only email, use it
    } else if (phoneNumber && !email) {
      actualMethod = "sms"; // User provided only phone, use it
    }
    // If both or neither provided, use region preference (already set above)

    // Send OTP
    if (actualMethod === "email") {
      await sendEmailOtp(email, otp);
    } else {
      await sendSmsOtp(phoneNumber, otp);
    }

    // Store OTP for verification (DB-backed)
    const ip = clientIp;
    const storeResult = await storeOtp(identifier, otp, actualMethod, ip);
    if (!storeResult || !storeResult.success) {
      return res.status(429).json({ message: storeResult?.message || "Could not store OTP" });
    }

    return res.status(200).json({
      message: `OTP sent to your ${actualMethod === "email" ? "email" : "phone"}. Valid for 10 minutes.`,
      otpMethod: actualMethod,
      identifier: (identifier || "").substring(0, 3) + "***",
      debugOtp: storeResult.debugOtp, // only present in non-production
      location: {
        region: location.region,
        city: location.city,
        country: location.country,
      },
    });
  } catch (error) {
    console.error("Error in requestOtp:", error);
    return res.status(500).json({ message: "Error requesting OTP" });
  }
};

// Verify OTP and login/register user
export const verifyOtpAndLogin = async (req, res) => {
  try {
    const { email, phoneNumber, otp, displayName } = req.body;

    // Validate input
    if (!otp) {
      return res.status(400).json({ message: "OTP is required" });
    }

    if (!email && !phoneNumber) {
      return res
        .status(400)
        .json({ message: "Email or phone number is required" });
    }

    // Verify OTP
    const identifier = email || phoneNumber;
    const otpVerification = await verifyOtp(identifier, otp);

    if (!otpVerification.success) {
      return res.status(400).json({ message: otpVerification.message, verified: false });
    }

    // Get user's IP address and location
    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
    const location = await getUserLocation(clientIp);

    // Find or create user
    let user = await User.findOne({
      $or: [
        { email: email },
        { phoneNumber: phoneNumber },
      ],
    });

    if (!user) {
      // Create new user
      user = new User({
        email: email,
        phoneNumber: phoneNumber,
        displayName: displayName || (email ? email.split("@")[0] : "User"),
        authMethod: "otp",
        lastLoginLocation: {
          region: location.region,
          city: location.city,
          country: location.country,
          latitude: location.latitude,
          longitude: location.longitude,
        },
        lastLoginTime: new Date(),
        theme: getThemeContext(location).theme,
      });
      await user.save();
    } else {
      // Update last login info
      user.lastLoginLocation = {
        region: location.region,
        city: location.city,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
      };
      user.lastLoginTime = new Date();
      user.theme = getThemeContext(location).theme;
      await user.save();
    }

    // Generate session token (simple JWT-like token)
    const sessionToken = Buffer.from(
      JSON.stringify({
        userId: user._id,
        email: user.email,
        timestamp: Date.now(),
      })
    ).toString("base64");

    return res.status(200).json({
      message: "Login successful",
      verified: true,
      user: {
        id: user._id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        displayName: user.displayName,
        theme: user.theme,
      },
      location: {
        region: location.region,
        city: location.city,
        isSouthIndian: isSouthIndian(location.region),
      },
      sessionToken,
    });
  } catch (error) {
    console.error("Error in verifyOtpAndLogin:", error);
    return res.status(500).json({ message: "Error verifying OTP" });
  }
};

// Development-only: return stored OTP for given identifier

// Get user's theme and region info
export const getUserTheme = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get current location and theme
    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
    const location = await getUserLocation(clientIp);

    const themeContext = getThemeContext(location);

    return res.status(200).json({
      ...themeContext,
      lastLoginLocation: user.lastLoginLocation,
    });
  } catch (error) {
    console.error("Error in getUserTheme:", error);
    return res.status(500).json({ message: "Error fetching theme" });
  }
};

// Get theme without authentication (for public access)
export const getPublicTheme = async (req, res) => {
  try {
    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
    console.log("Client IP received:", clientIp);
    const location = await getUserLocation(clientIp);
    console.log("Location object returned:", location);

    const themeContext = getThemeContext(location);

    return res.status(200).json({
      ...themeContext,
      city: location.city,
      region: location.region,
      country: location.country,
      isSouthIndian: isSouthIndian(location.region),
    });
  } catch (error) {
    console.error("Error in getPublicTheme:", error);
    return res.status(500).json({ message: "Error fetching theme" });
  }
};


// Development-only: return stored OTP for given identifier
export const devGetOtp = async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ message: "Not allowed in production" });
    }

    const { identifier } = req.query;
    if (!identifier) {
      return res.status(400).json({ message: "identifier query param required" });
    }

    const data = await getStoredOtp(identifier);
    if (!data) {
      return res.status(404).json({ message: "No OTP stored for identifier" });
    }

    return res.status(200).json({ identifier, method: data.method, expiresAt: data.expiresAt, used: data.used, resendCount: data.resendCount, attempts: data.attempts, note: "Plaintext OTP is not stored; use request-OTP response debugOtp in non-production." });
  } catch (error) {
    console.error("Error in devGetOtp:", error);
    return res.status(500).json({ message: "Error retrieving OTP" });
  }
};

// Development-only: force expire an OTP (for testing)
export const devExpireOtp = async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ message: "Not allowed in production" });
    }

    const { identifier } = req.body;
    if (!identifier) return res.status(400).json({ message: "identifier required" });

    // Update latest OTP for identifier to be expired
    const OtpModel = (await import("../Models/Otp.js")).default;
    const rec = await OtpModel.findOne({ identifier }).sort({ createdAt: -1 });
    if (!rec) return res.status(404).json({ message: "No OTP found for identifier" });
    rec.expiresAt = new Date(Date.now() - 1000); // set to past
    await rec.save();
    return res.status(200).json({ message: "OTP expired for test", identifier });
  } catch (error) {
    console.error("Error in devExpireOtp:", error);
    return res.status(500).json({ message: "Error expiring OTP" });
  }
};

// Dev: expire OTP via query (GET) and return full raw record for debugging
export const devExpireOtpV2 = async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") return res.status(403).json({ message: "Not allowed in production" });
    const { identifier } = req.query;
    if (!identifier) return res.status(400).json({ message: "identifier required" });
    const OtpModel = (await import("../Models/Otp.js")).default;
    const rec = await OtpModel.findOne({ identifier }).sort({ createdAt: -1 });
    if (!rec) return res.status(404).json({ message: "No OTP found for identifier" });
    rec.expiresAt = new Date(Date.now() - 1000);
    await rec.save();
    return res.status(200).json({ message: "OTP expired (v2)", identifier, record: rec });
  } catch (error) {
    console.error("Error in devExpireOtpV2:", error);
    return res.status(500).json({ message: "Error expiring OTP" });
  }
};

// Dev: inspect raw OTP document (non-production only)
export const devInspectOtp = async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") return res.status(403).json({ message: "Not allowed in production" });
    const { identifier } = req.query;
    if (!identifier) return res.status(400).json({ message: "identifier required" });
    const OtpModel = (await import("../Models/Otp.js")).default;
    const rec = await OtpModel.findOne({ identifier }).sort({ createdAt: -1 }).lean();
    if (!rec) return res.status(404).json({ message: "No OTP found for identifier" });
    return res.status(200).json({ record: rec });
  } catch (error) {
    console.error("Error in devInspectOtp:", error);
    return res.status(500).json({ message: "Error inspecting OTP" });
  }
};

// Development-only: verify OTP without touching the database
export const devVerifyOtp = async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ message: "Not allowed in production" });
    }

    const { email, phoneNumber, otp } = req.body;
    const identifier = email || phoneNumber;
    if (!identifier || !otp) {
      return res.status(400).json({ message: "email or phoneNumber and otp required" });
    }

    const verification = await verifyOtp(identifier, otp);
    if (!verification.success) {
      return res.status(400).json({ message: verification.message, verified: false });
    }

    // Return a mock user/session for dev testing
    const mockUser = {
      id: "dev-user-1",
      email: email || null,
      phoneNumber: phoneNumber || null,
      displayName: email ? email.split("@")[0] : "DevUser",
      theme: "light",
    };

    const sessionToken = Buffer.from(JSON.stringify({ userId: mockUser.id, timestamp: Date.now() })).toString("base64");

    return res.status(200).json({ message: "Dev login successful", verified: true, user: mockUser, sessionToken });
  } catch (error) {
    console.error("Error in devVerifyOtp:", error);
    return res.status(500).json({ message: "Error in dev verify" });
  }
};
