import React, { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { ICON_SETS } from "../icons.js";
import LanguageSwitcher from "./LanguageSwitcher.jsx";
import EuEmblem, { ECHO_URL } from "./EuEmblem.jsx";
import { useLegal } from "./LegalDialog.jsx";

const PROJECT_URL =
  "https://www.nrc.no/what-we-do/projects-and-programmes/market-analysis-building-stronger-aid-programmes";
const CONTACT_EMAIL = "ho.marketanalysis@nrc.no";
const OCHA_ICONS_URL = "https://github.com/UN-OCHA/humanitarian-icons";

// A few recognisable icons shown on each edition card, so the difference
// between the two editions is visible before choosing.
const PREVIEW_IDS = ["market", "source-market", "people-in-need", "checkpoint", "flood", "road-closed"];

// NRC logo: drop the official file from identity.nrc.no into
// public/brand/nrc-logo.svg (or .png). Until a file is there, the full
// organisation name is shown as text instead of a broken image.
// BASE_URL keeps the paths working both at marketanalysismap.com and at a
// GitHub Pages address such as <account>.github.io/market-analysis-map/.
const LOGO_CANDIDATES = ["brand/nrc-logo.svg", "brand/nrc-logo.png"].map((f) => import.meta.env.BASE_URL + f);

function NrcLogo() {
  const [idx, setIdx] = useState(0);
  if (idx >= LOGO_CANDIDATES.length) {
    return <span className="landing-org-name">Norwegian Refugee Council</span>;
  }
  return (
    <img
      className="landing-logo"
      src={LOGO_CANDIDATES[idx]}
      alt="Norwegian Refugee Council"
      onError={() => setIdx((i) => i + 1)}
    />
  );
}

function FeatureIcon() {
  return (
    <svg className="landing-feature-icon" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="10" />
      <path d="M5.5 10.5l3 3 6-7" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EditionCard({ edition, title, body, cta, onChoose }) {
  const { tIcon } = useLanguage();
  const set = ICON_SETS[edition];
  return (
    <article className={`edition-card edition-card--${edition}`}>
      <div className="edition-card-preview" aria-hidden="true">
        {PREVIEW_IDS.map((id) => (
          <img key={id} src={set.ICONS_BY_ID[id].url} alt="" title={tIcon(id)} />
        ))}
      </div>
      <div className="edition-card-body">
        <h3>{title}</h3>
        <p>{body}</p>
        <button className="edition-card-cta" onClick={() => onChoose(edition)}>
          {cta}
          <span aria-hidden="true" className="edition-card-arrow">&rarr;</span>
        </button>
      </div>
    </article>
  );
}

export default function LandingPage({ onChoose, onLegal }) {
  const { t } = useLanguage();
  const L = useLegal();

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-logos">
          <NrcLogo />
          <EuEmblem text={t("fundedByEu")} height={40} />
        </div>
        <LanguageSwitcher />
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <h1>{t("appName")}</h1>
          <p className="landing-subtitle">{t("landingSubtitle")}</p>

          <h2 className="landing-h2">{t("landingFeaturesTitle")}</h2>
          <ul className="landing-features">
            {["landingFeature1", "landingFeature2", "landingFeature3", "landingFeature4"].map((k) => (
              <li key={k}>
                <FeatureIcon />
                <span>{t(k)}</span>
              </li>
            ))}
          </ul>
          <p className="landing-languages">{t("landingLanguages")}</p>
        </section>

        <section className="landing-editions" aria-labelledby="choose-edition">
          <h2 id="choose-edition" className="landing-h2">{t("chooseEdition")}</h2>
          <p className="landing-hint">{t("chooseEditionHint")}</p>
          <div className="edition-grid">
            <EditionCard
              edition="humanitarian"
              title={t("editionHumTitle")}
              body={t("editionHumBody")}
              cta={t("editionHumCta")}
              onChoose={onChoose}
            />
            <EditionCard
              edition="nrc"
              title={t("editionNrcTitle")}
              body={t("editionNrcBody")}
              cta={t("editionNrcCta")}
              onChoose={onChoose}
            />
          </div>
        </section>

        <section className="landing-about">
          <div className="landing-about-text">
            <h2 className="landing-h2">{t("aboutTitle")}</h2>
            <p>{t("aboutBody")}</p>
            <p className="landing-links">
              <a href={PROJECT_URL} target="_blank" rel="noopener noreferrer">
                {t("aboutLink")}
              </a>
              <a href={ECHO_URL} target="_blank" rel="noopener noreferrer">
                {t("aboutEuLink")}
              </a>
            </p>
            <p className="landing-contact">
              {t("contactLabel")}: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>
          </div>

          <div className="landing-funding">
            <EuEmblem text={t("fundedByEu")} height={44} />
            <p className="landing-disclaimer">{t("euDisclaimer")}</p>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p className="landing-safety">{L.safetyNote}</p>
        <nav className="landing-legal-links">
          <span>{L.copyright.replace("{year}", new Date().getFullYear())}</span>
          <button type="button" onClick={() => onLegal("terms")}>{L.termsLink}</button>
          <button type="button" onClick={() => onLegal("privacy")}>{L.privacyLink}</button>
        </nav>
        <p>
          {t("ochaCredit")}{" "}
          <a href={OCHA_ICONS_URL} target="_blank" rel="noopener noreferrer">
            github.com/UN-OCHA/humanitarian-icons
          </a>
        </p>
        <p>{t("mapCredit")}</p>
      </footer>
    </div>
  );
}
