import React from "react";
import { useStore } from "../store.js";
import { formatKm } from "../geo.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useOverlayColumns } from "../useOverlayColumns.js";

// Same scaling approach as Legend.jsx — see the comment there.
function computeFontSize(rowCount, frameWidth) {
  const base = frameWidth ? Math.max(8, Math.min(10.5, frameWidth * 0.00825)) : 9;
  if (rowCount <= 6) return base;
  return Math.max(base * 0.75, base - (rowCount - 6) * 0.2);
}

// Space kept free inside the map: 10 px bottom margin, plus room at the
// top left for the + / - zoom buttons.
const RESERVED_PX = 84;

const byCode = (a, b) => (a.code || "").localeCompare(b.code || "", undefined, { numeric: true });

/*
  Two sections, as in the original PowerPoint template:
  1. Marketplace distance from the target population: one row per MP.
  2. Source market distance from MP: one row per SM-to-MP link, grouped by
     marketplace, so one marketplace can have several source markets and
     one source market can supply several marketplaces. Source markets not
     linked to any marketplace are listed last, so none is forgotten.
  Clicking a row opens the form where the figure is edited.
*/
export default function DistanceList({ frameWidth }) {
  const { t, lang } = useLanguage();
  const markers = useStore((s) => s.markers);
  const links = useStore((s) => s.links);
  const setEditingMarkerId = useStore((s) => s.setEditingMarkerId);

  const mps = markers.filter((m) => m.iconId === "market").sort(byCode);
  const sms = markers.filter((m) => m.iconId === "source-market").sort(byCode);
  const unit = t("unitKm");

  const items = [];
  if (mps.length) {
    items.push({ key: "t-mp", title: t("distanceListMpTitle") });
    for (const m of mps) {
      items.push({
        key: "mp-" + m.id,
        code: m.code || "–",
        value: m.distance || t("clickToAddDistance"),
        empty: !m.distance,
        open: m.id,
      });
    }
  }
  if (sms.length) {
    items.push({ key: "t-sm", title: t("distanceListSmTitle") });
    for (const mp of mps) {
      const mpLinks = links
        .filter((l) => l.mpId === mp.id)
        .map((l) => ({ l, sm: sms.find((s) => s.id === l.smId) }))
        .filter((x) => x.sm)
        .sort((a, b) => byCode(a.sm, b.sm));
      for (const { l, sm } of mpLinks) {
        const value = l.text || (l.km != null ? formatKm(l.km, lang, unit) : "");
        items.push({
          key: "ln-" + l.id,
          code: `${sm.code || "SM"} → ${mp.code || "MP"}`,
          value: value || t("clickToAddDistance"),
          empty: !value,
          open: mp.id,
        });
      }
    }
    for (const sm of sms) {
      if (!links.some((l) => l.smId === sm.id && mps.some((m) => m.id === l.mpId))) {
        items.push({
          key: "un-" + sm.id,
          code: sm.code || "SM",
          value: t("notLinkedToMp"),
          empty: true,
          open: sm.id,
        });
      }
    }
  }

  const fontSize = computeFontSize(items.length, frameWidth);
  const [boxRef, rowsPerColumn] = useOverlayColumns(items.length, RESERVED_PX, [fontSize, frameWidth]);

  if (!items.length) return null;

  return (
    <div className="distance-list" style={{ fontSize }} ref={boxRef}>
      <div
        className="ov-grid distance-grid"
        style={{ gridTemplateRows: `repeat(${rowsPerColumn}, auto)` }}
      >
        {items.map((it) =>
          it.title ? (
            <div key={it.key} className="distance-list-title">
              {it.title}
            </div>
          ) : (
            <div key={it.key} className="distance-row" onClick={() => setEditingMarkerId(it.open)}>
              <span className="distance-code" dir="ltr">{it.code}</span>
              <bdi className={"distance-text" + (it.empty ? " distance-text--empty" : "")} dir="auto">
                {it.value}
              </bdi>
            </div>
          )
        )}
      </div>
    </div>
  );
}
