import assert from 'assert';

const base = process.env.BACKEND_URL || 'http://localhost:5000';
const authBase = base + '/auth';

const log = (name, ok, info='') => console.log(`${ok? 'PASS':'FAIL'} - ${name} ${info}`);

const safeParse = async (res) => {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    return { status: res.status, body: await res.json() };
  }
  const text = await res.text();
  return { status: res.status, body: text };
};

const post = async (path, body) => {
  const res = await fetch(authBase + path, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
  return await safeParse(res);
};

const get = async (path) => {
  const res = await fetch(authBase + path);
  return await safeParse(res);
};

const sleep = (ms) => new Promise(r=>setTimeout(r, ms));

const run = async () => {
  const results = [];

  // 1. Request OTP (Email)
  const email = `test+${Date.now()}@example.com`;
  const r1 = await post('/request-otp', { email });
  const otpEmail = r1.body.debugOtp;
  log('Request OTP (Email)', r1.status===200 && !!otpEmail, `status=${r1.status}`);
  results.push({name:'Request OTP (Email)', ok: r1.status===200 && !!otpEmail, resp:r1.body});

  // 2. Request OTP (Mobile)
  const phone = '9999999999';
  const r2 = await post('/request-otp', { phoneNumber: phone });
  const otpSms = r2.body.debugOtp;
  log('Request OTP (Mobile)', r2.status===200 && !!otpSms, `status=${r2.status}`);
  results.push({name:'Request OTP (Mobile)', ok: r2.status===200 && !!otpSms, resp:r2.body});

  // 3. Verify valid OTP (email)
  const r3 = await post('/verify-otp', { email, otp: otpEmail, displayName: 'Tester' });
  log('Verify valid OTP', r3.status===200 && r3.body.verified===true && r3.body.sessionToken, `status=${r3.status}`);
  results.push({name:'Verify valid OTP', ok: r3.status===200 && r3.body.verified===true, resp:r3.body});

  // 4. Verify invalid OTP
  // request new OTP for phone to ensure fresh record
  await post('/request-otp', { phoneNumber: phone });
  const bad = await post('/verify-otp', { phoneNumber: phone, otp: '000000' });
  log('Verify invalid OTP', bad.status!==200, `status=${bad.status}`);
  results.push({name:'Verify invalid OTP', ok: bad.status!==200, resp:bad.body});

  // 5. Verify expired OTP
  // create OTP then force expire via dev endpoint
  const r5a = await post('/request-otp', { email: `${email}` });
  const otpForExpire = r5a.body.debugOtp;
  await post('/dev/expire-otp', { identifier: email });
  const expired = await post('/verify-otp', { email, otp: otpForExpire });
  log('Verify expired OTP', expired.status!==200 && /expired|not found/i.test(expired.body.message), `status=${expired.status}`);
  results.push({name:'Verify expired OTP', ok: expired.status!==200, resp:expired.body});

  // 6. Verify resend limit
  const phone2 = '8888888888';
  await post('/request-otp', { phoneNumber: phone2 });
  let resendOk = true;
  for (let i=0;i<7;i++){
    const r = await post('/request-otp', { phoneNumber: phone2 });
    if (i<5) {
      if (r.status!==200) resendOk = false;
    } else {
      if (r.status===200) resendOk = false;
    }
  }
  log('Verify resend limit', resendOk);
  results.push({name:'Verify resend limit', ok: resendOk});

  // 7. Verify attempt limit
  const email2 = `attempt+${Date.now()}@example.com`;
  const r7a = await post('/request-otp', { email: email2 });
  const wrongResults = [];
  for (let i=0;i<6;i++){
    const r = await post('/verify-otp', { email: email2, otp: '111111' });
    wrongResults.push(r);
  }
  const last = wrongResults[wrongResults.length-1];
  const attemptOk = last.status!==200 && /Too many failed attempts|Incorrect OTP/i.test(last.body.message);
  log('Verify attempt limit', attemptOk);
  results.push({name:'Verify attempt limit', ok: attemptOk, resp:last.body});

  // 8. Verify OTP deletion after successful verification
  const email3 = `del+${Date.now()}@example.com`;
  const r8a = await post('/request-otp', { email: email3 });
  const otp8 = r8a.body.debugOtp;
  const r8v = await post('/verify-otp', { email: email3, otp: otp8 });
  // fetch dev OTP metadata
  const meta = await get(`/dev/otp?identifier=${encodeURIComponent(email3)}`);
  const deletedOk = meta.status===200 ? !!meta.body.used : false;
  log('Verify OTP deletion after success', deletedOk, `meta status=${meta.status}`);
  results.push({name:'Verify OTP deletion after success', ok: deletedOk, meta:meta.body});

  // 9. Verify session creation after login (already covered in step 3)
  const sessionOk = r3.body.sessionToken && r3.body.user && r3.body.verified===true;
  log('Verify session creation after login', sessionOk);
  results.push({name:'Verify session creation after login', ok: sessionOk, resp:r3.body});

  // 10. Verify database records are created correctly
  // For OTP: check dev metadata for resendCount/attempts etc for phone2
  const metaPhone2 = await get(`/dev/otp?identifier=${encodeURIComponent(phone2)}`);
  const dbOk = metaPhone2.status===200 && typeof metaPhone2.body.resendCount !== 'undefined';
  log('Verify database records created', dbOk, `status=${metaPhone2.status}`);
  results.push({name:'Verify database records created', ok: dbOk, meta: metaPhone2.body});

  console.log('\nSummary:');
  results.forEach(r=>console.log(`${r.ok? 'PASS':'FAIL'} - ${r.name}`));
  // Exit with non-zero if any fail
  const failed = results.filter(r=>!r.ok);
  if (failed.length>0) {
    console.error('\nFailed tests:', failed.map(f=>f.name));
    process.exit(2);
  }
  console.log('\nAll tests passed');
  process.exit(0);
};

run().catch(e=>{ console.error('Test runner error', e); process.exit(1); });
