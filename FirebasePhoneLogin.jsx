import React, { useState, useRef, useEffect } from "react";
import { auth } from "@/lib/firebaseConfig";
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  signOut 
} from "firebase/auth";

const FirebasePhoneLogin = ({ onLoginSuccess }) => {
  const [phone, setPhone] = useState("+91"); // Default India code
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("phone"); // "phone" or "otp"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const recaptchaVerifierRef = useRef(null);

  // Initialize RecaptchaVerifier on component mount
  useEffect(() => {
    try {
      recaptchaVerifierRef.current = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "normal",
          callback: (response) => {
            console.log("✅ reCAPTCHA verified");
          },
          "expired-callback": () => {
            setError("reCAPTCHA expired. Please try again.");
          },
        }
      );
    } catch (err) {
      console.log("RecaptchaVerifier may already exist or error:", err.message);
    }

    return () => {
      // Cleanup
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
      }
    };
  }, []);

  // =====================================================
  // STEP 1: Send OTP
  // =====================================================
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!phone || phone.length < 10) {
        throw new Error("Invalid phone number");
      }

      // Send OTP
      const result = await signInWithPhoneNumber(
        auth,
        phone,
        recaptchaVerifierRef.current
      );

      setConfirmationResult(result);
      setStep("otp");
      console.log("✅ OTP sent to:", phone);
    } catch (err) {
      console.error("Error sending OTP:", err);
      setError(err.message || "Failed to send OTP");
      
      // Reset reCAPTCHA on error
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
      }
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // STEP 2: Verify OTP
  // =====================================================
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!otp || otp.length !== 6) {
        throw new Error("OTP must be 6 digits");
      }

      if (!confirmationResult) {
        throw new Error("Confirmation result not found");
      }

      // Verify OTP with Firebase
      const result = await confirmationResult.confirm(otp);
      const firebaseUser = result.user;

      console.log("✅ Phone verified:", firebaseUser.phoneNumber);

      // Send to backend for MongoDB user creation/login
      const backendResponse = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/auth/firebase-phone-verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: firebaseUser.phoneNumber,
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
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
    } catch (err) {
      console.error("Error verifying OTP:", err);
      setError(err.message || "Failed to verify OTP");
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
    setStep("phone");
    setPhone("+91");
    setOtp("");
    setError("");
    setConfirmationResult(null);
    if (recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current.clear();
    }
  };

  return (
    <div className="firebase-phone-login">
      <h2>📱 Login with Phone OTP</h2>

      {error && <div className="error-message">{error}</div>}

      {step === "phone" ? (
        <form onSubmit={handleSendOTP}>
          <label>Phone Number:</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91XXXXXXXXXX"
            disabled={loading}
          />
          <div id="recaptcha-container"></div>
          <button type="submit" disabled={loading}>
            {loading ? "Sending OTP..." : "Send OTP"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP}>
          <label>Enter OTP (6 digits):</label>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="000000"
            maxLength="6"
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
          <button type="button" onClick={handleReset} disabled={loading}>
            Change Phone
          </button>
        </form>
      )}

      <style jsx>{`
        .firebase-phone-login {
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

        #recaptcha-container {
          margin: 15px 0;
          display: flex;
          justify-content: center;
        }
      `}</style>
    </div>
  );
};

export default FirebasePhoneLogin;
