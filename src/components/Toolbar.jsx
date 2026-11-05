import React from "react";
import { useStore } from "../store.js";
import { COLOR_ORDER, hexFor } from "../colors.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import LanguageSwitcher from "./LanguageSwitcher.jsx";
import SearchBox from "./SearchBox.jsx";
import IconSizeControl from "./IconSizeControl.jsx";

export default function Toolbar({ onExport, exporting, mapRef, onHowToUse, onHome }) {
  const { t, tColor } = useLanguage();
  const activeTool = useStore((s) => s.activeTool);
  const activeCircleColor = useStore((s) => s.activeCircleColor);
  const activeLineColor = useStore((s) => s.activeLineColor);
  const setActiveTool = useStore((s) => s.setActiveTool);
  const mapLocked = useStore((s) => s.mapLocked);
  const toggleMapLock = useStore((s) => s.toggleMapLock);

  const isCircleActive = (color) =>
    activeTool === "place-circle" && activeCircleColor === color;
  const isLineActive = (color) =>
    activeTool === "draw-line" && activeLineColor === color;

  return (
    <div className="topbar">
      <div className="topbar-tools">
        <button
          className="tool-btn tool-btn--icon"
          onClick={onHome}
          title={t("homeTitle")}
          aria-label={t("home")}
        >
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            <path d="M3 9.5L10 3l7 6.5M5 8v8.5h3.5v-5h3v5H15V8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </button>

        <span className="divider" />

        <button
          className={"tool-btn" + (activeTool === "select" ? " tool-btn--active" : "")}
          onClick={() => setActiveTool("select")}
        >
          {t("select")}
        </button>

        <span className="divider" />

        <div className="tool-group">
          <span className="tool-group-label-top">{t("functionalityStandalone")}</span>
          <div className="swatch-group">
            {COLOR_ORDER.map((color) => (
              <button
                key={color}
                className={"color-swatch-btn" + (isCircleActive(color) ? " color-swatch-btn--active" : "")}
                style={{ "--swatch-color": hexFor(color) }}
                title={t("standaloneCircleTitle", { color: tColor(color) })}
                onClick={() => setActiveTool("place-circle", { activeCircleColor: color })}
              >
                <span className="swatch-ring" />
              </button>
            ))}
          </div>
        </div>

        <span className="divider" />

        <div className="tool-group">
          <span className="tool-group-label-top">{t("supplyLine")}</span>
          <div className="swatch-group">
            {COLOR_ORDER.map((color) => (
              <button
                key={color}
                className={"color-swatch-btn" + (isLineActive(color) ? " color-swatch-btn--active" : "")}
                style={{ "--swatch-color": hexFor(color) }}
                title={t("lineColorTitle", { color: tColor(color) })}
                onClick={() => setActiveTool("draw-line", { activeLineColor: color })}
              >
                <span className="swatch-line" />
              </button>
            ))}
          </div>
        </div>

        <span className="divider" />

        <button
          className={"tool-btn tool-btn--measure" + (activeTool === "measure" ? " tool-btn--active" : "")}
          onClick={() => setActiveTool(activeTool === "measure" ? "select" : "measure")}
          title={t("measureTitle")}
        >
          <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
            <path d="M2.5 13.5l11-11 4 4-11 11z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M6 10l1.6 1.6M8.3 7.7l1.1 1.1M10.5 5.5l1.6 1.6M12.7 3.3l1.1 1.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span>{t("measure")}</span>
        </button>

        <span className="divider" />

        <button
          className={"tool-btn" + (mapLocked ? " tool-btn--active" : "")}
          onClick={toggleMapLock}
        >
          {mapLocked ? t("unlockMap") : t("lockMap")}
        </button>

        <span className="divider" />

        <IconSizeControl />

        <span className="divider" />

        <button className="tool-btn" onClick={onHowToUse}>
          {t("howToUse")}
        </button>

        <span className="divider" />

        <LanguageSwitcher />

        <span className="divider" />

        <SearchBox mapRef={mapRef} />

        <span className="divider" />

        <button className="tool-btn tool-btn--primary" onClick={onExport} disabled={exporting}>
          {exporting ? t("exporting") : t("downloadPng")}
        </button>
      </div>
    </div>
  );
}
