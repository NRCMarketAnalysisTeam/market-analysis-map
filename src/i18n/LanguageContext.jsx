import React, { createContext, useContext, useMemo, useState } from "react";
import { translations, RTL_LANGUAGES } from "./translations.js";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("en");

  const dir = RTL_LANGUAGES.includes(lang) ? "rtl" : "ltr";

  const t = useMemo(() => {
    return (key, vars) => {
      const dict = translations[lang]?.ui || {};
      let str = dict[key] ?? translations.en.ui[key] ?? key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          str = str.split(`{${k}}`).join(v);
        });
      }
      return str;
    };
  }, [lang]);

  const tIcon = useMemo(
    () => (iconId) => translations[lang]?.icons?.[iconId] ?? translations.en.icons?.[iconId] ?? iconId,
    [lang]
  );

  const tCategory = useMemo(
    () => (catId) => translations[lang]?.categories?.[catId] ?? translations.en.categories?.[catId] ?? catId,
    [lang]
  );

  const tColor = useMemo(
    () => (color) => t(`color${color.charAt(0).toUpperCase()}${color.slice(1)}`),
    [t]
  );

  const value = { lang, setLang, dir, t, tIcon, tCategory, tColor };

  return (
    <LanguageContext.Provider value={value}>
      <div dir={dir} lang={lang} className="i18n-root">
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
