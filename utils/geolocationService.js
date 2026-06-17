import axios from "axios";

// South Indian states
const SOUTH_INDIAN_STATES = [
  "Tamil Nadu",
  "Kerala",
  "Karnataka",
  "Andhra Pradesh",
  "Telangana",
];

// Get user's location from IP address
export const getUserLocation = async (ipAddress) => {
  try {
    // Remove brackets from IPv6 if present
    let cleanIp = ipAddress.replace("[", "").replace("]", "");

    // Handle localhost IPs
    if (cleanIp === "::1" || cleanIp === "127.0.0.1" || cleanIp === "localhost") {
      console.log("Detected localhost IP, returning default location.");
      return {
        ip: ipAddress,
        city: "Chennai",
        region: "Tamil Nadu",
        country: "India",
        latitude: 13.0827,
        longitude: 80.2707,
      };
    }

    // Try ipapi.co first (free, no key required)
    const response = await axios.get(`https://ipapi.co/${cleanIp}/json/`, {
      timeout: 5000,
    });

    return {
      ip: response.data.ip || ipAddress,
      city: response.data.city || "Unknown",
      region: response.data.region || "Unknown",
      country: response.data.country_name || "Unknown",
      latitude: response.data.latitude || null,
      longitude: response.data.longitude || null,
    };
  } catch (error) {
    console.log("Geolocation error (non-critical):", error.message);
    // Return default location
    return {
      ip: ipAddress,
      city: "Unknown",
      region: "Unknown",
      country: "Unknown",
      latitude: null,
      longitude: null,
    };
  }
};

// Check if location is in South India
export const isSouthIndian = (region) => {
  if (!region) return false;
  return SOUTH_INDIAN_STATES.some(
    (state) => region.toLowerCase().includes(state.toLowerCase())
  );
};

// Get theme based on time and location
export const getThemeByTimeAndLocation = (region) => {
  // Get current UTC time
  const now = new Date();
  
  // Calculate IST time (UTC+5:30)
  const istOffsetMs = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
  const istTime = new Date(now.getTime() + istOffsetMs - (now.getTimezoneOffset() * 60 * 1000));
  const hours = istTime.getHours();

  // Check if it's between 10 AM and 12 PM IST
  const isMorning = hours >= 10 && hours < 12;

  // Check if user is in South India
  const isSouthIndia = isSouthIndian(region);

  // White theme: 10 AM - 12 PM IST AND South India
  // Dark theme: Otherwise
  if (isMorning && isSouthIndia) {
    return "light";
  } else {
    return "dark";
  }
};

// Determine OTP method based on region
export const getOtpMethod = (region) => {
  // Email OTP for South India
  // SMS OTP for other regions
  return isSouthIndian(region) ? "email" : "sms";
};
