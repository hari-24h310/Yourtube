# Quick Setup - Firebase Phone OTP + Clerk Email OTP

## 🚀 30-Second Setup

### Backend Install
```bash
cd server
npm install firebase jsonwebtoken express cors dotenv mongoose
```

### Frontend Install (React)
```bash
npm install firebase @clerk/clerk-react
```

### Frontend Install (Next.js)
```bash
npm install firebase @clerk/clerk-react
```

---

## 📋 Environment Variables

### Backend `.env`
```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=change_this_to_random_string_at_least_32_characters
PORT=5000
```

### Frontend `.env.local` (Next.js)
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_c3Ryb25nLXRpY2stMjIuY2xlcmsuYWNjb3VudHMuZGV2JA
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Frontend `.env` (React)
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_c3Ryb25nLXRpY2stMjIuY2xlcmsuYWNjb3VudHMuZGV2JA
```

---

## 📁 Files to Copy to Your Project

### Backend (All go to `server/` folder)
```
1. firebaseConfig.js → server/config/firebaseConfig.js
2. otpAuthController.js → server/controllers/otpAuthController.js
3. AuthModel.js → server/Modals/Auth.js (REPLACE existing)
4. authRoutes.js → server/routes/auth.js (ADD endpoints to existing)
```

### Frontend (All go to `yourtube/src/` folder)
```
1. firebaseConfig.js → src/lib/firebaseConfig.js
2. FirebasePhoneLogin.jsx → src/components/auth/FirebasePhoneLogin.jsx
3. ClerkEmailLogin.jsx → src/components/auth/ClerkEmailLogin.jsx
4. AppSetup.jsx → src/components/auth/AppSetup.jsx
```

---

## 🔧 Integration Steps

### Step 1: Backend Setup
```bash
# 1. Backup existing Auth.js
mv server/Modals/Auth.js server/Modals/Auth.js.backup

# 2. Copy new files
cp AuthModel.js server/Modals/Auth.js
cp otpAuthController.js server/controllers/
cp firebaseConfig.js server/config/
cp authRoutes.js server/routes/auth-otp.js  # Don't overwrite existing

# 3. Update server/index.js to import the new routes
# Add: import otpRoutes from "./routes/auth-otp.js"
# Add: app.use("/auth", otpRoutes)
```

### Step 2: Frontend Setup
```bash
# 1. Create directories
mkdir -p yourtube/src/lib
mkdir -p yourtube/src/components/auth

# 2. Copy files
cp firebaseConfig.js yourtube/src/lib/
cp FirebasePhoneLogin.jsx yourtube/src/components/auth/
cp ClerkEmailLogin.jsx yourtube/src/components/auth/
cp AppSetup.jsx yourtube/src/components/auth/

# 3. Update yourtube/src/_app.tsx or app.jsx with ClerkProvider
```

### Step 3: Create Login Page
```bash
# For Next.js
touch yourtube/src/app/login/page.jsx

# Or for React Router
touch yourtube/src/pages/Login.jsx
```

Content:
```jsx
import { LoginPage } from "@/components/auth/AppSetup";

export default function Login() {
  return <LoginPage />;
}
```

### Step 4: Update .env Files
```bash
# Backend
echo "JWT_SECRET=$(openssl rand -base64 32)" >> server/.env

# Frontend
echo "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_c3Ryb25nLXRpY2stMjIuY2xlcmsuYWNjb3VudHMuZGV2JA" >> yourtube/.env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:5000" >> yourtube/.env.local
```

---

## ✅ Verification Checklist

After setup, verify:

```bash
# 1. Backend - Start server
cd server
npm start
# Should see: "server running on port 5000"

# 2. Frontend - Start dev server  
cd yourtube
npm run dev
# Should see: "ready on http://localhost:3000"

# 3. Test endpoints
curl -X POST http://localhost:5000/auth/firebase-phone-verify \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210","uid":"test","displayName":"Test"}'
# Should return: { "success": false, ... } (valid response)

# 4. Test frontend
# Go to http://localhost:3000/login
# Should see two buttons: "Phone OTP" and "Email OTP"
```

---

## 🔒 Your Credentials (Already Configured)

### Firebase
- **apiKey**: AIzaSyCFYKNz9Dw_OSTIC7s046F0GX7oyKIFJus
- **projectId**: yourtube-hari
- **authDomain**: yourtube-hari.firebaseapp.com

### Clerk
- **Publishable Key**: pk_test_c3Ryb25nLXRpY2stMjIuY2xlcmsuYWNjb3VudHMuZGV2JA
- **Secret Key**: sk_test_YrKAx2Lutw5XQKFueMf2vq2FeA9wBzMfU3zVpKifzM

---

## 🧪 Quick Test

### Test Phone OTP (Firebase)
```
1. Go to http://localhost:3000/login
2. Click "Phone OTP (Firebase)"
3. Enter: +919876543210 (or your test number)
4. Complete reCAPTCHA
5. Click "Send OTP"
6. Enter code: 000000 (or real code if SMS received)
7. Click "Verify OTP"
```

### Test Email OTP (Clerk)
```
1. Go to http://localhost:3000/login
2. Click "Email OTP (Clerk)"
3. Enter: test@example.com
4. Click "Send Code"
5. Check email for code
6. Enter code
7. Click "Verify Code"
```

---

## 📊 Data Flow

```
User Phone Input
    ↓
Firebase RecaptchaVerifier
    ↓
signInWithPhoneNumber()
    ↓
User receives SMS
    ↓
User enters OTP
    ↓
confirmationResult.confirm(otp)
    ↓
Backend: /auth/firebase-phone-verify
    ↓
Create/Login user in MongoDB
    ↓
Issue JWT Token
    ↓
Auto-detect city
    ↓
Store token + user in localStorage
    ↓
Redirect to home/dashboard
```

---

## 🚨 Troubleshooting

### Firebase OTP Not Sending
- Check Firebase Console → Authentication → Phone Numbers
- Add test phone numbers if in development
- Verify reCAPTCHA is initialized

### Clerk Not Working
- Verify publishable key in .env.local
- Ensure ClerkProvider wraps entire app
- Check Clerk dashboard for account status

### MongoDB User Not Created
- Verify MONGO_URI in .env
- Check MongoDB connection
- Verify JWT_SECRET is set

### CORS Error
- Add frontend URL to server CORS settings
- Default: http://localhost:3000

### reCAPTCHA Container Not Found
- Ensure `<div id="recaptcha-container"></div>` exists
- Or modify container ID in FirebasePhoneLogin.jsx

---

## 📞 Support

For issues:
1. Check IMPLEMENTATION_GUIDE.md for detailed docs
2. Check Firebase docs: https://firebase.google.com/docs/auth
3. Check Clerk docs: https://clerk.com/docs
4. Check MongoDB connection
5. Check browser console for errors

---

**All your credentials are already configured in the files!**
Just copy files and run. No additional setup needed.
