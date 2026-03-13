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
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-4 relative font-sans overflow-hidden selection:bg-indigo-500/30 selection:text-white">
      {/* Static Background Glows - High Performance (Softened & Responsive) */}
      <div className="absolute top-0 left-1/4 w-[120vw] md:w-[600px] max-w-[800px] h-[120vw] md:h-[600px] max-h-[800px] bg-indigo-500/5 blur-[100px] md:blur-[120px] rounded-full pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-0 right-1/4 w-[100vw] md:w-[500px] max-w-[600px] h-[100vw] md:h-[500px] max-h-[600px] bg-blue-500/5 blur-[100px] md:blur-[120px] rounded-full pointer-events-none mix-blend-screen" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="w-[95%] sm:w-full max-w-md bg-zinc-900/40 backdrop-blur-3xl border border-zinc-800 p-6 sm:p-8 md:p-10 rounded-[2rem] shadow-2xl relative z-10 mx-auto"
      >
        {/* Header Section */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-16 h-16 bg-gradient-to-tr from-indigo-500/20 to-blue-500/5 border border-indigo-500/20 rounded-2xl mx-auto flex items-center justify-center mb-5 shadow-[0_0_40px_rgba(99,102,241,0.15)] text-indigo-400"
          >
            <Lock size={28} strokeWidth={1.5} />
          </motion.div>

          <h2 className="text-2xl md:text-3xl font-bold text-zinc-100 tracking-tight mb-2">
            Reset Password
          </h2>
          <p className="text-zinc-500 text-sm font-medium">
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#09090B] border border-zinc-800 text-white rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-zinc-600"
                    placeholder="admin@company.com"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl flex justify-center items-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-indigo-900/20 hover:shadow-indigo-500/30 border border-indigo-500/50"
              >
                {loading ? (
                  <Loader className="animate-spin text-white" size={22} />
                ) : (
                  <span className="text-sm font-bold tracking-wide uppercase">Send Reset Link</span>
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
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                <CheckCircle2 className="text-emerald-500" size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Check Your Inbox
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  We've sent a password reset link to <br />
                  <strong className="text-white bg-zinc-800/50 px-2 py-0.5 rounded-md mt-1 inline-block border border-zinc-700">{email}</strong>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Link */}
        <div className="mt-8 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-indigo-400 transition-colors uppercase tracking-widest"
          >
            <ArrowLeft size={14} /> Back to Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
