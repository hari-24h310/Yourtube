import React, { useState } from "react";
import { ClerkProvider } from "@clerk/clerk-react";
import FirebasePhoneLogin from "@/components/auth/FirebasePhoneLogin";
import ClerkEmailLogin from "@/components/auth/ClerkEmailLogin";

// =====================================================
// APP SETUP - Main Entry Point
// =====================================================

/**
 * This is how your main app.jsx or _app.tsx should look
 * Wrap entire app with ClerkProvider
 */

export default function App({ Component, pageProps }) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      {/* Your app content */}
      <Component {...pageProps} />
    </ClerkProvider>
  );
}

// =====================================================
// LOGIN PAGE COMPONENT
// =====================================================

export function LoginPage() {
  const [authMethod, setAuthMethod] = useState(null); // "phone" or "email"
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLoginSuccess = (user) => {
    console.log("User logged in:", user);
    setIsLoggedIn(true);
    // Redirect to home or dashboard
    // window.location.href = "/dashboard";
  };

  if (isLoggedIn) {
    return (
      <div className="success-screen">
        <h1>✅ Login Successful!</h1>
        <p>You will be redirected shortly...</p>
      </div>
    );
  }

  return (
    <div className="login-page">
      <h1>YouTube 2.0 - Login</h1>

      {!authMethod ? (
        <div className="method-selector">
          <h2>Choose Login Method:</h2>
          <button onClick={() => setAuthMethod("phone")} className="btn-phone">
            📱 Phone OTP (Firebase)
          </button>
          <button onClick={() => setAuthMethod("email")} className="btn-email">
            ✉️ Email OTP (Clerk)
          </button>
        </div>
      ) : authMethod === "phone" ? (
        <div>
          <button onClick={() => setAuthMethod(null)} className="back-btn">
            ← Back
          </button>
          <FirebasePhoneLogin onLoginSuccess={handleLoginSuccess} />
        </div>
      ) : (
        <div>
          <button onClick={() => setAuthMethod(null)} className="back-btn">
            ← Back
          </button>
          <ClerkEmailLogin onLoginSuccess={handleLoginSuccess} />
        </div>
      )}

      <style jsx>{`
        .login-page {
          max-width: 600px;
          margin: 0 auto;
          padding: 40px 20px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        h1 {
          text-align: center;
          color: #333;
          margin-bottom: 30px;
        }

        .method-selector {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .method-selector h2 {
          color: #666;
          margin-bottom: 20px;
        }

        button {
          padding: 15px 30px;
          font-size: 16px;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s;
          min-width: 300px;
        }

        .btn-phone {
          background: #ff0000;
          color: white;
        }

        .btn-phone:hover {
          background: #cc0000;
          transform: scale(1.02);
        }

        .btn-email {
          background: #6366f1;
          color: white;
        }

        .btn-email:hover {
          background: #4f46e5;
          transform: scale(1.02);
        }

        .back-btn {
          background: #ccc;
          color: #333;
          padding: 10px 20px;
          min-width: auto;
          margin-bottom: 20px;
        }

        .back-btn:hover {
          background: #aaa;
        }

        .success-screen {
          text-align: center;
          padding: 100px 20px;
        }

        .success-screen h1 {
          color: #4caf50;
          font-size: 48px;
          margin-bottom: 20px;
        }

        .success-screen p {
          color: #666;
          font-size: 18px;
        }
      `}</style>
    </div>
  );
}
