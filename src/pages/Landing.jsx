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
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 w-full z-50 bg-[#09090B]/80 backdrop-blur-xl border-b border-zinc-800/80 h-20 transition-all">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between relative">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
            E
          </div>
          <span className="font-bold text-lg md:text-xl text-white tracking-tight">
            Enterprise{" "}
            <span className="text-indigo-400 text-[10px] md:text-xs uppercase ml-1 opacity-90 font-mono tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
              OS
            </span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-10 text-sm font-medium text-zinc-400">
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
                className="p-2.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all active:scale-95"
              >
                <LogOut size={20} />
              </button>
            </>
          ) : (
            <Link to="/login">
              <button className="px-5 md:px-7 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-indigo-900/20 active:scale-95">
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
                className="fixed inset-0 z-40 w-screen h-screen"
                onClick={() => setShowSupport(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute top-20 right-6 w-[340px] md:w-[380px] bg-[#09090B] border border-zinc-800 rounded-2xl shadow-2xl p-5 z-50 overflow-hidden"
              >
                <div className="flex justify-between items-center mb-4 border-b border-zinc-800/80 pb-4">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <LifeBuoy size={16} className="text-indigo-400" /> Support
                      Team
                    </h4>
                    <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">
                      Direct WhatsApp Support
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSupport(false)}
                    className="text-zinc-500 hover:text-white transition-colors bg-zinc-900 hover:bg-zinc-800 p-2 rounded-xl border border-zinc-800"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                  {supportDevelopers.map((dev) => (
                    <a
                      key={dev.id}
                      href={`https://wa.me/${dev.whatsapp}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3.5 rounded-xl transition-all group bg-zinc-900/50 border border-zinc-800/80 hover:bg-zinc-800 hover:border-zinc-700"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20">
                          <svg
                            viewBox="0 0 24 24"
                            width="20"
                            height="20"
                            fill="currentColor"
                          >
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <span className="block text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">
                            {dev.name}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)] animate-pulse"></span>
                            <span className="text-[10px] text-zinc-400 font-medium tracking-wide">
                              Available
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-[11px] font-mono text-zinc-500 group-hover:text-[#25D366] transition-colors">
                        {dev.phone}
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

      {/* Static Background Glows - High Performance */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none mix-blend-screen" />

      <main className="flex-1 pt-32 pb-20 px-6 relative z-10">
        <div className="max-w-7xl mx-auto text-center">
          {/* Hero Section */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="mb-24 max-w-4xl mx-auto px-4 mt-8"
          >
            <motion.span
              variants={fadeUpVariant}
              className="px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-widest mb-8 inline-block shadow-sm"
            >
              Enterprise ERP v1.0
            </motion.span>

            <motion.h1
              variants={fadeUpVariant}
              className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter mb-8 bg-gradient-to-b from-white via-indigo-50 to-indigo-500/30 bg-clip-text text-transparent leading-[1.1] pb-2"
            >
              Unified Industrial <br className="hidden md:block" />{" "}
              Intelligence.
            </motion.h1>

            <motion.p
              variants={fadeUpVariant}
              className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed"
            >
              Securely orchestrate manufacturing and global logistics fleet with
              our state-of-the-art enterprise management ecosystem.
            </motion.p>
          </motion.div>

          {/* Portal Cards */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-40 max-w-5xl mx-auto px-4"
          >
            <PortalCard
              title="Enterprise Hub"
              desc="Production, inventory, and workforce management."
              icon={Factory}
              theme="indigo"
              link={admin ? "/enterprise/dashboard" : "/login"}
              badge="Production"
            />
            <PortalCard
              title="Transportation"
              desc="Real-time fleet tracking and fuel analytics."
              icon={Truck}
              theme="blue"
              link={admin ? "/transportation/dashboard" : "/login"}
              badge="Logistics"
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
              className="text-center mb-16 md:mb-20"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                Our Core Services
              </h2>
              <p className="text-zinc-500 text-sm max-w-xl mx-auto">
                Comprehensive industrial solutions spanning manufacturing,
                earthmoving, and heavy logistics.
              </p>
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

          {/* Features Section */}
          <motion.section
            id="features"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="mb-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4 scroll-mt-24"
          >
            <FeatureItem
              icon={ShieldCheck}
              title="Role Security"
              desc="Granular access controls ensure data integrity."
            />
            <FeatureItem
              icon={Zap}
              title="Real-Time Sync"
              desc="Updates propagate instantly across dashboards."
            />
            <FeatureItem
              icon={BarChart3}
              title="Deep Analytics"
              desc="Visual charts for efficiency trends."
            />
            <FeatureItem
              icon={Users}
              title="Workforce"
              desc="Track attendance and payroll in one module."
            />
          </motion.section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

// --- CSS Driven Smooth Cards ---
const PortalCard = ({ title, desc, icon: Icon, theme, link, badge }) => {
  const themes = {
    indigo: {
      wrapper:
        "hover:border-indigo-500/50 hover:shadow-[0_8px_30px_rgba(99,102,241,0.15)]",
      iconBg: "bg-indigo-500/10 text-indigo-400",
      arrow: "text-indigo-400",
      badge: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
    },
    blue: {
      wrapper:
        "hover:border-blue-500/50 hover:shadow-[0_8px_30px_rgba(59,130,246,0.15)]",
      iconBg: "bg-blue-500/10 text-blue-400",
      arrow: "text-blue-400",
      badge: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    },
  };
  const activeTheme = themes[theme];

  return (
    <motion.div variants={fadeUpVariant} className="h-full">
      <Link to={link} className="group block h-full">
        <div
          className={`p-8 md:p-10 h-full rounded-[32px] bg-zinc-900/40 border border-zinc-800/60 transition-all duration-300 group-hover:-translate-y-2 ${activeTheme.wrapper}`}
        >
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-transform duration-300 group-hover:scale-110 ${activeTheme.iconBg}`}
          >
            <Icon size={32} />
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 flex items-center gap-3">
            {title}
            <ChevronRight
              className={`opacity-0 -translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 ${activeTheme.arrow}`}
            />
          </h3>
          <p className="text-zinc-500 text-sm md:text-base mb-8 leading-relaxed">
            {desc}
          </p>
          <span
            className={`text-[10px] uppercase font-bold px-3 py-1.5 rounded-lg border ${activeTheme.badge}`}
          >
            {badge}
          </span>
        </div>
      </Link>
    </motion.div>
  );
};

const ServiceCard = ({ icon: Icon, title, desc }) => (
  <motion.div
    variants={fadeUpVariant}
    className="p-8 rounded-[32px] bg-zinc-900/30 border border-zinc-800/60 hover:border-indigo-500/40 transition-all duration-300 group flex flex-col items-center text-center hover:bg-zinc-900/50"
  >
    <div className="w-16 h-16 rounded-2xl bg-[#09090B] border border-zinc-800 flex items-center justify-center text-indigo-400 mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-1 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]">
      <Icon size={32} />
    </div>
    <h3 className="text-xl font-bold text-white mb-4 transition-colors duration-300 group-hover:text-indigo-400">
      {title}
    </h3>
    <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
  </motion.div>
);

const FeatureItem = ({ icon: Icon, title, desc }) => (
  <motion.div
    variants={fadeUpVariant}
    className="p-8 rounded-[32px] bg-zinc-900/30 border border-zinc-800/60 hover:border-indigo-500/30 transition-all duration-300 group hover:shadow-[0_0_25px_rgba(99,102,241,0.05)]"
  >
    <div className="w-12 h-12 rounded-xl bg-[#09090B] border border-zinc-800 flex items-center justify-center text-indigo-400 mb-6 transition-transform duration-300 group-hover:scale-110">
      <Icon size={24} />
    </div>
    <h4 className="text-lg font-bold text-white mb-3 transition-colors duration-300 group-hover:text-indigo-400">
      {title}
    </h4>
    <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
  </motion.div>
);

// --- Updated Footer Component with Hardcoded Location ---
const PublicFooter = () => {
  // Directly point to the fixed Google Maps query
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
    <footer className="bg-[#09090B] border-t border-zinc-800/60 pt-20 pb-10 px-6 relative z-20">
      <div className="max-w-7xl mx-auto">
        <div className="mb-24">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 text-center md:text-left">
            <div className="flex items-center gap-3 justify-center md:justify-start">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                <MapPin size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  Operation Center
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  At-Sundarpur, PO/PS-Chandaka, Dist-Khordha
                </p>
              </div>
            </div>
            <span className="px-4 py-1.5 rounded-full bg-zinc-900/50 border border-zinc-800 text-indigo-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mx-auto md:mx-0 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />{" "}
              Live Node
            </span>
          </div>

          <div
            className="w-full h-[450px] rounded-[32px] border border-zinc-800/60 overflow-hidden relative group bg-zinc-900"
            onMouseEnter={() => isLaptop && setIsMapActive(true)}
            onMouseLeave={() => isLaptop && setIsMapActive(false)}
            onClick={() => !isLaptop && setIsMapActive(true)}
          >
            {!isMapActive && (
              <div className="absolute inset-0 z-20 cursor-pointer flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm transition-all duration-500">
                <div className="bg-[#09090B] border border-zinc-800 px-8 py-4 rounded-2xl flex flex-col items-center gap-3 shadow-xl">
                  {isLaptop ? (
                    <MousePointer2 className="text-indigo-400" size={24} />
                  ) : (
                    <HandMetal className="text-indigo-400" size={24} />
                  )}
                  <span className="text-xs font-bold text-white tracking-widest uppercase">
                    {isLaptop ? "Hover to Interact" : "Tap to Interact"}
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

        <div className="border-t border-zinc-800/60 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] uppercase font-bold tracking-widest text-zinc-500">
          <p>© 2026 Enterprise OS.</p>
          <p>Developed by Centurions27</p>
        </div>
      </div>
    </footer>
  );
};

export default Landing;
