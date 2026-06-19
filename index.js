import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import path from "path";
import http from "http";
import { Server as IOServer } from "socket.io";
import dns from "dns";

dns.setDefaultResultOrder("ipv4first");

// Routes
import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import Video from "./Models/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import downloadroutes from "./routes/download.js";
import paymentroutes from "./routes/payment.js";
import emailroutes from "./routes/email.js";
import regionauthroutes from "./routes/regionAuth.js";
import friendroutes from "./routes/friend.js";
import callroutes from "./routes/call.js";
import planroutes from "./routes/plan.js";
import startSubscriptionExpiryJob from "./jobs/subscriptionExpiryJob.js";

dotenv.config();
console.log("ENV CHECK:");
console.log(process.env.EMAIL_USER);
console.log(process.env.EMAIL_PASSWORD ? "LOADED" : "NOT LOADED");

const app = express();

// Middleware
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://192.168.1.4:3001",
    "http://192.168.1.4:3002",
    "https://your-frontend.vercel.app",  // ✅ உங்க Vercel URL போடுங்க
  ],
  credentials: true,
}));
// Use body-parser JSON with verify hook to retain raw body buffer for webhook signature verification
app.use(
  bodyParser.json({
    limit: "30mb",
    verify: function (req, res, buf) {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: "30mb" }));


app.use("/auth", userroutes);
// Static
app.use("/uploads", express.static(path.join("uploads")));
app.use("/video", express.static(path.join("..", "yourtube", "public", "video")));

// Test route
app.get("/", (req, res) => {
  res.send("Backend running");
});

// Theme helper endpoint
app.get("/api/user/theme", (req, res) => {
  try {
    const hour = new Date().getHours();
    // autoTheme enabled between 10:00 and 22:00 (local server time)
    const autoTheme = hour >= 10 && hour < 22;
    return res.json({ autoTheme });
  } catch (e) {
    return res.status(500).json({ autoTheme: false });
  }
});

// Videos list endpoint
app.get('/api/videos', async (req, res) => {
  try {
    const videos = await Video.find();
    res.json({ success: true, videos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Routes
app.use("/user", userroutes);
app.use("/video", videoroutes);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/comment", commentroutes);
app.use("/download", downloadroutes);
app.use("/payment", paymentroutes);
app.use("/email", emailroutes);
app.use("/auth", regionauthroutes);
app.use("/friend", friendroutes);
app.use("/call", callroutes);
app.use("/plan", planroutes);

const PORT = process.env.PORT || 5000;

// HTTP server
const httpServer = http.createServer(app);

// SOCKET.IO
const io = new IOServer(httpServer, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "https://your-frontend.vercel.app",  
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const roomMembers = new Map();

const cleanupRoom = (roomId, socketId) => {
  const members = roomMembers.get(roomId);
  if (!members) return;
  members.delete(socketId);
  if (members.size === 0) {
    roomMembers.delete(roomId);
  }
};

// ================================
// 🔥 VIDEO CALL (WEBRTC SIGNALING)
// ================================
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
  let joinedRoom = null;

  socket.on("join-room", ({ roomId, userId, username }) => {
    if (!roomId) return;
    joinedRoom = roomId;
    socket.join(roomId);

    if (!roomMembers.has(roomId)) {
      roomMembers.set(roomId, new Map());
    }
    roomMembers.get(roomId).set(socket.id, { userId, username });

    const existingParticipants = Array.from(roomMembers.get(roomId)?.entries() || [])
      .filter(([socketId]) => socketId !== socket.id)
      .map(([socketId, meta]) => ({ socketId, ...meta }));

    socket.emit("existing-participants", existingParticipants);
    socket.to(roomId).emit("user-joined", {
      socketId: socket.id,
      userId,
      username,
    });
  });

  socket.on("signal", ({ recipientSocketId, signal }) => {
    if (!recipientSocketId || !signal) return;
    socket.to(recipientSocketId).emit("signal", {
      from: socket.id,
      signal,
    });
  });

  socket.on("offer", ({ to, offer }) => {
    if (!to) return;
    socket.to(to).emit("offer", {
      from: socket.id,
      offer,
    });
  });

  socket.on("answer", ({ to, answer }) => {
    if (!to) return;
    socket.to(to).emit("answer", {
      from: socket.id,
      answer,
    });
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    if (!to || !candidate) return;
    socket.to(to).emit("ice-candidate", {
      from: socket.id,
      candidate,
    });
  });

  socket.on("screen-share-start", ({ roomId }) => {
    if (roomId) socket.to(roomId).emit("screen-share-start", { socketId: socket.id });
  });

  socket.on("screen-share-stop", ({ roomId }) => {
    if (roomId) socket.to(roomId).emit("screen-share-stop", { socketId: socket.id });
  });

  socket.on("leave-room", ({ roomId }) => {
    if (!roomId) return;
    cleanupRoom(roomId, socket.id);
    socket.leave(roomId);
    socket.to(roomId).emit("user-left", { socketId: socket.id });
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
    if (joinedRoom) {
      cleanupRoom(joinedRoom, socket.id);
      socket.to(joinedRoom).emit("user-left", { socketId: socket.id });
    }
  });
});

// START SERVER
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// MongoDB
const connectWithFallback = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGO_URL;

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("✅ MongoDB connected");
  } catch (err) {
    console.log("❌ DB error:", err.message);

    // Fallback to in-memory MongoDB
    try {
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      const mongod = await MongoMemoryServer.create();
      await mongoose.connect(mongod.getUri());

      console.log("✅ In-memory MongoDB connected");
    } catch (e) {
      console.log("❌ DB fallback failed:", e.message);
    }
  }
};

connectWithFallback();

// Start subscription expiry background job (runs every hour)
try {
  startSubscriptionExpiryJob();
  console.log("Subscription expiry job started");
} catch (e) {
  console.error("Failed to start subscription expiry job:", e);
}
