import mongoose from "mongoose";
const userschema = mongoose.Schema({
  email: { type: String, sparse: true },
  firebaseUid: { type: String, sparse: true, index: true },
  phoneNumber: { type: String, sparse: true },
  name: { type: String },
  displayName: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  city: { type: String, default: "Unknown" },
  authMethod: { type: String, default: "email", enum: ["email", "otp", "password", "google"] },
  theme: { type: String, default: "dark", enum: ["light", "dark"] },
  lastLoginLocation: {
    region: { type: String },
    city: { type: String },
    country: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
  },
  lastLoginTime: { type: Date },
  joinedon: { type: Date, default: Date.now },
});

export default mongoose.model("user", userschema);
