import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Loader, Lock, ArrowLeft, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUI } from "../../context/UIProvider";
import { forgotPassword } from "../../services/authService";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(false); // Naya state track karne ke liye ki email chala gaya

  const { toast } = useUI();

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Direct Firebase function call
      await forgotPassword({ email });
      setIsSent(true);
      toast.success("Password reset link sent to your email!");
    } catch (err) {
      toast.error(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020403] flex items-center justify-center p-4 relative font-sans overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Premium Animated Background Glows */}
      <div
        className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none animate-pulse"
        style={{ animationDuration: "8s" }}
      ></div>
      <div
        className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-teal-600/10 blur-[120px] pointer-events-none animate-pulse"
        style={{ animationDuration: "10s" }}
      ></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-md bg-[#070d0a]/60 backdrop-blur-3xl border border-white/5 p-6 sm:p-8 md:p-10 rounded-[2rem] shadow-2xl relative z-10"
      >
        {/* Header Section */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-16 h-16 bg-gradient-to-tr from-emerald-500/20 to-teal-500/5 border border-emerald-500/20 rounded-2xl mx-auto flex items-center justify-center mb-5 shadow-[0_0_40px_rgba(16,185,129,0.1)] text-emerald-400"
          >
            <Lock size={28} strokeWidth={1.5} />
          </motion.div>

          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
            Reset Password
          </h2>
          <p className="text-emerald-100/50 text-sm font-medium">
            Enter your email to receive a secure recovery link.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!isSent ? (
            <motion.form
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleReset}
              className="space-y-6"
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0a120e] border border-white/10 text-white rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-white/20"
                    placeholder="admin@company.com"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#020403] font-bold py-4 rounded-2xl flex justify-center items-center gap-3 transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]"
              >
                {loading ? (
                  <Loader className="animate-spin text-[#020403]" size={22} />
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </motion.form>
          ) : (
            /* Success Message UI */
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 py-4"
            >
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 className="text-emerald-500" size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Check Your Inbox
                </h3>
                <p className="text-sm text-emerald-100/50 leading-relaxed">
                  We've sent a password reset link to <br />
                  <strong className="text-white">{email}</strong>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Link */}
        <div className="mt-8 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-xs font-bold text-white/40 hover:text-emerald-400 transition-colors uppercase tracking-widest"
          >
            <ArrowLeft size={14} /> Back to Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
