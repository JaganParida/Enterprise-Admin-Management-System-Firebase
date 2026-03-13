import React, { useEffect } from "react";
import { Languages } from "lucide-react";
import { useLocation } from "react-router-dom";

const GoogleTranslate = () => {
  const location = useLocation();

  const currentPath =
    typeof window !== "undefined" && location.pathname === "/"
      ? window.location.pathname
      : location.pathname;
  const isTransport = currentPath.includes("/transportation");

  const colors = isTransport 
    ? "text-blue-500" 
    : "text-indigo-500";
  useEffect(() => {
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false,
        },
        "google_translate_element",
      );
    };

    const scriptId = "google-translate-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src =
        "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div className="px-4 py-6 mt-auto border-t border-white/5 no-print">
      <div className="flex items-center gap-2 mb-3 px-2">
        <div className={colors}>
          <Languages size={16} />
        </div>
        <p className="text-xs font-semibold text-zinc-400 tracking-wide">
          Translate Page
        </p>
      </div>

      <div
        id="google_translate_element"
        className="custom-google-translate opacity-80 mix-blend-screen"
      ></div>

      <p className="text-[10px] text-zinc-500 mt-2 px-2">
        Powered by Google Translate
      </p>
    </div>
  );
};

export default GoogleTranslate;
