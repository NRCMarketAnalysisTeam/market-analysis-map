import React, { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext.jsx";

// "Funded by the European Union" acknowledgement, as required for EU
// humanitarian aid (DG ECHO) funded actions: the EU emblem with the funding
// statement beside it, shown wherever the partner (NRC) logo is shown.
//
// EuFlag below is a fallback only, used if the official file fails to load.
// It follows the official EU emblem construction rules: 3:2 rectangle in Reflex Blue (#003399), twelve
// gold (#FFCC00) five-pointed stars on an invisible circle whose radius is
// one third of the flag height, each star fitting a circle of radius one
// eighteenth of the height, all stars pointing upwards.
const H = 540;
const W = 810;
const CX = W / 2;
const CY = H / 2;
const RING = H / 3;
const STAR_OUTER = H / 18;
const STAR_INNER = STAR_OUTER * 0.381966;

function starPath(cx, cy) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? STAR_OUTER : STAR_INNER;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

const STARS = Array.from({ length: 12 }, (_, i) => {
  const a = -Math.PI / 2 + (i * Math.PI) / 6;
  return starPath(CX + RING * Math.cos(a), CY + RING * Math.sin(a));
}).join("");

export function EuFlag({ height = 40 }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      height={height}
      width={(height * W) / H}
      role="img"
      aria-label="Flag of the European Union"
      style={{ display: "block", flexShrink: 0 }}
    >
      <rect width={W} height={H} fill="#003399" />
      <path d={STARS} fill="#FFCC00" />
    </svg>
  );
}

// Link required by DG ECHO: "The EU humanitarian aid visual identity and a
// link to ECHO's website must appear on the partner's website."
export const ECHO_URL = "https://civil-protection-humanitarian-aid.ec.europa.eu/";

// Official "Funded by the European Union" artwork, converted unedited from
// the EPS files supplied by the European Commission (horizontal, positive
// and negative). Never redraw, recolour, stretch or crop these files.
// To add another language, drop its official file into public/brand/eu/ and
// add it here, e.g. es: B + "brand/eu/ES-Financiado_por_la_UE-POS.svg".
// Languages without an official file show the official English version.
const B = import.meta.env.BASE_URL; // see LandingPage.jsx
const OFFICIAL = {
  pos: { en: B + "brand/eu/EN-Funded_by_the_EU-POS.svg" },
  neg: { en: B + "brand/eu/EN-Funded_by_the_EU-NEG.svg" },
};

// In the official file the flag (inside its built-in white border) fills
// 93.6% of the image height, so the image is sized to keep the flag itself
// at the requested height. The EU minimum is a 1 cm flag (about 38 px).
const FLAG_SHARE = 0.936;

export default function EuEmblem({ text, height = 40, dark = false }) {
  const { lang } = useLanguage();
  const set = dark ? OFFICIAL.neg : OFFICIAL.pos;
  const src = set[lang] || set.en;
  const [failed, setFailed] = useState(false);

  return (
    <a
      className="eu-emblem"
      href={ECHO_URL}
      target="_blank"
      rel="noopener noreferrer"
      style={{ "--eu-h": `${height}px` }}
      title="EU Civil Protection and Humanitarian Aid"
    >
      {failed ? (
        // Fallback only if the official file cannot load.
        <>
          <EuFlag height={height} />
          <span className={"eu-emblem-text" + (dark ? " eu-emblem-text--dark" : "")}>{text}</span>
        </>
      ) : (
        <img
          className="eu-emblem-img"
          src={src}
          alt="Funded by the European Union"
          style={{ "--eu-share": FLAG_SHARE }}
          onError={() => setFailed(true)}
        />
      )}
    </a>
  );
}
