import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  MessageCircle,
  PlayCircle,
  LogOut,
  Building2,
  Construction,
  Tractor,
  ArrowRight,
} from "lucide-react";

// --- Smooth Framer Motion Variants ---
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const fadeUpVariant = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

// --- Support Data ---
const supportDevelopers = [
  {
    id: 1,
    name: "Jagan Parida",
    phone: "+91 91245 40575",
    whatsapp: "919124540575",
  },
  {
    id: 2,
    name: "Swoyamjit Biswal",
    phone: "+91 63720 75270",
    whatsapp: "916372075270",
  },
  {
    id: 3,
    name: "Arpit Khatua",
    phone: "+91 96923 52502",
    whatsapp: "919692352502",
  },
  {
    id: 4,
    name: "Sameer Jena",
    phone: "+91 93482 06812",
    whatsapp: "919348206812",
  },
  {
    id: 5,
    name: "Biswajit Rout",
    phone: "+91 82604 18838",
    whatsapp: "918260418838",
  },
];

// --- Public Navbar ---
const PublicNavbar = () => {
  const [showSupport, setShowSupport] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#09090B]/90 backdrop-blur-xl border-b border-white/5 h-16 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
          : "bg-transparent h-24 border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-full flex items-center justify-between relative">
        {/* LOGO SECTION */}
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <div className="w-10 h-10 relative flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl blur-[8px] opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative w-full h-full bg-[#1A1B23] backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10 shadow-lg">
              <span className="font-black text-xl text-white tracking-tighter">
                E
              </span>
            </div>
          </div>
          <span className="font-bold text-lg md:text-xl text-white tracking-tight flex items-center gap-2">
            Enterprise
            <span className="text-indigo-400 font-mono text-[10px] md:text-xs font-bold tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 uppercase">
              OS
            </span>
          </span>
        </div>

        {/* MIDDLE NAV LINKS */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-300">
          {["Services", "Features"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="hover:text-white transition-colors duration-200"
            >
              {item}
            </a>
          ))}
          <button
            onClick={() => setShowSupport(!showSupport)}
            className={`flex items-center gap-2 transition-colors duration-200 ${showSupport ? "text-indigo-400" : "hover:text-white"}`}
          >
            <LifeBuoy size={16} /> Support
          </button>
        </div>

        {/* RIGHT ACTION BUTTONS */}
        <div className="flex items-center gap-4">
          {admin ? (
            <>
              <Link to="/enterprise/dashboard" className="hidden sm:block">
                <button className="px-6 py-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all hover:bg-indigo-500/20 active:scale-95">
                  Dashboard
                </button>
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="p-2 text-zinc-400 hover:text-white transition-all active:scale-95"
              >
                <LogOut size={20} strokeWidth={2} />
              </button>
            </>
          ) : (
            <Link to="/login">
              <button className="px-6 py-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all hover:bg-indigo-500/20 active:scale-95">
                Login
              </button>
            </Link>
          )}
        </div>

        {/* Support Modal */}
        <AnimatePresence>
          {showSupport && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 w-screen h-screen bg-black/40 backdrop-blur-sm"
                onClick={() => setShowSupport(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute top-24 right-4 md:right-6 w-[calc(100vw-32px)] md:w-[380px] bg-[#09090B]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-5 z-50"
              >
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/5">
                  <div>
                    <h4 className="text-base font-semibold text-white flex items-center gap-2">
                      <LifeBuoy size={18} className="text-indigo-400" /> Support
                      Team
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1">
                      Connect directly with our developers
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSupport(false)}
                    className="text-zinc-500 hover:text-white transition-colors bg-white/5 p-1.5 rounded-lg"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                  {supportDevelopers.map((dev) => (
                    <a
                      key={dev.id}
                      href={`https://wa.me/${dev.whatsapp}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl transition-all group hover:bg-white/5 border border-transparent hover:border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-[#25D366]/20 group-hover:text-[#25D366] transition-colors">
                          <MessageCircle size={18} />
                        </div>
                        <div className="text-left">
                          <span className="block text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                            {dev.name}
                          </span>
                          <span className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{" "}
                            Online
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-zinc-600 group-hover:text-white transition-colors"
                      />
                    </a>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

// --- ANIMATED DASHBOARD COMPONENT ---
const AnimatedDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % 4);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: 0, width: "w-16" },
    { id: 1, width: "w-20" },
    { id: 2, width: "w-24" },
    { id: 3, width: "w-16" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-5xl mx-auto mb-32 relative perspective-1000"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent rounded-3xl blur-2xl" />
      <div className="relative bg-[#18181B]/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden aspect-[16/9] md:aspect-[21/9] flex flex-col">
        <div className="h-12 border-b border-white/5 flex items-center px-6 gap-4 bg-white/[0.02]">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500/50" />
            <div className="w-3 h-3 rounded-full bg-amber-500/50" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
          </div>
          <div className="flex-1" />
          <div className="w-64 h-6 bg-white/5 rounded-md" />
          <div className="w-8 h-8 rounded-full bg-white/10 ml-4" />
        </div>

        <div className="flex-1 p-6 flex gap-6 overflow-hidden">
          <div className="w-48 hidden md:flex flex-col gap-2 border-r border-white/5 pr-6">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className="relative h-10 rounded-lg flex items-center px-3 gap-3 cursor-default"
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="sidebarActive"
                    className="absolute inset-0 bg-indigo-500/20 border border-indigo-500/30 rounded-lg"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <div
                  className={`w-4 h-4 rounded shadow-sm relative z-10 transition-colors duration-300 ${activeTab === tab.id ? "bg-indigo-400" : "bg-white/10"}`}
                />
                <div
                  className={`h-2.5 rounded-full relative z-10 transition-colors duration-300 ${tab.width} ${activeTab === tab.id ? "bg-indigo-100" : "bg-white/20"}`}
                />
              </div>
            ))}
          </div>

          <div className="flex-1 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex flex-col gap-6"
              >
                {activeTab === 0 && (
                  <>
                    <div className="flex gap-4 h-24 shrink-0">
                      {[
                        { color: "bg-indigo-500/20", delay: 0 },
                        { color: "bg-blue-500/20", delay: 0.1 },
                        {
                          color: "bg-emerald-500/20",
                          delay: 0.2,
                          hideSm: true,
                        },
                      ].map((card, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: card.delay }}
                          className={`flex-1 bg-white/5 rounded-xl border border-white/5 p-4 flex flex-col justify-between ${card.hideSm ? "hidden sm:flex" : ""}`}
                        >
                          <div
                            className={`w-8 h-8 rounded-lg ${card.color} mb-2`}
                          />
                          <div className="w-1/2 h-3 bg-white/10 rounded" />
                        </motion.div>
                      ))}
                    </div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="flex-1 bg-white/5 rounded-xl border border-white/5 p-5 flex flex-col gap-4 overflow-hidden"
                    >
                      <div className="w-32 h-4 bg-white/10 rounded shrink-0" />
                      <div className="flex-1 border-t border-white/5 pt-4 flex items-end gap-3">
                        {[30, 50, 40, 70, 60, 90, 80].map((h, i) => (
                          <motion.div
                            key={i}
                            initial={{ height: 0 }}
                            animate={{ height: `${h}%` }}
                            transition={{ delay: 0.4 + i * 0.05 }}
                            className="flex-1 bg-gradient-to-t from-indigo-500/40 to-indigo-400/10 rounded-t-md border-t border-indigo-400/50"
                          />
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}

                {activeTab === 1 && (
                  <div className="flex-1 bg-white/5 rounded-xl border border-white/5 p-5 flex flex-col gap-4 overflow-hidden">
                    <div className="w-40 h-5 bg-white/10 rounded mb-2 shrink-0" />
                    <div className="flex flex-col gap-3">
                      {[1, 2, 3, 4].map((row, i) => (
                        <motion.div
                          key={row}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="h-14 rounded-lg bg-white/5 border border-white/5 flex items-center px-4 gap-4 shrink-0"
                        >
                          <div className="w-8 h-8 rounded-full bg-white/10" />
                          <div className="w-32 h-3 bg-white/10 rounded" />
                          <div className="flex-1" />
                          <div className="w-16 h-4 bg-emerald-500/20 border border-emerald-500/30 rounded-full" />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 2 && (
                  <div className="flex-1 flex gap-4 overflow-hidden">
                    {[1, 2, 3].map((col, i) => (
                      <motion.div
                        key={col}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`flex-1 bg-white/5 rounded-xl border border-white/5 p-4 flex flex-col gap-3 ${i === 2 ? "hidden sm:flex" : ""}`}
                      >
                        <div className="w-20 h-4 bg-white/10 rounded mb-2 shrink-0" />
                        {[1, 2].map((card) => (
                          <div
                            key={card}
                            className="h-24 bg-white/5 rounded-lg border border-white/5 p-3 flex flex-col gap-2 shrink-0"
                          >
                            <div className="w-full h-3 bg-white/10 rounded" />
                            <div className="w-2/3 h-3 bg-white/10 rounded" />
                            <div className="mt-auto flex justify-between">
                              <div className="w-6 h-6 rounded-full bg-white/10" />
                              <div className="w-12 h-4 bg-white/5 rounded" />
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    ))}
                  </div>
                )}

                {activeTab === 3 && (
                  <div className="flex-1 flex gap-6 overflow-hidden">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-1/3 bg-white/5 rounded-xl border border-white/5 p-6 flex flex-col items-center gap-4 hidden sm:flex"
                    >
                      <div className="w-24 h-24 rounded-full bg-indigo-500/20 border-4 border-white/5 mt-4" />
                      <div className="w-32 h-4 bg-white/10 rounded" />
                      <div className="w-20 h-3 bg-white/5 rounded" />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex-1 bg-white/5 rounded-xl border border-white/5 p-6 flex flex-col gap-6"
                    >
                      <div className="w-40 h-5 bg-white/10 rounded shrink-0" />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="h-10 bg-white/5 rounded-lg border border-white/5" />
                        <div className="h-10 bg-white/5 rounded-lg border border-white/5" />
                        <div className="h-10 bg-white/5 rounded-lg border border-white/5 col-span-2" />
                      </div>
                      <div className="mt-auto h-10 w-32 bg-indigo-500/20 border border-indigo-500/30 rounded-lg self-end shrink-0" />
                    </motion.div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-[#09090B] to-transparent pointer-events-none" />
      </div>
    </motion.div>
  );
};

// --- Main Landing Page ---
const Landing = () => {
  const { admin } = useAuth();

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "auto";
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#09090B] text-white flex flex-col font-sans overflow-x-hidden relative selection:bg-indigo-500/30">
      <PublicNavbar />

      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[80vw] md:w-[1000px] h-[600px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

      <main className="flex-1 pt-32 pb-20 px-4 md:px-6 relative z-10 w-full">
        <div className="max-w-7xl mx-auto text-center w-full">
          {/* HERO SECTION */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="mb-24 max-w-5xl mx-auto mt-8 relative"
          >
            <motion.div
              variants={fadeUpVariant}
              className="flex justify-center mb-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span className="text-zinc-300 text-xs font-medium tracking-wide font-mono uppercase">
                  System Operational · v2.0 Live
                </span>
              </div>
            </motion.div>

            <motion.h1
              variants={fadeUpVariant}
              className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter mb-6 text-white leading-[1.1]"
            >
              Unified Industrial <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">
                Intelligence
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUpVariant}
              className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto font-normal leading-relaxed mb-10"
            >
              Securely orchestrate the manufacturing floor and track your global
              logistics fleet with our state-of-the-art enterprise architecture.
            </motion.p>

            <motion.div
              variants={fadeUpVariant}
              className="flex flex-col sm:flex-row justify-center items-center gap-4 px-4"
            >
              <Link
                to={admin ? "/enterprise/dashboard" : "/login"}
                className="w-full sm:w-auto"
              >
                <button className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-zinc-200 text-[#09090B] rounded-xl text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.15)]">
                  Get Started <ArrowRight size={16} />
                </button>
              </Link>
              <button className="w-full sm:w-auto px-8 py-3.5 bg-zinc-900/50 hover:bg-zinc-800 border border-white/10 text-white rounded-xl text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 backdrop-blur-md">
                <PlayCircle size={18} className="text-zinc-400" /> Book a Demo
              </button>
            </motion.div>
          </motion.div>

          {/* ANIMATED DASHBOARD INSERTED HERE */}
          <AnimatedDashboard />

          {/* Core Modules Cards */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-40 max-w-5xl mx-auto px-4"
          >
            <PortalCard
              title="Enterprise Hub"
              desc="Comprehensive oversight of production cycles, dynamic inventory, and active workforce tracking grids."
              icon={Factory}
              theme="indigo"
              link={admin ? "/enterprise/dashboard" : "/login"}
            />
            <PortalCard
              title="Transport Node"
              desc="Real-time geo-tracking of heavy fleet logistics, automated fuel analytics, and route auditing."
              icon={Truck}
              theme="blue"
              link={admin ? "/transportation/dashboard" : "/login"}
            />
          </motion.div>

          {/* PREMIUM SERVICES SECTION */}
          <motion.section
            id="services"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="mb-40 px-4 max-w-7xl mx-auto scroll-mt-32"
          >
            <motion.div
              variants={fadeUpVariant}
              className="text-center mb-16 md:mb-20"
            >
              <span className="text-indigo-400 text-[10px] font-bold uppercase tracking-widest font-mono mb-4 block">
                Physical Infrastructure
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tighter">
                Core Services
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              <ServiceCard
                icon={Building2}
                title="Brick Manufacturing"
                desc="Premium quality Fly Ash Bricks and Paver Blocks manufactured in our state-of-the-art facility ensuring high strength and durability."
              />
              <ServiceCard
                icon={Construction}
                title="Earthmovers & JCB"
                desc="Reliable heavy machinery rentals including JCBs and excavators for construction, digging, and site preparation projects."
              />
              <ServiceCard
                icon={Tractor}
                title="Heavy Logistics"
                desc="A robust fleet of trucks and heavy vehicles providing safe, timely, and efficient transportation of materials across regions."
              />
            </div>
          </motion.section>

          {/* BENTO GRID ARCHITECTURE SECTION */}
          <motion.section
            id="features"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="mb-40 px-4 max-w-6xl mx-auto scroll-mt-32"
          >
            <motion.div variants={fadeUpVariant} className="text-left mb-12">
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter">
                Architecture & Features
              </h2>
              <p className="text-zinc-400 mt-4 text-lg">
                Enterprise-grade systems designed for absolute scale.
              </p>
            </motion.div>

            {/* Asymmetrical Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Row 1: Span 2 + Span 1 */}
              <BentoCard
                className="md:col-span-2"
                title="Enterprise Security"
                desc="Granular role-based access controls and encrypted session management ensure your operational data remains strictly confidential and compliant."
                icon={ShieldCheck}
                glowColor="bg-indigo-500/20"
                iconColor="text-indigo-400"
                hoverBorder="group-hover:border-t-indigo-500"
              />

              <BentoCard
                className="md:col-span-1"
                title="Real-Time Sync"
                desc="State mutations and logistics updates propagate across your organization instantly."
                icon={Zap}
                glowColor="bg-blue-500/20"
                iconColor="text-blue-400"
                hoverBorder="group-hover:border-t-blue-500"
              />

              {/* Row 2: Span 1 + Span 2 */}
              <BentoCard
                className="md:col-span-1"
                title="Deep Analytics"
                desc="Visual throughput charting and efficiency auditing for continuous improvement."
                icon={BarChart3}
                glowColor="bg-emerald-500/20"
                iconColor="text-emerald-400"
                hoverBorder="group-hover:border-t-emerald-500"
              />

              <BentoCard
                className="md:col-span-2"
                title="Unified Workforce Matrix"
                desc="Centralized node for tracking shift attendance, streaming payroll calculations, and managing human resource allocations effortlessly."
                icon={Users}
                glowColor="bg-purple-500/20"
                iconColor="text-purple-400"
                hoverBorder="group-hover:border-t-purple-500"
              />
            </div>
          </motion.section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

// --- Portal Card (Main Hero Modules) ---
const PortalCard = ({ title, desc, icon: Icon, theme, link }) => {
  const themes = {
    indigo: "hover:border-indigo-500/30 hover:bg-indigo-500/[0.02]",
    blue: "hover:border-blue-500/30 hover:bg-blue-500/[0.02]",
  };

  return (
    <motion.div variants={fadeUpVariant} className="h-full relative group">
      <Link to={link} className="block h-full relative z-10">
        <div
          className={`p-8 md:p-10 h-full rounded-[2.5rem] bg-[#121214] border border-white/5 transition-all duration-300 overflow-hidden relative flex flex-col justify-start ${themes[theme]}`}
        >
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 text-white mb-8 group-hover:scale-110 transition-transform duration-500">
              <Icon size={28} strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-white mb-4 tracking-tighter">
              {title}
            </h3>
            <p className="text-zinc-400 text-base leading-relaxed font-medium mb-12">
              {desc}
            </p>
          </div>
          <div className="mt-auto relative z-10 flex items-center gap-2 text-sm font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-widest">
            Explore Module{" "}
            <ChevronRight
              size={16}
              className="transition-transform group-hover:translate-x-1"
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

// --- Upgraded Service Card ---
const ServiceCard = ({ icon: Icon, title, desc }) => (
  <motion.div
    variants={fadeUpVariant}
    className="group relative p-8 md:p-10 rounded-[2rem] bg-[#0c0c0e] border border-white/5 hover:border-white/10 transition-all duration-500 flex flex-col items-start overflow-hidden shadow-xl"
  >
    {/* Subtle gradient hover background */}
    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

    <div className="w-14 h-14 rounded-2xl bg-[#18181B] border border-white/10 flex items-center justify-center text-zinc-400 mb-8 transition-all duration-500 group-hover:text-white group-hover:border-white/20 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] relative z-10">
      <Icon size={26} strokeWidth={1.5} />
    </div>

    <h3 className="text-xl font-bold text-white mb-4 tracking-tight relative z-10">
      {title}
    </h3>
    <p className="text-sm font-medium text-zinc-500 leading-relaxed relative z-10">
      {desc}
    </p>

    {/* Decorative bottom line */}
    <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
  </motion.div>
);

// --- New Bento Box Component for Architecture ---
const BentoCard = ({
  className,
  title,
  desc,
  icon: Icon,
  glowColor,
  iconColor,
  hoverBorder,
}) => (
  <motion.div
    variants={fadeUpVariant}
    className={`relative group p-8 md:p-10 rounded-[2rem] bg-[#0c0c0e] border border-white/5 overflow-hidden flex flex-col transition-all duration-500 border-t-2 border-t-transparent ${hoverBorder} ${className}`}
  >
    {/* Animated glowing top border light */}
    <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

    {/* Soft background glow */}
    <div
      className={`absolute top-0 right-0 w-64 h-64 ${glowColor} blur-[100px] rounded-full pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-500`}
    />

    <div
      className={`w-12 h-12 mb-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center ${iconColor} relative z-10 shadow-inner group-hover:scale-110 transition-transform duration-500`}
    >
      <Icon size={24} strokeWidth={1.5} />
    </div>

    <div className="relative z-10 mt-auto">
      <h4 className="text-xl font-bold text-white mb-3 tracking-tight">
        {title}
      </h4>
      <p className="text-zinc-400 text-sm font-medium leading-relaxed">
        {desc}
      </p>
    </div>
  </motion.div>
);

// --- Professional Corporate Footer ---
const PublicFooter = () => {
  const addressQuery = encodeURIComponent(
    "Sundarpur, Chandaka, Khordha, Odisha",
  );
  const mapUrl = `https://maps.google.com/maps?q=${addressQuery}&t=&z=14&ie=UTF8&iwloc=&output=embed`;

  return (
    <footer className="bg-[#09090B] border-t border-white/5 pt-20 pb-8 px-6 relative z-20">
      <div className="max-w-7xl mx-auto">
        <div className="mb-24 flex flex-col lg:flex-row gap-16 justify-between items-center">
          <div className="flex-1 text-center lg:text-left">
            <h3 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-4">
              Operation Center
            </h3>
            <p className="text-zinc-400 mb-8 max-w-md mx-auto lg:mx-0 font-medium">
              Track your fleet and manage assets from our central command hub.
            </p>
            <div className="inline-flex items-center gap-3 bg-white/5 px-5 py-3 rounded-xl border border-white/10">
              <MapPin size={20} className="text-zinc-400" />
              <p className="text-sm font-medium text-zinc-300">
                At-Sundarpur, PO/PS-Chandaka, Dist-Khordha
              </p>
            </div>
          </div>

          <div className="flex-1 w-full max-w-lg">
            <div className="w-full h-[300px] rounded-3xl border border-white/10 overflow-hidden relative bg-[#121214]">
              <iframe
                src={mapUrl}
                width="100%"
                height="100%"
                style={{
                  border: 0,
                  filter:
                    "invert(90%) hue-rotate(180deg) brightness(85%) contrast(110%) sepia(10%) grayscale(50%)",
                }}
                allowFullScreen=""
                loading="lazy"
                title="Location"
                className="w-full h-full opacity-60 hover:opacity-100 transition-opacity duration-500 grayscale hover:grayscale-0"
              ></iframe>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold uppercase tracking-widest font-mono text-zinc-500">
          <p>Enterprise OS // v2.0</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-zinc-300 transition-colors cursor-pointer">
              Sys_Log
            </span>
            <span className="hover:text-zinc-300 transition-colors cursor-pointer">
              Security
            </span>
            <p>Developed BY Centurions27</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Landing;
