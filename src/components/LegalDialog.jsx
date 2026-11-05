import React, { useEffect, useRef } from "react";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import {
  legal,
  LAST_UPDATED,
  PROJECT_CONTACT,
  DATA_PROTECTION_CONTACT,
} from "../i18n/legal.js";

// Strings from legal.js for the current language (English as fallback).
export function useLegal() {
  const { lang } = useLanguage();
  return legal[lang] || legal.en;
}

// Turns the {projectContact} / {dpContact} placeholders into mailto links.
function withLinks(text) {
  const parts = text.split(/(\{projectContact\}|\{dpContact\})/);
  return parts.map((part, i) => {
    if (part === "{projectContact}" || part === "{dpContact}") {
      const email = part === "{projectContact}" ? PROJECT_CONTACT : DATA_PROTECTION_CONTACT;
      return (
        <a key={i} href={`mailto:${email}`} dir="ltr">
          {email}
        </a>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function formatDate(iso, lang) {
  try {
    return new Intl.DateTimeFormat(lang, { dateStyle: "long" }).format(new Date(iso + "T12:00:00"));
  } catch {
    return iso;
  }
}

// Terms of use and privacy notice in one panel with two tabs.
// `page` is "terms" or "privacy"; onSwitch changes tab; onClose closes.
export default function LegalDialog({ page, onSwitch, onClose }) {
  const { lang } = useLanguage();
  const L = useLegal();
  const doc = L[page] || L.terms;
  const bodyRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [page]);

  return (
    <div className="legal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="legal-dialog" role="dialog" aria-modal="true" aria-labelledby="legal-title">
        <div className="legal-head">
          <div className="legal-tabs" role="tablist">
            {["terms", "privacy"].map((p) => (
              <button
                key={p}
                role="tab"
                aria-selected={page === p}
                className={"legal-tab" + (page === p ? " legal-tab--active" : "")}
                onClick={() => onSwitch(p)}
              >
                {p === "terms" ? L.termsLink : L.privacyLink}
              </button>
            ))}
          </div>
          <button className="legal-close" onClick={onClose} aria-label={L.close} title={L.close}>
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="legal-body" ref={bodyRef}>
          <h2 id="legal-title">{doc.title}</h2>
          <p className="legal-intro">{doc.intro}</p>
          {doc.sections.map((s) => (
            <section key={s.h}>
              <h3>{s.h}</h3>
              <p>{withLinks(s.p)}</p>
            </section>
          ))}
          <p className="legal-updated">
            {L.lastUpdated.replace("{date}", formatDate(LAST_UPDATED, lang))}
          </p>
        </div>
      </div>
    </div>
  );
}
