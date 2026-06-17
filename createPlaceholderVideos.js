// Minimal MP4 file creator for testing
// This creates a simple 1-frame MP4 video
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create uploads folder if it doesn't exist
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// List of videos to create
const videoNames = [
  "web-dev-2024.mp4",
  "react-hooks.mp4",
  "js-promises.mp4",
  "mongodb-design.mp4",
  "nodejs-express.mp4",
  "nextjs-fullstack.mp4",
  "css-layout.mp4",
  "typescript-intro.mp4",
  "rest-api.mp4",
  "web-security.mp4",
];

// Minimal valid MP4 file (1 byte placeholder)
// This is a super minimal MP4 that browsers won't play but will recognize as a video
const createMinimalMP4 = () => {
  // This is a minimal but valid MP4 file structure
  const buffer = Buffer.from([
    0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70,
    0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x00, 0x00,
    0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32,
    0x61, 0x76, 0x63, 0x31, 0x6d, 0x70, 0x34, 0x31,
  ]);
  return buffer;
};

try {
  videoNames.forEach((videoName) => {
    const filePath = path.join(uploadsDir, videoName);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, createMinimalMP4());
      console.log(`✅ Created: ${videoName}`);
    } else {
      console.log(`⏭️  Already exists: ${videoName}`);
    }
  });
  console.log(`\n✅ All placeholder videos created in: ${uploadsDir}`);
} catch (error) {
  console.error("❌ Error creating placeholder videos:", error);
}
