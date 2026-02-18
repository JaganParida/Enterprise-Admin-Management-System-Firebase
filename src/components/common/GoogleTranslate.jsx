import React, { useEffect } from "react";
import { Languages } from "lucide-react";

const GoogleTranslate = () => {
  useEffect(() => {
    // 1. Add the init function to the window object
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en", // Set your app's default language
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false,
        },
        "google_translate_element",
      );
    };

    // 2. Inject the Google Translate Script
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
    <div className="px-4 py-6 mt-auto border-t border-emerald-900/20 no-print">
      <div className="flex items-center gap-2 mb-3 px-2">
        <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-500">
          <Languages size={14} />
        </div>
        <p className="text-[10px] uppercase font-bold text-emerald-100/30 tracking-widest">
          Translate Page
        </p>
      </div>

      {/* The actual widget mounts here */}
      <div
        id="google_translate_element"
        className="custom-google-translate"
      ></div>

      <p className="text-[9px] text-emerald-100/20 mt-2 px-2 italic">
        * Powered by Google Translate
      </p>
    </div>
  );
};

export default GoogleTranslate;
