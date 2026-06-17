import React, { useState, useEffect } from "react";
import { useSignIn } from "@clerk/clerk-react";

const ClerkEmailLogin = ({ onLoginSuccess }) => {
  const { signIn, setActive } = useSignIn();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("email"); // "email" or "code"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clerkUserId, setClerkUserId] = useState(null);

  // =====================================================
  // STEP 1: Send Code to Email
  // =====================================================
  const handleSendCode = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!email || !email.includes("@")) {
        throw new Error("Please enter a valid email address");
      }

      // Initiate email code authentication
      await signIn.create({
        strategy: "email_code",
        identifier: email,
      });

      // Move to code entry step
      setStep("code");
      console.log("✅ Code sent to email:", email);
    } catch (err) {
      console.error("Error sending code:", err);
      setError(err.errors?.[0]?.message || "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // STEP 2: Verify Code
  // =====================================================
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!code || code.length !== 6) {
        throw new Error("Code must be 6 characters");
      }

      // Attempt to complete the sign-in with code
      const completeSignIn = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code: code,
      });

      if (completeSignIn.status === "complete") {
        // Get Clerk user ID
        const clerkId = completeSignIn.createdUserId || signIn.userId;
        setClerkUserId(clerkId);

        // Set active session
        await setActive({ session: completeSignIn.createdSessionId });

        console.log("✅ Email verified with Clerk:", email);

        // Send to backend for MongoDB user creation/login
        const backendResponse = await fetch(
          `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/auth/clerk-email-verify`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: email,
              clerkId: clerkId,
              displayName: email.split("@")[0], // Use email prefix as display name
            }),
          }
        );

        const data = await backendResponse.json();

        if (!backendResponse.ok) {
          throw new Error(data.message || "Backend verification failed");
        }

        // Store JWT token
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        // Update user's city using geolocation
        await updateUserCity(data.user._id);

        // Call success callback
        if (onLoginSuccess) {
          onLoginSuccess(data.user);
        }

        console.log("✅ Login successful:", data.user);
      } else {
        throw new Error("Verification incomplete. Please try again.");
      }
    } catch (err) {
      console.error("Error verifying code:", err);
      setError(
        err.errors?.[0]?.message ||
        err.message ||
        "Failed to verify code"
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // AUTO-DETECT USER'S CITY
  // =====================================================
  const updateUserCity = async (userId) => {
    try {
      const response = await fetch("https://ipapi.co/json/");
      const locationData = await response.json();
      const city = locationData.city || "Unknown";

      await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/auth/update-city`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, city }),
        }
      );

      console.log("✅ City updated:", city);
    } catch (err) {
      console.error("Error updating city:", err);
    }
  };

  // =====================================================
  // RESET FLOW
  // =====================================================
  const handleReset = () => {
    setStep("email");
    setEmail("");
    setCode("");
    setError("");
    setClerkUserId(null);
  };

  return (
    <div className="clerk-email-login">
      <h2>✉️ Login with Email OTP</h2>

      {error && <div className="error-message">{error}</div>}

      {step === "email" ? (
        <form onSubmit={handleSendCode}>
          <label>Email Address:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@example.com"
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Sending Code..." : "Send Code"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode}>
          <p className="info-text">
            A code has been sent to <strong>{email}</strong>
          </p>
          <label>Enter Code (6 characters):</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000000"
            maxLength="6"
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Verify Code"}
          </button>
          <button type="button" onClick={handleReset} disabled={loading}>
            Change Email
          </button>
        </form>
      )}

      <style jsx>{`
        .clerk-email-login {
          max-width: 400px;
          margin: 20px auto;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #f9f9f9;
        }

        h2 {
          text-align: center;
          color: #333;
          margin-bottom: 20px;
        }

        form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        label {
          font-weight: 600;
          color: #555;
        }

        input {
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 16px;
        }

        input:disabled {
          background: #f0f0f0;
          cursor: not-allowed;
        }

        button {
          padding: 10px;
          background: #ff0000;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.3s;
        }

        button:hover:not(:disabled) {
          background: #cc0000;
        }

        button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .error-message {
          color: #d32f2f;
          background: #ffebee;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 15px;
        }

        .info-text {
          text-align: center;
          color: #666;
          font-size: 14px;
          margin-bottom: 10px;
        }
      `}</style>
    </div>
  );
};

export default ClerkEmailLogin;
