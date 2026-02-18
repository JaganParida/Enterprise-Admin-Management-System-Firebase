import React, { useState, useEffect, Suspense, lazy } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import {
  Factory,
  Truck,
  ChevronRight,
  MapPin,
  LifeBuoy,
  X,
  ShieldCheck,
  Zap,
  BarChart3,
  Users,
  LogIn,
  Layout,
  FileCheck,
  Settings,
  Database,
  MousePointer2,
  LogOut,
  HandMetal, // Icon for mobile tap
} from "lucide-react";

// --- Internal Component: Public Navbar ---
const PublicNavbar = () => {
  const [showSupport, setShowSupport] = useState(false);
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 w-full z-50 bg-[#020403]/80 backdrop-blur-xl border-b border-emerald-900/20 h-20">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-emerald-500/20 ring-1 ring-white/10">
            E
          </div>
          <span className="font-bold text-lg md:text-xl text-white">
            Enterprise{" "}
            <span className="text-emerald-500 text-[10px] md:text-xs uppercase ml-1 opacity-90 font-mono">
              OS
            </span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-10 text-sm font-medium text-emerald-100/60">
          <a
            href="#features"
            className="hover:text-emerald-400 transition-colors"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="hover:text-emerald-400 transition-colors"
          >
            Workflow
          </a>
          <button
            onClick={() => setShowSupport(!showSupport)}
            className={`flex items-center gap-2 transition-colors ${showSupport ? "text-emerald-400" : "hover:text-emerald-400"}`}
          >
            <LifeBuoy size={16} /> Support
          </button>
        </div>

        <div className="flex items-center gap-4">
          {admin ? (
            <>
              <Link to="/enterprise/dashboard" className="hidden sm:block">
                <button className="px-5 py-2.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-all hover:bg-emerald-600/30">
                  Dashboard
                </button>
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="p-2.5 text-emerald-500/60 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </>
          ) : (
            <Link to="/login">
              <button className="px-4 md:px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all border border-emerald-500/20 shadow-lg">
                Admin Login
              </button>
            </Link>
          )}
        </div>

        {showSupport && (
          <div className="absolute top-20 right-6 w-80 bg-[#050a08] border border-emerald-900/40 rounded-2xl shadow-2xl p-5 z-50 animate-in zoom-in-95 origin-top-right ring-1 ring-white/5">
            <div className="flex justify-between items-center mb-4 border-b border-emerald-900/30 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <LifeBuoy size={16} className="text-emerald-500" /> Dev Support
              </h4>
              <button
                onClick={() => setShowSupport(false)}
                className="text-emerald-500/50 hover:text-emerald-400"
              >
                <X size={16} />
              </button>
            </div>
            <a
              href="https://wa.me/9124540575"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] hover:bg-emerald-500/10 border border-white/5 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-[#25D366]/20 flex items-center justify-center text-[#25D366] font-bold text-lg group-hover:scale-110 transition-transform">
                W
              </div>
              <div className="text-left">
                <span className="block text-sm font-bold text-white group-hover:text-[#25D366]">
                  WhatsApp
                </span>
                <span className="text-[10px] text-emerald-100/40">
                  Instant Support
                </span>
              </div>
            </a>
          </div>
        )}
      </div>
    </nav>
  );
};

// --- Workflow Component ---
const WorkflowNode = ({ icon: Icon, title, subtitle, index, isLast }) => {
  const isRight = index % 2 !== 0;
  return (
    <div className="flex flex-col md:flex-row items-center w-full relative mb-16 md:mb-0">
      <div
        className={`flex items-center w-full ${isRight ? "justify-end md:justify-center" : "justify-start md:justify-center"}`}
      >
        <motion.div
          whileInView={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 20 }}
          className="flex flex-col items-center group relative z-10 w-1/2 md:w-full"
        >
          <div className="w-20 h-20 rounded-2xl bg-[#080c0a] border border-emerald-900/40 flex items-center justify-center mb-4 transition-all duration-500 group-hover:border-emerald-500/50 shadow-xl ring-1 ring-white/5">
            <Icon
              size={28}
              className="text-emerald-500/60 group-hover:text-emerald-400 transition-colors"
            />
          </div>
          <div className="text-center px-2">
            <h4 className="text-[10px] font-bold text-white uppercase tracking-widest mb-1">
              {title}
            </h4>
            <p className="text-[9px] text-emerald-100/40 font-medium max-w-[100px] mx-auto">
              {subtitle}
            </p>
          </div>
        </motion.div>
      </div>
      {!isLast && (
        <div className="absolute top-10 left-0 w-full h-32 pointer-events-none">
          <svg
            className="w-full h-full overflow-visible"
            viewBox="0 0 400 100"
            preserveAspectRatio="none"
          >
            <path
              className="hidden md:block"
              d="M 220 10 L 380 10"
              fill="none"
              stroke="rgba(16,185,129,0.1)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <motion.path
              className="hidden md:block"
              d="M 220 10 L 380 10"
              fill="none"
              stroke="#10b981"
              strokeWidth="1"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: [0, 1], opacity: [0, 1, 0] }}
              transition={{
                repeat: Infinity,
                duration: 2,
                ease: "linear",
                delay: index * 0.4,
              }}
            />
            <path
              className="md:hidden"
              d={
                isRight
                  ? "M 320 10 C 320 50, 80 50, 80 90"
                  : "M 80 10 C 80 50, 320 50, 320 90"
              }
              fill="none"
              stroke="rgba(16,185,129,0.1)"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <motion.path
              className="md:hidden"
              d={
                isRight
                  ? "M 320 10 C 320 50, 80 50, 80 90"
                  : "M 80 10 C 80 50, 320 50, 320 90"
              }
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: [0, 1], opacity: [0, 1, 0] }}
              transition={{
                repeat: Infinity,
                duration: 3,
                ease: "linear",
                delay: index * 0.5,
              }}
            />
          </svg>
        </div>
      )}
    </div>
  );
};

// --- Footer with Smart Interaction Map ---
const PublicFooter = () => {
  const [mapUrl, setMapUrl] = useState(
    "https://maps.google.com/maps?q=Bhubaneswar&t=&z=13&ie=UTF8&iwloc=&output=embed",
  );
  const [isMapActive, setIsMapActive] = useState(false);
  const [isLaptop, setIsLaptop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    // 1. Get Current Location Logic
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setMapUrl(
            `https://maps.google.com/maps?q=${latitude},${longitude}&t=&z=14&ie=UTF8&iwloc=&output=embed`,
          );
        },
        (err) => console.warn("Geolocation access denied. Using default."),
      );
    }

    // 2. Handle Resize for Device Detection
    const handleResize = () => setIsLaptop(window.innerWidth >= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <footer className="bg-[#050a08] border-t border-emerald-900/20 pt-20 pb-10 px-6 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="mb-24">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 text-center md:text-left">
            <div className="flex items-center gap-3 justify-center md:justify-start">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20">
                <MapPin size={24} />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                Operation Center
              </h3>
            </div>
            <span className="px-4 py-1.5 rounded-full bg-emerald-900/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mx-auto md:mx-0 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />{" "}
              Live Node
            </span>
          </div>

          {/* SMART MAP CONTAINER */}
          <div
            className="w-full h-[450px] rounded-[32px] border border-emerald-900/30 overflow-hidden shadow-2xl relative group bg-white"
            onMouseEnter={() => isLaptop && setIsMapActive(true)}
            onMouseLeave={() => isLaptop && setIsMapActive(false)}
            onClick={() => !isLaptop && setIsMapActive(true)}
          >
            {/* Conditional Overlay based on Device */}
            {!isMapActive && (
              <div className="absolute inset-0 z-20 cursor-pointer flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm transition-all duration-700">
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    repeatType: "reverse",
                  }}
                  className="bg-black/90 border border-white/10 px-8 py-4 rounded-2xl flex flex-col items-center gap-3 shadow-2xl ring-1 ring-white/10"
                >
                  {isLaptop ? (
                    <MousePointer2 className="text-emerald-500" size={24} />
                  ) : (
                    <HandMetal className="text-emerald-500" size={24} />
                  )}
                  <span className="text-xs font-bold text-white tracking-widest uppercase">
                    {isLaptop ? "Hover to Interact" : "Click to Interact"}
                  </span>
                </motion.div>
              </div>
            )}

            <iframe
              src={mapUrl}
              width="100%"
              height="100%"
              style={{
                border: 0,
                filter:
                  "invert(90%) hue-rotate(180deg) brightness(95%) contrast(90%)",
              }}
              allowFullScreen=""
              loading="lazy"
              title="Location"
              className={`w-full h-full transition-all duration-700 ${isMapActive ? "grayscale-0 opacity-100" : "grayscale opacity-60"}`}
            ></iframe>
          </div>
        </div>

        <div className="border-t border-emerald-900/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] uppercase font-bold tracking-widest text-emerald-100/20">
          <p>© 2026 Enterprise OS.</p>
          <p>Developed by Centurions27</p>
        </div>
      </div>
    </footer>
  );
};

const Landing = () => {
  const { admin } = useAuth();

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "auto";
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#020403] text-white flex flex-col font-sans selection:bg-emerald-500/30">
      <PublicNavbar />
      <main className="flex-1 pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none mix-blend-screen" />
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-24 max-w-4xl mx-auto px-4 mt-8"
          >
            <span className="px-4 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-8 inline-block shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              Enterprise ERP v1.0
            </span>
            <h1 className="text-5xl md:text-8xl font-extrabold tracking-tighter mb-8 bg-gradient-to-b from-white via-emerald-100 to-emerald-500/20 bg-clip-text text-transparent leading-[1.1]">
              Unified Industrial <br /> Intelligence.
            </h1>
            <p className="text-emerald-100/50 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
              Securely orchestrate manufacturing and global logistics fleet.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-40 max-w-5xl mx-auto px-4">
            <PortalCard
              title="Enterprise Hub"
              desc="Production, inventory, and workforce management."
              icon={Factory}
              color="emerald"
              link={admin ? "/enterprise/dashboard" : "/login"}
              badge="Production"
            />
            <PortalCard
              title="Transportation"
              desc="Real-time fleet tracking and fuel analytics."
              icon={Truck}
              color="blue"
              link={admin ? "/transportation/dashboard" : "/login"}
              badge="Logistics"
            />
          </div>

          <section
            id="how-it-works"
            className="mb-40 px-4 max-w-lg md:max-w-7xl mx-auto scroll-mt-24"
          >
            <div className="text-center mb-20 md:mb-32">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                Operational Workflow
              </h2>
              <p className="text-emerald-100/40 text-sm">
                Industrial sequence from initiation to verified audit.
              </p>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center w-full relative">
              <WorkflowNode
                icon={Layout}
                title="Select Portal"
                subtitle="Choose Role"
                index={0}
              />
              <WorkflowNode
                icon={LogIn}
                title="Secure Auth"
                subtitle="Encrypted Login"
                index={1}
              />
              <WorkflowNode
                icon={Settings}
                title="Config Ops"
                subtitle="Set Parameters"
                index={2}
              />
              <WorkflowNode
                icon={Database}
                title="Data Sync"
                subtitle="Real-time Update"
                index={3}
              />
              <WorkflowNode
                icon={BarChart3}
                title="Deep Analytics"
                subtitle="AI Reasoning"
                index={4}
              />
              <WorkflowNode
                icon={FileCheck}
                title="Verified Audit"
                subtitle="Export Report"
                index={5}
                isLast
              />
            </div>
          </section>

          <section
            id="features"
            className="mb-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4 scroll-mt-24"
          >
            <FeatureItem
              icon={ShieldCheck}
              title="Role Security"
              desc="Granular access controls ensure data integrity."
              delay={0.1}
            />
            <FeatureItem
              icon={Zap}
              title="Real-Time Sync"
              desc="Updates propagate instantly across dashboards."
              delay={0.2}
            />
            <FeatureItem
              icon={BarChart3}
              title="Deep Analytics"
              desc="Visual charts for efficiency trends."
              delay={0.3}
            />
            <FeatureItem
              icon={Users}
              title="Workforce"
              desc="Track attendance and payroll in one module."
              delay={0.4}
            />
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
};

const PortalCard = ({ title, desc, icon: Icon, color, link, badge }) => (
  <Link to={link} className="group h-full">
    <div
      className={`p-8 md:p-10 h-full rounded-[32px] bg-[#050a08] border border-white/5 hover:border-${color}-500/50 transition-all duration-500 shadow-2xl group-hover:-translate-y-2`}
    >
      <div
        className={`w-16 h-16 rounded-2xl bg-${color}-500/10 flex items-center justify-center mb-8 text-${color}-500 group-hover:scale-110 transition-transform`}
      >
        <Icon size={32} />
      </div>
      <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 flex items-center gap-3">
        {title}{" "}
        <ChevronRight
          className={`opacity-0 group-hover:opacity-100 transition-all text-${color}-500`}
        />
      </h3>
      <p className="text-emerald-100/40 text-sm md:text-base mb-8 leading-relaxed">
        {desc}
      </p>
      <span
        className={`text-[10px] uppercase font-bold px-3 py-1.5 rounded-lg border bg-${color}-500/5 text-${color}-400 border-${color}-500/20`}
      >
        {badge}
      </span>
    </div>
  </Link>
);

const FeatureItem = ({ icon: Icon, title, desc, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5 }}
    className="p-8 rounded-3xl bg-white/[0.01] border border-white/5 hover:border-emerald-500/30 transition-all group shadow-sm hover:shadow-emerald-500/10"
  >
    <div className="w-12 h-12 rounded-xl bg-[#0A0F0D] border border-emerald-900/30 flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-all shadow-lg">
      <Icon size={24} />
    </div>
    <h4 className="text-lg font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors">
      {title}
    </h4>
    <p className="text-sm text-emerald-100/40 leading-relaxed">{desc}</p>
  </motion.div>
);

export default Landing;
