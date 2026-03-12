import React from "react";
import { ShieldCheck, Wifi, Activity } from "lucide-react";

const Footer = () => {
  return (
    <footer className="w-full bg-[#09090B] backdrop-blur-md border-t border-zinc-800 py-4 px-6 md:px-8 z-10">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Copyright */}
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
          <p className="text-[10px] md:text-xs text-zinc-500 font-mono uppercase tracking-widest">
            &copy; {new Date().getFullYear()} Enterprise Admin • v1.0.0
          </p>
        </div>

        {/* Right: System Status */}
        <div className="flex items-center gap-4 md:gap-6 text-[10px] md:text-xs font-medium text-zinc-500">
          <div className="flex items-center gap-1.5 hover:text-indigo-400 transition-colors cursor-help group">
            <ShieldCheck size={14} />
            <span className="hidden sm:inline group-hover:underline decoration-indigo-500/30 underline-offset-4">
              SECURE
            </span>
          </div>

          <div className="flex items-center gap-1.5 hover:text-indigo-400 transition-colors cursor-help group">
            <Wifi size={14} />
            <span className="hidden sm:inline group-hover:underline decoration-indigo-500/30 underline-offset-4">
              24ms
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-indigo-400/80">
            <Activity size={14} />
            <span className="tracking-wider">ONLINE</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
