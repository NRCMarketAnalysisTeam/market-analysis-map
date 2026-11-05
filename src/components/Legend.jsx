import React from "react";
import { useStore } from "../store.js";
import { useIcons } from "../icons.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useOverlayColumns } from "../useOverlayColumns.js";

// Base font size scales with the frame's actual on-screen width, so a
// smaller frame (laptop) gets proportionally smaller text/icons instead of
// keeping a fixed size that ends up cramped in a narrower box. A further
// reduction kicks in past 6 rows so a busy legend stays compact.
function computeFontSize(rowCount, frameWidth) {
  const base = frameWidth ? Math.max(8, Math.min(10.5, frameWidth * 0.00825)) : 9;
  if (rowCount <= 6) return base;
  return Math.max(base * 0.75, base - (rowCount - 6) * 0.2);
}

// Space kept free inside the map: 10 px top margin, plus room at the
// bottom for the OpenStreetMap / CARTO credit line.
const RESERVED_PX = 34;

export default function Legend({ frameWidth }) {
  const { t, tIcon } = useLanguage();
  const { ICONS_BY_ID } = useIcons();
  const usedIconIds = useStore((s) => s.usedIconIds());
  const circles = useStore((s) => s.circles);
  const lines = useStore((s) => s.lines);

  const hasCircles = circles.length > 0;
  const hasLines = lines.length > 0;

  const rows = usedIconIds
    .filter((iconId) => ICONS_BY_ID[iconId])
    .map((iconId) => {
      const label = tIcon(iconId);
      return {
        key: iconId,
        label,
        symbol: <img src={ICONS_BY_ID[iconId].url} alt={label} className="legend-icon" />,
      };
    });
  if (hasCircles) {
    rows.push({
      key: "functionality",
      label: t("legendMarketFunctionality"),
      symbol: (
        <>
          <span className="legend-dot" style={{ borderColor: "var(--nrc-green)" }} />
          <span className="legend-dot" style={{ borderColor: "var(--nrc-yellow)" }} />
          <span className="legend-dot" style={{ borderColor: "var(--nrc-red)" }} />
        </>
      ),
    });
  }
  if (hasLines) {
    rows.push({
      key: "supply",
      label: t("legendSupplyOfGoods"),
      symbol: <span className="legend-line" />,
    });
  }

  const fontSize = computeFontSize(rows.length, frameWidth);
  const [boxRef, rowsPerColumn] = useOverlayColumns(rows.length, RESERVED_PX, [fontSize, frameWidth]);

  if (rows.length === 0) return null;

  return (
    <div className="legend" style={{ fontSize }} ref={boxRef}>
      <div className="legend-title">{t("legendTitle")}</div>
      <div
        className="ov-grid legend-grid"
        style={{ gridTemplateRows: `repeat(${rowsPerColumn}, auto)` }}
      >
        {rows.map((r) => (
          <div key={r.key} className="legend-row">
            <span className="legend-label">{r.label}</span>
            <span className="legend-symbol">{r.symbol}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
