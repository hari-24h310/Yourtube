import { getThemeByTimeAndLocation, isSouthIndian } from "../utils/geolocationService.js";

export const getThemeContext = (location = {}) => {
  const region = location.region || "Unknown";
  const theme = getThemeByTimeAndLocation(region);

  return {
    theme,
    region,
    city: location.city || "Unknown",
    country: location.country || "Unknown",
    isSouthIndian: isSouthIndian(region),
  };
};

export const getThemeRules = () => ({
  southIndiaStates: ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana"],
  lightThemeWindow: "10:00 AM - 12:00 PM IST",
  southIndiaOtpMethod: "email",
  otherStatesOtpMethod: "sms",
});
