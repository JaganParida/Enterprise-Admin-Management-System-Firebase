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
  MousePointer2,
  LogOut,
  HandMetal,
  Construction,
  Building2,
  Tractor,
  ArrowRight,
  Lock,
} from "lucide-react";

// --- Simplified & Smooth Framer Motion Variants ---
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
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

// --- Updated Dev Support Data ---
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
          ? "bg-[#09090B]/80 backdrop-blur-xl border-b border-white/5 h-16 shadow-[0_10px_30px_rgba(0,0,0,0.5)]" 
          : "bg-transparent h-24 border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-full flex items-center justify-between relative">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          {/* Glassmorphism Logo */}
          <div className="w-10 h-10 relative flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl blur-[8px] opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative w-full h-full bg-zinc-900/50 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10 shadow-lg">
               <span className="font-black text-xl text-white tracking-tighter shadow-sm">E</span>
            </div>
          </div>
          <span className="font-bold text-lg md:text-xl text-white tracking-tight flex items-center gap-1.5 transition-all">
            Enterprise
            <span className="text-indigo-400 text-[10px] md:text-xs uppercase opacity-90 font-mono tracking-wider bg-indigo-500/10 px-2 flex items-center h-5 rounded-md border border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.1)]">
              OS
            </span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
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

        <div className="flex items-center gap-4">
          {admin ? (
            <>
              <Link to="/enterprise/dashboard" className="hidden sm:block">
                <button className="px-5 py-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-all hover:bg-indigo-500/20 hover:shadow-[0_0_15px_rgba(99,102,241,0.2)] active:scale-95">
                  Dashboard
                </button>
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="p-2.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all active:scale-95 border border-transparent hover:border-rose-500/20"
              >
                <LogOut size={20} />
              </button>
            </>
          ) : (
            <Link to="/login">
              <button className="px-5 md:px-7 py-2.5 bg-white hover:bg-zinc-200 text-[#09090B] rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95">
                Login
              </button>
            </Link>
          )}
        </div>

        {/* Support Modal (Command Palette Style) */}
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
                className="absolute top-24 right-4 md:right-6 w-[calc(100vw-32px)] md:w-[400px] max-w-[400px] bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-[24px] shadow-2xl p-5 z-50 overflow-hidden"
              >
                <div className="flex justify-between items-center mb-5 pb-5 border-b border-white/5">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <LifeBuoy size={16} className="text-zinc-400" /> Command Center
                    </h4>
                    <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest font-mono">
                      Direct Node Access
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSupport(false)}
                    className="text-zinc-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-xl border border-white/5"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex flex-col gap-2.5 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                  {supportDevelopers.map((dev) => (
                    <a
                      key={dev.id}
                      href={`https://wa.me/${dev.whatsapp}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3.5 rounded-[16px] transition-all group bg-black/20 border border-white/5 hover:bg-white/5 hover:border-white/10 relative overflow-hidden"
                    >
                      <div className="absolute inset-y-0 left-0 w-1 bg-[#25D366] opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex items-center gap-3.5 pl-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 shadow-inner group-hover:border-[#25D366]/30 group-hover:bg-[#25D366]/10">
                          <svg
                            viewBox="0 0 24 24"
                            width="20"
                            height="20"
                            className="fill-[#25D366]"
                          >
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <span className="block text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">
                            {dev.name}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] shadow-[0_0_5px_rgba(37,211,102,0.8)] animate-pulse"></span>
                            <span className="text-[10px] text-zinc-500 font-medium tracking-wide">
                              Online Node
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-600 transition-colors bg-black/40 px-2 py-1 rounded-md border border-white/5 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 duration-300">
                        CONNECT <ArrowRight size={10} className="inline ml-1"/>
                      </div>
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
    <div className="min-h-screen bg-[#09090B] text-white flex flex-col font-sans selection:bg-indigo-500/30 overflow-x-hidden relative">
      <PublicNavbar />

      {/* Decorative Grid Background */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `linear-gradient(to right, #4f4f4f12 1px, transparent 1px), linear-gradient(to bottom, #4f4f4f12 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Static Background Glows - High Performance (Softened) */}
      <div className="absolute top-0 left-1/4 w-[150vw] md:w-[800px] h-[800px] bg-indigo-500/5 blur-[120px] md:blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
      <div className="absolute top-[20%] right-0 w-[150vw] md:w-[600px] h-[600px] bg-blue-500/5 blur-[100px] md:blur-[120px] rounded-full pointer-events-none mix-blend-screen" />

      <main className="flex-1 pt-32 pb-20 px-4 md:px-6 relative z-10 overflow-hidden md:overflow-visible w-full">
        <div className="max-w-7xl mx-auto text-center w-full">
          
          {/* Hero Section */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="mb-32 max-w-5xl mx-auto px-4 mt-12 relative"
          >
            {/* Status Pill */}
            <motion.div
              variants={fadeUpVariant}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-8 backdrop-blur-md"
            >
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse outline outline-2 outline-indigo-500/30" />
              <span className="text-zinc-300 text-[11px] font-bold uppercase tracking-widest font-mono">
                System Operational · v2.0 Live
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUpVariant}
              className="text-4xl sm:text-5xl md:text-7xl lg:text-[6.5rem] font-black tracking-tighter mb-8 bg-gradient-to-br from-zinc-100 via-zinc-300 to-zinc-600 bg-clip-text text-transparent leading-[1.05] pb-2 drop-shadow-sm"
            >
              Unified Industrial <br className="hidden md:block" />{" "}
              Intelligence
            </motion.h1>

            <motion.p
              variants={fadeUpVariant}
              className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed"
            >
              Securely orchestrate the manufacturing floor and track your global logistics fleet with our state-of-the-art enterprise architecture.
            </motion.p>
            
            <motion.div 
               variants={fadeUpVariant}
               className="mt-10 md:mt-12 flex justify-center px-4"
            >
                <Link to={admin ? "/enterprise/dashboard" : "/login"} className="w-full sm:w-auto">
                    <button className="w-full sm:w-auto px-8 md:px-10 py-4 max-w-[300px] mx-auto bg-white hover:bg-zinc-200 text-[#09090B] rounded-2xl text-sm font-bold uppercase tracking-widest transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-95 flex items-center justify-center gap-2">
                        Get Started <ArrowRight size={18} />
                    </button>
                </Link>
            </motion.div>
          </motion.div>

          {/* Premium Portal Cards */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-40 max-w-5xl mx-auto px-4 perspective-1000"
          >
            <PortalCard
              title="Enterprise Hub"
              desc="Comprehensive oversight of production cycles, dynamic inventory, and active workforce tracking grids."
              icon={Factory}
              theme="indigo"
              link={admin ? "/enterprise/dashboard" : "/login"}
              badge="Module 01"
              bgImage="linear-gradient(to bottom right, rgba(99,102,241,0.05), transparent)"
            />
            <PortalCard
              title="Transport Node"
              desc="Real-time geo-tracking of heavy fleet logistics, automated fuel analytics, and route auditing."
              icon={Truck}
              theme="blue"
              link={admin ? "/transportation/dashboard" : "/login"}
              badge="Module 02"
              bgImage="linear-gradient(to bottom right, rgba(59,130,246,0.05), transparent)"
            />
          </motion.div>

          {/* Services Section */}
          <motion.section
            id="services"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="mb-40 px-4 max-w-7xl mx-auto scroll-mt-24"
          >
            <motion.div
              variants={fadeUpVariant}
              className="text-center mb-16 md:mb-24"
            >
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest font-mono mb-4 block">Our Operations</span>
              <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter">
                Core Assets
              </h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

          {/* Features Section (Bento Grid Style) */}
          <motion.section
            id="features"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="mb-32 px-4 max-w-6xl mx-auto scroll-mt-24"
          >
             <motion.div
              variants={fadeUpVariant}
              className="text-left mb-12"
            >
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter">
                Architecture
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 md:grid-rows-2 gap-4 md:gap-6 items-stretch">
              <div className="md:col-span-2 h-full relative group p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] bg-zinc-900/40 backdrop-blur-md border border-zinc-800 overflow-hidden flex flex-col justify-start">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none" />
                <div className="w-10 h-10 md:w-12 md:h-12 mb-6 rounded-xl md:rounded-2xl bg-black/40 border border-zinc-800 flex items-center justify-center text-indigo-400 relative z-10">
                    <ShieldCheck size={24} />
                </div>
                <div className="relative z-10">
                    <h4 className="text-xl md:text-2xl font-bold text-zinc-100 mb-2">Enterprise Security</h4>
                    <p className="text-zinc-400 font-medium">Granular role-based access controls and encrypted session management ensure zero-trust compliance.</p>
                </div>
              </div>

              <div className="h-full relative group p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] bg-zinc-900/40 backdrop-blur-md border border-zinc-800 overflow-hidden flex flex-col justify-start">
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 blur-[60px] rounded-full pointer-events-none" />
                <div className="w-10 h-10 md:w-12 md:h-12 mb-6 rounded-xl md:rounded-2xl bg-black/40 border border-zinc-800 flex items-center justify-center text-blue-400 relative z-10 shrink-0">
                    <Zap size={20} className="md:w-6 md:h-6" />
                </div>
                <div className="relative z-10 flex-1">
                    <h4 className="text-xl font-bold text-zinc-100 mb-2">Real-Time Sync</h4>
                    <p className="text-zinc-400 text-sm font-medium">State mutations propagate instantly.</p>
                </div>
              </div>

              <div className="h-full relative group p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] bg-zinc-900/40 backdrop-blur-md border border-zinc-800 overflow-hidden flex flex-col justify-start">
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 blur-[60px] rounded-full pointer-events-none" />
                <div className="w-10 h-10 md:w-12 md:h-12 mb-6 rounded-xl md:rounded-2xl bg-black/40 border border-zinc-800 flex items-center justify-center text-emerald-400 relative z-10 shrink-0">
                    <BarChart3 size={20} className="md:w-6 md:h-6" />
                </div>
                <div className="relative z-10 flex-1">
                    <h4 className="text-xl font-bold text-zinc-100 mb-2">Deep Analytics</h4>
                    <p className="text-zinc-400 text-sm font-medium">Visual throughput and efficiency charting.</p>
                </div>
              </div>

               <div className="md:col-span-2 h-full relative group p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] bg-zinc-900/40 backdrop-blur-md border border-zinc-800 overflow-hidden flex flex-col justify-start">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />
                <div className="w-10 h-10 md:w-12 md:h-12 mb-6 rounded-xl md:rounded-2xl bg-black/40 border border-zinc-800 flex items-center justify-center text-zinc-300 relative z-10 shrink-0">
                    <Users size={20} className="md:w-6 md:h-6" />
                </div>
                <div className="relative z-10 flex-1">
                    <h4 className="text-xl md:text-2xl font-bold text-zinc-100 mb-2">Unified Workforce Matrix</h4>
                    <p className="text-zinc-400 font-medium">Centralized node for tracking shift attendance, payroll streams, and human resource allocations.</p>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

// --- CSS Driven Glassmorphism Cards ---
const PortalCard = ({ title, desc, icon: Icon, theme, link, badge, bgImage }) => {
  const themes = {
    indigo: {
      shadow: "hover:shadow-[0_20px_40px_rgba(99,102,241,0.1)]",
      iconWrap: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 shadow-[inset_0_0_20px_rgba(99,102,241,0.2)]",
      arrow: "text-indigo-400",
      badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    },
    blue: {
      shadow: "hover:shadow-[0_20px_40px_rgba(59,130,246,0.1)]",
      iconWrap: "bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-[inset_0_0_20px_rgba(59,130,246,0.2)]",
      arrow: "text-blue-400",
      badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
  };
  const active = themes[theme];

  return (
    <motion.div variants={fadeUpVariant} className="h-full relative group perspective-1000">
      <Link to={link} className="block h-full relative z-10">
        <div
          className={`p-6 sm:p-8 md:p-12 h-full rounded-3xl md:rounded-[40px] bg-zinc-900/40 backdrop-blur-2xl border border-white/5 transition-all duration-500 group-hover:-translate-y-2 group-hover:border-white/10 overflow-hidden relative flex flex-col justify-start ${active.shadow}`}
        >
             {/* Inner Top Highlight */}
             <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
             
             {/* Optional decorative bg gradient */}
             <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style={{ background: bgImage }} />

             <div className="relative z-10">
                <div className="flex justify-between items-start mb-12">
                     <div
                        className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110 border ${active.iconWrap}`}
                    >
                        <Icon size={36} strokeWidth={1.5} />
                    </div>
                    <span
                        className={`text-[10px] uppercase font-bold px-3 py-1.5 rounded-lg border font-mono tracking-widest ${active.badge}`}
                    >
                        {badge}
                    </span>
                </div>
               
                <h3 className="text-3xl md:text-4xl font-black text-white mb-4 flex items-center gap-3 tracking-tighter">
                    {title}
                </h3>
                <p className="text-zinc-400 text-sm md:text-base leading-relaxed font-medium max-w-sm mt-auto">
                    {desc}
                </p>
            </div>
            
            <div className="mt-8 md:mt-12 relative z-10 flex items-center justify-end shrink-0">
                <div className={`w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:bg-white/10 ${active.arrow}`}>
                    <ChevronRight className="transition-transform duration-500" size={20}/>
                </div>
            </div>
        </div>
      </Link>
    </motion.div>
  );
};

const ServiceCard = ({ icon: Icon, title, desc }) => (
  <motion.div
    variants={fadeUpVariant}
    className="p-8 md:p-10 rounded-[32px] bg-zinc-900/20 backdrop-blur-md border border-white/5 hover:bg-zinc-900/40 hover:border-white/10 transition-all duration-500 group flex flex-col items-start relative overflow-hidden"
  >
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    <div className="w-14 h-14 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center text-zinc-400 mb-8 transition-all duration-500 group-hover:scale-110 group-hover:text-indigo-400 group-hover:border-indigo-500/30 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.2)]">
      <Icon size={26} strokeWidth={1.5} />
    </div>
    <h3 className="text-2xl font-bold text-white mb-4 tracking-tight relative z-10">
      {title}
    </h3>
    <p className="text-sm font-medium text-zinc-500 leading-relaxed relative z-10">{desc}</p>
  </motion.div>
);

// --- Updated Footer Component with Floating Panel ---
const PublicFooter = () => {
  const addressQuery = encodeURIComponent(
    "Sundarpur, Chandaka, Khordha, Odisha",
  );
  const mapUrl = `https://maps.google.com/maps?q=${addressQuery}&t=&z=14&ie=UTF8&iwloc=&output=embed`;

  const [isMapActive, setIsMapActive] = useState(false);
  const [isLaptop, setIsLaptop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsLaptop(window.innerWidth >= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <footer className="bg-[#09090B] border-t border-white/5 pt-24 pb-10 px-6 relative z-20">
      <div className="max-w-7xl mx-auto">
        <div className="mb-32">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10 text-center md:text-left">
            <div>
                 <span className="text-indigo-500 text-[10px] font-bold uppercase tracking-widest font-mono mb-3 flex items-center gap-2 justify-center md:justify-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" /> Live Node
                </span>
                <h3 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                   Operation Center
                </h3>
            </div>
            <div className="flex items-center gap-3 bg-zinc-900/50 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/5 mx-auto md:mx-0">
               <MapPin size={20} className="text-zinc-400" />
               <p className="text-xs font-medium text-zinc-300">
                  At-Sundarpur, PO/PS-Chandaka, Dist-Khordha
               </p>
            </div>
          </div>

          <div
            className="w-full h-[500px] rounded-[32px] border border-white/10 overflow-hidden relative group bg-black/40 shadow-2xl shadow-indigo-500/5"
            onMouseEnter={() => isLaptop && setIsMapActive(true)}
            onMouseLeave={() => isLaptop && setIsMapActive(false)}
            onClick={() => !isLaptop && setIsMapActive(true)}
          >
             {/* UI Top Bar for fake Map App */}
             <div className="absolute top-0 inset-x-0 h-12 bg-zinc-900/80 backdrop-blur-xl border-b border-white/5 flex items-center px-6 z-30 transition-opacity duration-300">
                <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/50 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                </div>
                <div className="mx-auto flex items-center gap-2 bg-black/40 px-3 py-1 rounded-md text-[10px] font-mono text-zinc-500 border border-white/5">
                    <Lock size={10} /> secure.geo-node.internal
                </div>
                <div className="w-10"></div> {/* Spacer */}
             </div>

            {!isMapActive && (
              <div className="absolute inset-0 top-12 z-20 cursor-pointer flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-500">
                <div className="bg-zinc-900/90 border border-white/10 px-8 py-5 rounded-2xl flex flex-col items-center gap-4 shadow-2xl">
                  <div className="w-12 h-12 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center">
                    {isLaptop ? (
                        <MousePointer2 className="text-white" size={24} />
                    ) : (
                        <HandMetal className="text-white" size={24} />
                    )}
                  </div>
                  <span className="text-xs font-bold text-zinc-300 tracking-[0.2em] uppercase font-mono">
                    {isLaptop ? "Hover to Initiate" : "Tap to Initiate"}
                  </span>
                </div>
              </div>
            )}
            <iframe
              src={mapUrl}
              width="100%"
              height="100%"
              style={{
                border: 0,
                filter: "invert(100%) hue-rotate(180deg) brightness(85%) contrast(110%) sepia(20%) grayscale(20%)",
              }}
              allowFullScreen=""
              loading="lazy"
              title="Location"
              className={`w-full h-full pt-12 transition-all duration-1000 ${isMapActive ? "opacity-100" : "opacity-40 blur-sm"}`}
            ></iframe>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] uppercase font-bold tracking-widest text-zinc-600 font-mono">
          <p>Enterprise OS // v2.0</p>
          <div className="flex items-center gap-4">
              <span className="hover:text-zinc-300 transition-colors cursor-pointer">Sys_Log</span>
              <span className="hover:text-zinc-300 transition-colors cursor-pointer">Security</span>
              <p>Developed BY Centurions27</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Landing;
