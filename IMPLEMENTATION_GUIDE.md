# Firebase Phone OTP + Clerk Email OTP - Implementation Guide

## Overview
- ✅ **Firebase Phone OTP**: RecaptchaVerifier + signInWithPhoneNumber flow
- ✅ **Clerk Email OTP**: Built-in Clerk email code authentication
- ✅ **MongoDB Sync**: Auto create/login users after verification
- ✅ **JWT Token**: Issued on successful verification
- ✅ **Geo-Location**: Auto-detect and store user's city

---

## 📦 Installation Steps

### 1. Backend Setup

#### Install Firebase Admin SDK (for backend optional verification)
```bash
cd server
npm install firebase firebase-admin
```

#### Install Clerk Backend SDK (optional)
```bash
npm install @clerk/backend
```

#### Ensure existing packages
```bash
npm install jsonwebtoken express cors dotenv mongoose
```

### 2. Frontend Setup (React/Next.js)

#### Install Firebase SDK
```bash
npm install firebase
```

#### Install Clerk React SDK
```bash
npm install @clerk/clerk-react
```

#### Install Axios (optional, for API calls)
```bash
npm install axios
```

---

## 🔧 File Structure & Setup

### Backend Files to Add/Update

```
server/
├── config/
│   └── firebaseConfig.js           ← Firebase configuration
├── controllers/
│   └── otpAuthController.js        ← NEW: Firebase + Clerk handlers
├── Modals/
│   └── Auth.js                     ← UPDATE: Add Firebase/Clerk fields
├── routes/
│   └── auth.js                     ← UPDATE: Add new OTP endpoints
├── .env                            ← UPDATE: Add JWT_SECRET
└── index.js                        ← Already configured
```

### Frontend Files to Add/Update

```
yourtube/src/
├── lib/
│   └── firebaseConfig.js           ← Firebase config (can copy from backend)
├── components/
│   └── auth/
│       ├── FirebasePhoneLogin.jsx  ← NEW: Phone OTP component
│       ├── ClerkEmailLogin.jsx     ← NEW: Email OTP component
│       └── LoginPage.jsx           ← NEW: Login method selector
├── app.jsx                         ← UPDATE: Wrap with ClerkProvider
└── .env.local                      ← UPDATE: Add Clerk publishable key
```

---

## 🚀 Step-by-Step Implementation

### Step 1: Copy Backend Files

1. **Copy `otpAuthController.js` to `server/controllers/`**
   - Contains handlers for Firebase phone and Clerk email verification

2. **Update `server/Modals/Auth.js`**
   - Replace with the provided `AuthModel.js`
   - Adds fields: `firebaseUid`, `clerkId`, `authMethod`, `isEmailVerified`, `isPhoneVerified`

3. **Update `server/routes/auth.js`**
   - Add the new endpoints from `authRoutes.js`:
     - `POST /auth/firebase-phone-verify`
     - `POST /auth/clerk-email-verify`
     - `POST /auth/update-city`

4. **Update `.env` file**
   ```
   JWT_SECRET=your_super_secret_key_here_min_32_chars
   MONGO_URI=your_mongodb_uri
   PORT=5000
   ```

### Step 2: Copy Frontend Files

1. **Create `src/lib/firebaseConfig.js`**
   - Copy from provided `firebaseConfig.js`
   - Already has your Firebase credentials

2. **Create `src/components/auth/FirebasePhoneLogin.jsx`**
   - Copy the full component
   - No modifications needed

3. **Create `src/components/auth/ClerkEmailLogin.jsx`**
   - Copy the full component
   - No modifications needed

4. **Update `src/app.jsx` or `_app.tsx`** (depending on React or Next.js)
   ```jsx
   import { ClerkProvider } from "@clerk/clerk-react";

   export default function App({ Component, pageProps }) {
     return (
       <ClerkProvider 
         publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
       >
         <Component {...pageProps} />
       </ClerkProvider>
     );
   }
   ```

5. **Update `.env.local` (or `.env` for React)**
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_c3Ryb25nLXRpY2stMjIuY2xlcmsuYWNjb3VudHMuZGV2JA
   REACT_APP_API_URL=http://localhost:5000
   ```

### Step 3: Create Login Page Route

Create a new page at `src/pages/login.jsx` or `src/app/login/page.jsx`:
```jsx
import { LoginPage } from "@/components/auth/AppSetup";
export default LoginPage;
```

---

## 🔑 API Endpoints Reference

### Firebase Phone OTP

**POST** `/auth/firebase-phone-verify`

Request:
```json
{
  "phone": "+919876543210",
  "uid": "firebase_uid_here",
  "displayName": "John Doe"
}
```

Response:
```json
{
  "success": true,
  "message": "Phone verified successfully",
  "token": "jwt_token_here",
  "user": {
    "_id": "mongo_user_id",
    "phone": "+919876543210",
    "displayName": "John Doe",
    "authMethod": "firebase_phone"
  }
}
```

### Clerk Email OTP

**POST** `/auth/clerk-email-verify`

Request:
```json
{
  "email": "user@example.com",
  "clerkId": "clerk_user_id",
  "displayName": "user"
}
```

Response:
```json
{
  "success": true,
  "message": "Email verified successfully",
  "token": "jwt_token_here",
  "user": {
    "_id": "mongo_user_id",
    "email": "user@example.com",
    "displayName": "user",
    "authMethod": "clerk_email"
  }
}
```

### Update User City

**POST** `/auth/update-city`

Request:
```json
{
  "userId": "mongo_user_id",
  "city": "Mumbai"
}
```

---

## 🗑️ Removing Old OTP Code

### Remove from Backend:
1. Delete `server/utils/otpService.js` (old Fast2SMS)
2. Delete `server/routes/otpRoutes.js` (if exists)
3. Delete `server/controllers/authOTP.js` (old implementation)
4. Remove from `server/routes/auth.js`:
   - Any routes using Fast2SMS
   - Any routes using nodemailer OTP

### Remove from Frontend:
1. Delete old OTP input components
2. Delete "Dev OTP" display components
3. Remove Fast2SMS related imports
4. Remove old nodemailer email OTP flows

### Remove from index.js:
1. Remove import: `import otpRoutes from './routes/otpRoutes.js'`
2. Remove route: `app.use('/otp', otpRoutes)`

---

## 🧪 Testing

### Test Firebase Phone OTP
```
1. Go to /login
2. Click "Phone OTP (Firebase)"
3. Enter phone: +919876543210
4. Complete reCAPTCHA
5. Click "Send OTP"
6. Firebase SMS arrives (use test numbers if in dev)
7. Enter 6-digit OTP
8. Click "Verify OTP"
9. Should see success message and redirect
```

### Test Clerk Email OTP
```
1. Go to /login
2. Click "Email OTP (Clerk)"
3. Enter email: test@example.com
4. Click "Send Code"
5. Check email for code
6. Enter 6-digit code
7. Click "Verify Code"
8. Should see success message and redirect
```

### Test MongoDB User Creation
```
After login, check MongoDB:
db.users.find({ email: "test@example.com" })
or
db.users.find({ phone: "+919876543210" })

Should see user with:
- authMethod: "firebase_phone" or "clerk_email"
- isPhoneVerified or isEmailVerified: true
- city: "detected_city"
```

### Test JWT Token
```
localStorage.getItem("authToken")
Should return valid JWT token

To decode (use https://jwt.io):
- Should contain userId, email/phone, authMethod
- Should be valid for 30 days
```

---

## 🔒 Security Checklist

- ✅ Firebase Phone: Uses reCAPTCHA to prevent abuse
- ✅ Clerk Email: Uses Clerk's secure verification
- ✅ JWT: Signed with strong secret key
- ✅ Phone/Email: Unique per user (sparse index in MongoDB)
- ✅ User Creation: Only after successful OTP verification
- ✅ City Detection: Uses public geolocation API (privacy-safe)

**Add to backend security:**
```javascript
// server/index.js
app.use(cors({
  origin: ["http://localhost:3000", "your-production-url"],
  credentials: true,
}));

// Add rate limiting
import rateLimit from "express-rate-limit";
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);
```

---

## 📱 Supported Phone Countries

Firebase supports OTP for:
- India (+91)
- USA/Canada (+1)
- UK (+44)
- Australia (+61)
- Germany (+49)
- France (+33)
- Japan (+81)
- And 190+ more countries

**Note**: Use test phone numbers for development:
- Firebase provides test numbers in Console → Phone Numbers

---

## ⚠️ Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| reCAPTCHA not showing | Check browser console for errors, ensure Firebase config is correct |
| OTP not received | Use test phone numbers if in dev mode, check Firebase settings |
| "clerkId is null" | Ensure Clerk is properly initialized with publishable key |
| JWT token not stored | Check localStorage is enabled, verify API response |
| City shows "Unknown" | Check CORS allows ipapi.co, verify geolocation works |
| User not created in MongoDB | Check MongoDB connection, verify JWT_SECRET in .env |

---

## 📚 Additional Resources

- Firebase Phone Auth: https://firebase.google.com/docs/auth/web/phone-auth
- Clerk Email OTP: https://clerk.com/docs/authentication/passwordless/email-code
- RecaptchaVerifier: https://firebase.google.com/docs/auth/web/phone-auth#recaptchaverifier

---

## ✅ Checklist Before Deployment

- [ ] Firebase config updated with your project credentials
- [ ] Clerk publishable key in .env.local
- [ ] JWT_SECRET set to strong random string
- [ ] MongoDB connection string verified
- [ ] Old OTP code removed completely
- [ ] Frontend and backend URLs match in CORS
- [ ] All components imported correctly
- [ ] Tested phone OTP login
- [ ] Tested email OTP login
- [ ] Users created in MongoDB
- [ ] JWT tokens valid in localStorage
- [ ] City detection working
- [ ] No console errors

---

**Generated**: June 2026
**Version**: 1.0
