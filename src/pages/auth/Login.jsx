import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Lock,
  Mail,
  ArrowRight,
  Loader,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowLeft,
  Phone,
  KeyRound,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { loginAdmin, loginWithGoogle } from "../../services/authService";
import { auth } from "../../config/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";

const Login = () => {
  const [authMethod, setAuthMethod] = useState("email"); // "email" | "phone"

  // Email States
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  // Phone States
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [otpSent, setOtpSent] = useState(false);

  // Global States
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // --- 1. EMAIL/PASSWORD LOGIN ---
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await loginAdmin(formData);
      login(data);
      navigate("/enterprise/dashboard");
    } catch (err) {
      setError(err.message || "Invalid Credentials");
    } finally {
      setLoading(false);
    }
  };

  // --- 2. GOOGLE LOGIN ---
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await loginWithGoogle();
      login(data);
      navigate("/enterprise/dashboard");
    } catch (err) {
      setError(err.message || "Google Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  // --- 3. SETUP RECAPTCHA FOR PHONE ---
  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "invisible",
        },
      );
    }
  };

  // --- 4. SEND OTP (PHONE LOGIN) ---
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 10)
      return setError("Enter a valid 10-digit number");

    setLoading(true);
    setError("");
    try {
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      // Add +91 (India code) if not present
      const formattedPhone = phoneNumber.startsWith("+")
        ? phoneNumber
        : `+91${phoneNumber}`;

      const confirmation = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        appVerifier,
      );
      setConfirmationResult(confirmation);
      setOtpSent(true);
    } catch (err) {
      console.error(err);
      setError("Failed to send OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- 5. VERIFY OTP (PHONE LOGIN) ---
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return setError("Enter a valid 6-digit OTP");

    setLoading(true);
    setError("");
    try {
      const result = await confirmationResult.confirm(otp);
      login({ data: result.user });
      navigate("/enterprise/dashboard");
    } catch (err) {
      setError("Invalid Code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020403] flex items-center justify-center p-4 relative font-sans overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Invisible Recaptcha Container required by Firebase */}
      <div id="recaptcha-container"></div>

      {/* Premium Animated Background Glows */}
      <div
        className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none animate-pulse"
        style={{ animationDuration: "8s" }}
      ></div>
      <div
        className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-teal-600/10 blur-[120px] pointer-events-none animate-pulse"
        style={{ animationDuration: "10s" }}
      ></div>

      {/* Floating Back Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="absolute top-6 left-6 md:top-8 md:left-8 z-50"
      >
        <Link
          to="/"
          className="flex items-center gap-3 text-white/40 hover:text-emerald-400 transition-colors group"
        >
          <div className="p-2 sm:p-2.5 rounded-xl bg-white/5 border border-white/10 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-all backdrop-blur-md">
            <ArrowLeft
              size={18}
              className="group-hover:-translate-x-1 transition-transform"
            />
          </div>
          <span className="text-xs font-bold tracking-widest uppercase hidden sm:block">
            Home
          </span>
        </Link>
      </motion.div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-md bg-[#070d0a]/60 backdrop-blur-3xl border border-white/5 p-6 sm:p-8 md:p-10 rounded-[2rem] shadow-2xl relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 15,
              delay: 0.1,
            }}
            className="w-16 h-16 bg-gradient-to-tr from-emerald-500/20 to-teal-500/5 border border-emerald-500/20 rounded-2xl mx-auto flex items-center justify-center mb-5 shadow-[0_0_40px_rgba(16,185,129,0.1)] text-emerald-400"
          >
            <ShieldCheck size={30} strokeWidth={1.5} />
          </motion.div>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
            System Login
          </h2>
          <p className="text-emerald-100/50 text-sm font-medium">
            Secure Admin Access Portal
          </p>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm font-medium flex items-center justify-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- DYNAMIC FORM (EMAIL OR PHONE) --- */}
        <AnimatePresence mode="wait">
          {/* EMAIL LOGIN VIEW */}
          {authMethod === "email" && (
            <motion.form
              key="email-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleEmailSubmit}
              className="space-y-5"
            >
              <div className="space-y-2 group">
                <label className="text-xs font-semibold text-white/60 ml-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-emerald-400 transition-colors"
                    size={20}
                  />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full bg-[#0a120e] border border-white/10 text-white rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-white/20"
                    placeholder="admin@company.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 group">
                <label className="text-xs font-semibold text-white/60 ml-1">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-emerald-400 transition-colors"
                    size={20}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full bg-[#0a120e] border border-white/10 text-white rounded-2xl py-4 pl-12 pr-12 outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-white/20"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div className="flex justify-end pt-1">
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-emerald-500 hover:text-emerald-400 transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#020403] font-bold py-4 rounded-2xl flex justify-center items-center gap-3 transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(16,185,129,0.2)] mt-4 group"
              >
                {loading ? (
                  <Loader className="animate-spin text-[#020403]" size={22} />
                ) : (
                  <>
                    <span className="text-base font-bold">
                      Access Dashboard
                    </span>
                    <ArrowRight
                      size={20}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </>
                )}
              </button>
            </motion.form>
          )}

          {/* PHONE LOGIN VIEW */}
          {authMethod === "phone" && (
            <motion.form
              key="phone-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}
              className="space-y-5"
            >
              {!otpSent ? (
                <div className="space-y-2 group">
                  <label className="text-xs font-semibold text-white/60 ml-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-emerald-400 transition-colors"
                      size={20}
                    />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) =>
                        setPhoneNumber(e.target.value.replace(/\D/g, ""))
                      }
                      className="w-full bg-[#0a120e] border border-white/10 text-white rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-white/20 tracking-widest"
                      placeholder="9999900000"
                      maxLength="10"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2 group">
                  <label className="text-xs font-semibold text-emerald-500 ml-1">
                    Enter 6-Digit OTP
                  </label>
                  <div className="relative">
                    <KeyRound
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-emerald-400 transition-colors"
                      size={20}
                    />
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, ""))
                      }
                      className="w-full bg-[#0a120e] border border-emerald-500/30 text-emerald-400 text-center rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-white/10 tracking-[0.5em] font-black text-xl"
                      placeholder="••••••"
                      maxLength="6"
                      required
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#020403] font-bold py-4 rounded-2xl flex justify-center items-center gap-3 transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(16,185,129,0.2)] mt-4"
              >
                {loading ? (
                  <Loader className="animate-spin text-[#020403]" size={22} />
                ) : (
                  <span className="text-base font-bold">
                    {otpSent ? "Verify Code" : "Send OTP"}
                  </span>
                )}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* --- ALTERNATIVE LOGIN OPTIONS --- */}
        <div className="mt-8 pt-6 border-t border-white/5 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#070d0a] px-3 text-[10px] text-white/30 font-bold uppercase tracking-widest">
            Or continue with
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            {/* Google Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              {/* Simple Google G SVG */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>

            {/* Toggle Phone/Email Button */}
            <button
              type="button"
              onClick={() =>
                setAuthMethod(authMethod === "email" ? "phone" : "email")
              }
              disabled={loading}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              {authMethod === "email" ? (
                <>
                  <Phone size={16} /> Phone
                </>
              ) : (
                <>
                  <Mail size={16} /> Email
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
