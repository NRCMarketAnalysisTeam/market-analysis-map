import React from "react";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const sections = [
  "helpPlaceIcon",
  "helpEditMarket",
  "helpDrawLine",
  "helpMeasure",
  "helpCirclesLabels",
  "helpFindLocation",
  "helpIconSize",
  "helpLockMap",
  "helpEditDelete",
  "helpDownloadPng",
];

export default function HelpOverlay({ onClose }) {
  const { t } = useLanguage();

  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="help-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="help-panel" tabIndex="-1">
        <header className="help-header">
          <div>
            <p className="help-eyebrow">{t("helpEyebrow")}</p>
            <h1 id="help-title">{t("howToUse")}</h1>
            <p className="help-intro">
              {t("helpIntro")}
            </p>
          </div>
          <button className="help-close" onClick={onClose} aria-label={t("closeHelp")}>
            {t("closeHelp")}
          </button>
        </header>
        <div className="help-grid">
          {sections.map((section, index) => (
            <article className="help-card" key={section}>
              <span className="help-number">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h2>{t(`${section}Title`)}</h2>
                <p>{t(`${section}Body`)}</p>
              </div>
            </article>
          ))}
        </div>
        <button className="tool-btn tool-btn--primary help-return" onClick={onClose}>
          {t("returnToMap")}
        </button>
      </section>
    </div>
  );
}