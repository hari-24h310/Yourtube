import dotenv from "dotenv";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { pathToFileURL } from 'url';
import { MongoMemoryServer } from 'mongodb-memory-server';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

let mongoUri = process.env.MONGO_URI || process.env.MONGO_URL;
let memoryServer;
try {
  if (!mongoUri) throw new Error('No MONGO_URI');
  await mongoose.connect(mongoUri, { dbName: process.env.MONGO_DBNAME });
  console.log('Connected to MongoDB for migrations');
} catch (err) {
  console.warn('Could not connect to provided MongoDB URI, starting in-memory MongoDB for migrations. Reason:', err.message);
  memoryServer = await MongoMemoryServer.create({ instance: { dbName: process.env.MONGO_DBNAME || 'test' } });
  mongoUri = memoryServer.getUri();
  await mongoose.connect(mongoUri);
  console.log('Connected to in-memory MongoDB for migrations');
}

const migrationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  runAt: { type: Date, default: () => new Date() },
});
const Migration = mongoose.model('Migration', migrationSchema, 'migrations');

const migrationsDir = path.resolve(process.cwd(), 'migrations');
if (!fs.existsSync(migrationsDir)) {
  console.error('Migrations directory not found:', migrationsDir);
  process.exit(1);
}

const files = fs.readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.mjs') || f.endsWith('.js'))
  .sort();

for (const file of files) {
  const name = file;
  const already = await Migration.findOne({ name });
  if (already) {
    console.log('Skipping already applied migration:', name);
    continue;
  }

  console.log('Applying migration:', name);
  const modPath = path.join(migrationsDir, file);
  try {
    const migration = await import(pathToFileURL(modPath).href);
    if (migration && typeof migration.up === 'function') {
      await migration.up({ mongoose });
      await Migration.create({ name });
      console.log('Migration applied:', name);
    } else {
      console.warn('Migration', name, 'does not export an `up` function — skipping');
    }
  } catch (err) {
    console.error('Failed to apply migration', name, err);
    console.error('Stopping further migrations');
    process.exit(1);
  }
}

console.log('All migrations applied');
await mongoose.disconnect();
process.exit(0);
