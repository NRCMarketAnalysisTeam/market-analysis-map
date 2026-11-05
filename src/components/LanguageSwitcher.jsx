import React from "react";
import { LANGUAGES } from "../i18n/translations.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { trackEvent } from "../analytics.js";

export default function LanguageSwitcher() {
  const { lang, setLang, t } = useLanguage();

  return (
    <select
      className="language-switcher"
      value={lang}
      onChange={(e) => {
        if (e.target.value === lang) return;
        setLang(e.target.value);
        trackEvent("language_changed", { language: e.target.value });
      }}
      aria-label={t("language")}
      title={t("language")}
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
