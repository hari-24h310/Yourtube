# Package Installation Requirements

## Backend Packages to Install

### Required Packages
```bash
cd server
npm install firebase
npm install jsonwebtoken
```

### Already Installed (No Need to Reinstall)
```
- express ✅
- cors ✅
- dotenv ✅
- mongoose ✅
- nodemon ✅
```

### Complete Backend package.json Snippet
```json
{
  "dependencies": {
    "axios": "^1.16.1",
    "body-parser": "^2.2.0",
    "cors": "^2.8.5",
    "dotenv": "^16.5.0",
    "express": "^5.1.0",
    "express-fileupload": "^1.5.1",
    "firebase": "^11.0.0",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.16.0",
    "nodemailer": "^8.0.8",
    "socket.io": "^4.8.0"
  }
}
```

---

## Frontend Packages to Install

### Required Packages (React)
```bash
cd yourtube
npm install firebase
npm install @clerk/clerk-react
```

### Required Packages (Next.js)
```bash
cd yourtube
npm install firebase
npm install @clerk/clerk-react
```

### Already Installed (No Need to Reinstall)
```
- react ✅
- react-dom ✅
- next (if using Next.js) ✅
- axios (optional) ✅
```

### Complete Frontend package.json Snippet (React)
```json
{
  "dependencies": {
    "react": "^18.x.x",
    "react-dom": "^18.x.x",
    "firebase": "^11.0.0",
    "@clerk/clerk-react": "^5.0.0"
  }
}
```

### Complete Frontend package.json Snippet (Next.js)
```json
{
  "dependencies": {
    "next": "^14.x.x",
    "react": "^18.x.x",
    "react-dom": "^18.x.x",
    "firebase": "^11.0.0",
    "@clerk/clerk-react": "^5.0.0"
  }
}
```

---

## Installation Commands

### One-Line Backend Setup
```bash
cd server && npm install firebase jsonwebtoken
```

### One-Line Frontend Setup (React)
```bash
cd yourtube && npm install firebase @clerk/clerk-react
```

### One-Line Frontend Setup (Next.js)
```bash
cd yourtube && npm install firebase @clerk/clerk-react
```

---

## Post-Installation

### Backend - Remove Old OTP Packages
If you have these, remove them:
```bash
npm uninstall fast2sms twilio
```

### Frontend - Clear Cache (if needed)
```bash
npm cache clean --force
rm -rf node_modules
rm package-lock.json
npm install
```

---

## Version Information

| Package | Version | Required |
|---------|---------|----------|
| firebase | ^11.0.0 | ✅ Required |
| @clerk/clerk-react | ^5.0.0 | ✅ Required |
| jsonwebtoken | ^9.0.2+ | ✅ Required |
| express | ^5.0.0+ | Already installed |
| mongoose | ^8.0.0+ | Already installed |
| react | ^18.0.0+ | Already installed |

---

## Dependency Tree

```
Backend:
├── firebase
│   └── (handles phone auth, SMS)
├── jsonwebtoken
│   └── (generates JWT tokens)
├── express (existing)
├── mongoose (existing)
└── cors (existing)

Frontend (React/Next.js):
├── firebase
│   └── (Firebase client SDK)
├── @clerk/clerk-react
│   └── (Clerk authentication UI)
└── react (existing)
```

---

## Package Size Information

| Package | Size | Downloads |
|---------|------|-----------|
| firebase | ~700KB | Latest |
| @clerk/clerk-react | ~500KB | Latest |
| jsonwebtoken | ~300KB | Latest |

**Total additional size**: ~1.5MB for new packages

---

## Compatibility

### Tested With
- Node.js: v16.x, v18.x, v20.x ✅
- npm: v8.x, v9.x, v10.x ✅
- React: v17, v18 ✅
- Next.js: v13, v14 ✅
- MongoDB: v4.4+ ✅

### Not Required
```
❌ fast2sms
❌ twilio
❌ nodemailer (only if removing email OTP)
❌ expo
❌ react-native
```

---

## NPM Commands Cheatsheet

```bash
# Install all packages
npm install

# Install specific package
npm install <package-name>

# Install specific version
npm install <package-name>@<version>

# Save to package.json
npm install <package-name> --save

# Install globally
npm install -g <package-name>

# Check installed versions
npm list

# Update all packages
npm update

# Remove package
npm uninstall <package-name>
```

---

## Troubleshooting Installation

### Issue: npm ERR! code ERESOLVE
Solution:
```bash
npm install --legacy-peer-deps
```

### Issue: Module not found
Solution:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: Port already in use
Solution:
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Or use different port
PORT=5001 npm start
```

---

## Verification

### After Installation, Run:

```bash
# Check Firebase installed
npm ls firebase

# Check Clerk installed
npm ls @clerk/clerk-react

# Check jsonwebtoken installed
npm ls jsonwebtoken

# View all dependencies
npm ls
```

Expected output should show all three packages installed.

---

## Lock Files

### Keep These Files
```
✅ package-lock.json (backend)
✅ package-lock.json (frontend)
```

These files lock versions and ensure consistency across installations.

---

**Status**: ✅ All packages configured
**Installation Time**: ~2-3 minutes
**Disk Space Required**: ~500MB for node_modules
