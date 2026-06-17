const base = process.env.BACKEND_URL || 'http://localhost:5000';
const authBase = base + '/auth';
const post = async (path, body) => {
  const res = await fetch(authBase + path, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
  const ct = res.headers.get('content-type')||'';
  const bodyParsed = ct.includes('application/json') ? await res.json() : await res.text();
  return { status: res.status, body: bodyParsed };
};
const get = async (path) => {
  const res = await fetch(authBase + path);
  const ct = res.headers.get('content-type')||'';
  const bodyParsed = ct.includes('application/json') ? await res.json() : await res.text();
  return { status: res.status, body: bodyParsed };
};

const run = async () => {
  const email = `debug_expire_${Date.now()}@example.com`;
  console.log('email:', email);
  const r1 = await post('/request-otp', { email });
  console.log('request-otp:', r1);
  const otp = r1.body.debugOtp;
  const meta1 = await get(`/dev/otp?identifier=${encodeURIComponent(email)}`);
  console.log('dev/otp before expire:', meta1);
  const exp = await post('/dev/expire-otp', { identifier: email });
  console.log('dev/expire-otp:', exp);
  const meta2 = await get(`/dev/otp?identifier=${encodeURIComponent(email)}`);
  console.log('dev/otp after expire:', meta2);
  const verify = await post('/verify-otp', { email, otp });
  console.log('verify result:', verify);
};

run().catch(e=>{console.error('debug error', e)});
