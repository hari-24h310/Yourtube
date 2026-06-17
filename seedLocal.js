import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const runSeed = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGO_URL;
    if (mongoUri) {
      await mongoose.connect(mongoUri);
      console.log("Connected to MongoDB at", mongoUri);
    } else {
      // Fallback to in-memory MongoDB for local seeding
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      const mongod = await MongoMemoryServer.create();
      await mongoose.connect(mongod.getUri());
      console.log("Connected to in-memory MongoDB for seeding");
    }

    const videoModel = (await import("./Models/video.js")).default;
    const { sampleVideos } = await import("./seed.js");

    const count = await videoModel.countDocuments();
    if (count > 0) {
      console.log(`Database already has ${count} videos — skipping seed.`);
      await mongoose.connection.close();
      return;
    }

    const res = await videoModel.insertMany(sampleVideos);
    console.log(`Inserted ${res.length} sample videos.`);
    await mongoose.connection.close();
  } catch (err) {
    console.error("Seeding failed:", err.message || err);
    process.exitCode = 1;
  }
};

// Run seeder when executed directly
runSeed();

export default runSeed;
