import { createClient } from "redis";
import crypto from "crypto";

const REDIS_URL = process.env.REDIS_URL;

let client;
let useMemory = !REDIS_URL; // Default to memory mode unless REDIS_URL is explicitly set
let connected = false;
let errorLogged = false;

// Only attempt Redis connection if REDIS_URL is explicitly configured
if (REDIS_URL) {
  try {
    client = createClient({ url: REDIS_URL });
    client.on("error", (err) => {
      if (!errorLogged) {
        console.log("Redis unavailable, using in-memory OTP storage");
        errorLogged = true;
      }
      if (err && err.code === "ECONNREFUSED") {
        useMemory = true;
      }
    });
  } catch (e) {
    console.log("Redis not available, using in-memory OTP storage");
    useMemory = true;
  }
}

async function ensureConnected() {
  if (useMemory) return;
  if (connected) return;
  try {
    await client.connect();
    connected = true;
  } catch (e) {
    useMemory = true;
  }
}

const OTP_TTL = 300; // 5 minutes
const SEND_LIMIT = 3; // per minute
const VERIFY_LIMIT = 5; // attempts per OTP
const FAILED_LOGIN_LOCK = 10; // lock after 10 failed logins

// In-memory fallback structures
const memory = new Map();
// memory key -> { otp, expiresAt, sendCount, sendWindowStart, verifyCount, failedLoginCount, lockedUntil }

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function ensureMemoryRecord(id) {
  if (!memory.has(id)) {
    memory.set(id, {
      otp: null,
      expiresAt: 0,
      sendCount: 0,
      sendWindowStart: 0,
      verifyCount: 0,
      failedLoginCount: 0,
      lockedUntil: 0,
    });
  }
  return memory.get(id);
}

export async function generateOTP(identifier) {
  if (!identifier) throw new Error("identifier required");
  if (!useMemory) await ensureConnected();
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  if (useMemory) {
    const rec = ensureMemoryRecord(identifier);
    rec.otp = otp;
    rec.expiresAt = nowSec() + OTP_TTL;
    rec.verifyCount = 0;
    return otp;
  }

  const key = `otp:${identifier}`;
  await client.set(key, otp, { EX: OTP_TTL });
  await client.del(`otp_verify_count:${identifier}`);
  return otp;
}

export async function verifyOTP(identifier, inputOtp) {
  if (!identifier) return { success: false, reason: "identifier required" };
  if (!useMemory) await ensureConnected();

  if (useMemory) {
    const rec = memory.get(identifier);
    if (!rec || !rec.otp) return { success: false, reason: "OTP not found or expired" };
    if (nowSec() > rec.expiresAt) {
      rec.otp = null;
      return { success: false, reason: "OTP not found or expired" };
    }
    if ((rec.verifyCount || 0) >= VERIFY_LIMIT) {
      rec.otp = null;
      return { success: false, reason: "Too many verification attempts" };
    }
    if (crypto.timingSafeEqual(Buffer.from(rec.otp), Buffer.from(inputOtp))) {
      rec.otp = null;
      rec.verifyCount = 0;
      return { success: true };
    }
    rec.verifyCount = (rec.verifyCount || 0) + 1;
    const remaining = VERIFY_LIMIT - rec.verifyCount;
    return { success: false, reason: `Incorrect OTP. ${remaining} attempts remaining.` };
  }

  const key = `otp:${identifier}`;
  const stored = await client.get(key);
  if (!stored) return { success: false, reason: "OTP not found or expired" };
  const attemptsKey = `otp_verify_count:${identifier}`;
  const attempts = Number(await client.get(attemptsKey) || 0);
  if (attempts >= VERIFY_LIMIT) {
    await client.del(key);
    await client.del(attemptsKey);
    return { success: false, reason: "Too many verification attempts" };
  }
  if (crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(inputOtp))) {
    await client.del(key);
    await client.del(attemptsKey);
    return { success: true };
  }
  await client.incr(attemptsKey);
  await client.expire(attemptsKey, OTP_TTL);
  const remaining = VERIFY_LIMIT - (attempts + 1);
  return { success: false, reason: `Incorrect OTP. ${remaining} attempts remaining.` };
}

export async function canSendOTP(identifier) {
  if (!identifier) return false;
  if (!useMemory) await ensureConnected();

  if (useMemory) {
    const rec = ensureMemoryRecord(identifier);
    const now = nowSec();
    if (!rec.sendWindowStart || now - rec.sendWindowStart >= 60) {
      rec.sendWindowStart = now;
      rec.sendCount = 1;
      return true;
    }
    rec.sendCount = (rec.sendCount || 0) + 1;
    return rec.sendCount <= SEND_LIMIT;
  }

  const key = `otp_send_count:${identifier}`;
  const count = await client.incr(key);
  if (count === 1) await client.expire(key, 60);
  return count <= SEND_LIMIT;
}

export async function canVerifyOTP(identifier) {
  if (!identifier) return false;
  if (!useMemory) await ensureConnected();
  if (useMemory) {
    const rec = memory.get(identifier);
    const count = rec ? rec.verifyCount || 0 : 0;
    return count < VERIFY_LIMIT;
  }
  const key = `otp_verify_count:${identifier}`;
  const count = Number(await client.get(key) || 0);
  return count < VERIFY_LIMIT;
}

export async function recordFailedLogin(identifier) {
  if (!identifier) return 0;
  if (!useMemory) await ensureConnected();
  if (useMemory) {
    const rec = ensureMemoryRecord(identifier);
    rec.failedLoginCount = (rec.failedLoginCount || 0) + 1;
    if (rec.failedLoginCount >= FAILED_LOGIN_LOCK) {
      rec.lockedUntil = nowSec() + 3600; // 1 hour
    }
    return rec.failedLoginCount;
  }
  const key = `failed_login:${identifier}`;
  const val = await client.incr(key);
  if (val === 1) await client.expire(key, 24 * 60 * 60);
  if (val >= FAILED_LOGIN_LOCK) {
    await client.set(`account_locked:${identifier}`, "1", { EX: 60 * 60 });
  }
  return val;
}

export async function isAccountLocked(identifier) {
  if (!identifier) return false;
  if (!useMemory) await ensureConnected();
  if (useMemory) {
    const rec = memory.get(identifier);
    if (!rec || !rec.lockedUntil) return false;
    return nowSec() < rec.lockedUntil;
  }
  const key = `account_locked:${identifier}`;
  const val = await client.get(key);
  return !!val;
}

export async function resetFailedLogin(identifier) {
  if (!identifier) return;
  if (!useMemory) await ensureConnected();
  if (useMemory) {
    memory.delete(identifier);
    return;
  }
  await client.del(`failed_login:${identifier}`);
  await client.del(`account_locked:${identifier}`);
}

export default {
  generateOTP,
  verifyOTP,
  canSendOTP,
  canVerifyOTP,
  recordFailedLogin,
  isAccountLocked,
  resetFailedLogin,
};
