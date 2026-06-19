import { createClient } from "redis";
import crypto from "crypto";

const REDIS_URL = process.env.REDIS_URL;

let client;
let connected = false;
let useMemory = !REDIS_URL;

// ---------------- REDIS SETUP ----------------

if (REDIS_URL) {
  try {
    client = createClient({ url: REDIS_URL });

    client.on("error", (err) => {
      console.log("Redis unavailable, switching to memory mode");
      useMemory = true;
    });

  } catch (err) {
    useMemory = true;
  }
}

async function connectRedis() {
  if (useMemory) return;

  if (connected) return;

  try {
    await client.connect();
    connected = true;
  } catch (err) {
    console.log("Redis connection failed, using memory mode");
    useMemory = true;
  }
}


// ---------------- CONFIG ----------------

const OTP_TTL = 300;
const SEND_LIMIT = 3;
const VERIFY_LIMIT = 5;


// ---------------- MEMORY STORAGE ----------------

const memory = new Map();

function getRecord(identifier) {

  if (!memory.has(identifier)) {
    memory.set(identifier, {
      otp: null,
      expiresAt: 0,
      sendCount: 0,
      sendTime: 0,
      verifyCount: 0
    });
  }

  return memory.get(identifier);
}


// ---------------- HELPERS ----------------

const normalize = (id) =>
  String(id).trim().toLowerCase();


const safeEqual = (a, b) => {

  const A = Buffer.from(String(a));
  const B = Buffer.from(String(b));

  if (A.length !== B.length)
    return false;

  return crypto.timingSafeEqual(A, B);
};


function now() {
  return Math.floor(Date.now() / 1000);
}


// ---------------- GENERATE OTP ----------------

export async function generateOTP(identifier) {

  identifier = normalize(identifier);

  await connectRedis();

  const otp =
    Math.floor(100000 + Math.random() * 900000)
      .toString();


  if (useMemory) {

    const record = getRecord(identifier);

    record.otp = otp;
    record.expiresAt = now() + OTP_TTL;
    record.verifyCount = 0;

  } else {

    await client.set(
      `otp:${identifier}`,
      otp,
      { EX: OTP_TTL }
    );

    await client.del(
      `otp:verify:${identifier}`
    );
  }


  console.log("OTP GENERATED:", otp);

  return otp;
}


// ---------------- VERIFY OTP ----------------

export async function verifyOTP(identifier, inputOtp) {

  identifier = normalize(identifier);

  await connectRedis();


  if (useMemory) {

    const record = memory.get(identifier);


    if (
      !record ||
      !record.otp ||
      now() > record.expiresAt
    ) {

      return {
        success:false,
        reason:"OTP expired or not found"
      };

    }


    if(record.verifyCount >= VERIFY_LIMIT){

      return {
        success:false,
        reason:"Too many attempts"
      };

    }


    if(safeEqual(record.otp,inputOtp)){

      record.otp = null;

      return {
        success:true
      };

    }


    record.verifyCount++;


    return {
      success:false,
      reason:`Wrong OTP. ${VERIFY_LIMIT-record.verifyCount} attempts left`
    };

  }



  const stored =
    await client.get(`otp:${identifier}`);


  if(!stored){

    return {
      success:false,
      reason:"OTP expired or not found"
    };

  }


  const attemptKey =
    `otp:verify:${identifier}`;


  const attempts =
    Number(await client.get(attemptKey) || 0);


  if(attempts >= VERIFY_LIMIT){

    await client.del(`otp:${identifier}`);

    return {
      success:false,
      reason:"Too many attempts"
    };

  }


  if(safeEqual(stored,inputOtp)){

    await client.del(`otp:${identifier}`);
    await client.del(attemptKey);

    return {
      success:true
    };

  }


  await client.incr(attemptKey);
  await client.expire(
    attemptKey,
    OTP_TTL
  );


  return {
    success:false,
    reason:`Wrong OTP. ${VERIFY_LIMIT-(attempts+1)} attempts left`
  };

}



// ---------------- RATE LIMIT ----------------

export async function canSendOTP(identifier){

  identifier = normalize(identifier);

  await connectRedis();


  if(useMemory){

    const record = getRecord(identifier);

    const current = now();


    if(
      !record.sendTime ||
      current-record.sendTime >=60
    ){

      record.sendTime=current;
      record.sendCount=1;

      return true;
    }


    record.sendCount++;


    return record.sendCount <= SEND_LIMIT;

  }



  const key =
    `otp:limit:${identifier}`;


  const count =
    await client.incr(key);


  if(count===1){

    await client.expire(
      key,
      60
    );

  }


  return count <= SEND_LIMIT;

}



export default {
  generateOTP,
  verifyOTP,
  canSendOTP
};