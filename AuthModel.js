import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    // ================== BASIC INFO ==================
    displayName: {
      type: String,
      default: "User",
    },
    email: {
      type: String,
      default: null,
      unique: true,
      sparse: true, // Allows multiple null values
    },
    phone: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
    },
    profileImg: {
      type: String,
      default: null,
    },

    // ================== AUTHENTICATION METHODS ==================
    authMethod: {
      type: String,
      enum: ["firebase_phone", "clerk_email", "password"],
      default: "password",
    },
    firebaseUid: {
      type: String,
      default: null,
      sparse: true,
    },
    clerkId: {
      type: String,
      default: null,
      sparse: true,
    },

    // ================== VERIFICATION STATUS ==================
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },

    // ================== LOCATION ==================
    city: {
      type: String,
      default: "Unknown",
    },

    // ================== WATCH & LIKE HISTORY ==================
    watchHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "video",
      },
    ],
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "video",
      },
    ],
    watchLater: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "video",
      },
    ],

    // ================== SUBSCRIPTIONS ==================
    subscribers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    subscribedChannels: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // ================== TIMESTAMPS ==================
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Update lastLogin before saving
UserSchema.pre("findByIdAndUpdate", function (next) {
  this.set({ lastLogin: Date.now() });
  next();
});

const User = mongoose.model("User", UserSchema);

export default User;
