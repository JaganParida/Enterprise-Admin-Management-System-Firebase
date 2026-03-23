import React, { useState } from "react";
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
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { loginAdmin, loginWithGoogle } from "../../services/authService";
import { motion, AnimatePresence } from "framer-motion";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Helper function to handle post-login logic
  const handleAuthSuccess = (userData) => {
    login(userData); // Save user + role in context
    navigate("/enterprise/dashboard");
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await loginAdmin(formData);
      handleAuthSuccess(data);
    } catch (err) {
      setError(err.message || "Invalid Credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await loginWithGoogle();
      handleAuthSuccess(data);
    } catch (err) {
      setError(err.message || "Google Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-4 relative font-sans overflow-hidden selection:bg-indigo-500/30 selection:text-white">
      {/* Static Background Glows - High Performance (Softened & Responsive) */}
      <div className="absolute top-0 left-1/4 w-[120vw] md:w-[600px] max-w-[800px] h-[120vw] md:h-[600px] max-h-[800px] bg-indigo-500/5 blur-[100px] md:blur-[120px] rounded-full pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-0 right-1/4 w-[100vw] md:w-[500px] max-w-[600px] h-[100vw] md:h-[500px] max-h-[600px] bg-blue-500/5 blur-[100px] md:blur-[120px] rounded-full pointer-events-none mix-blend-screen" />

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="absolute top-6 left-6 md:top-8 md:left-8 z-50"
      >
        <Link
          to="/"
          className="flex items-center gap-3 text-zinc-500 hover:text-indigo-400 transition-colors group"
        >
          <div className="p-2 sm:p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-all backdrop-blur-md">
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

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="w-[95%] sm:w-full max-w-md bg-zinc-900/40 backdrop-blur-3xl border border-zinc-800 p-6 sm:p-8 md:p-10 rounded-[2rem] shadow-2xl relative z-10 mx-auto"
      >
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
            className="w-16 h-16 bg-gradient-to-tr from-indigo-500/20 to-blue-500/5 border border-indigo-500/20 rounded-2xl mx-auto flex items-center justify-center mb-5 shadow-[0_0_40px_rgba(99,102,241,0.15)] text-indigo-400"
          >
            <ShieldCheck size={30} strokeWidth={1.5} />
          </motion.div>
          <h2 className="text-2xl md:text-3xl font-bold text-zinc-100 tracking-tight mb-2">
            System Login
          </h2>
          <p className="text-zinc-500 text-sm font-medium">
            Secure Admin Access Portal
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl mb-6 text-sm font-medium flex items-center justify-center gap-2 overflow-hidden"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0"></span>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleEmailSubmit} className="space-y-5">
          <div className="space-y-2 group">
            <label className="text-xs font-semibold text-zinc-400 ml-1">
              Email Address
            </label>
            <div className="relative">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors"
                size={20}
              />
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full bg-[#09090B] border border-zinc-800 text-white rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-zinc-600"
                placeholder="admin@company.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2 group">
            <label className="text-xs font-semibold text-zinc-400 ml-1">
              Password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors"
                size={20}
              />
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full bg-[#09090B] border border-zinc-800 text-white rounded-2xl py-4 pl-12 pr-12 outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-zinc-600"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="flex justify-end pt-1">
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Forgot Password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl flex justify-center items-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-indigo-900/20 hover:shadow-indigo-500/30 mt-4 group border border-indigo-500/50"
          >
            {loading ? (
              <Loader className="animate-spin text-white" size={22} />
            ) : (
              <>
                <span className="text-sm font-bold tracking-wide uppercase">
                  Access Dashboard
                </span>
                <ArrowRight
                  size={18}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-800/60 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#09090B] px-3 text-[10px] text-zinc-500 font-bold uppercase tracking-widest outline outline-[#09090B] outline-4">
            Or continue with
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-[#09090B] hover:bg-zinc-900 border border-zinc-800 text-white font-medium py-3.5 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] hover:border-zinc-700"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
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
              Sign in with Google
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
