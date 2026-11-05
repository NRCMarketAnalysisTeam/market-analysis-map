import React from "react";
import { useStore } from "../store.js";
import { pathKm, formatKm } from "../geo.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

// Works out what a finished measurement can be saved as, from the icons
// its two ends are snapped to.
function measureTargets(draft, markers) {
  if (!draft?.done) return null;
  const ends = [draft.snaps[0], draft.snaps[draft.snaps.length - 1]]
    .map((id) => markers.find((m) => m.id === id))
    .filter(Boolean);
  const mp = ends.find((m) => m.iconId === "market");
  const sm = ends.find((m) => m.iconId === "source-market");
  if (mp && sm) return { kind: "link", mp, sm };
  if (mp) return { kind: "target", mp };
  return { kind: "none" };
}

export default function StatusBanner() {
  const { t, tIcon, tColor, lang } = useLanguage();
  const activeTool = useStore((s) => s.activeTool);
  const activeIconId = useStore((s) => s.activeIconId);
  const activeCircleColor = useStore((s) => s.activeCircleColor);
  const activeLineColor = useStore((s) => s.activeLineColor);
  const lineDraft = useStore((s) => s.lineDraft);
  const measureDraft = useStore((s) => s.measureDraft);
  const markers = useStore((s) => s.markers);
  const cancelTool = useStore((s) => s.cancelTool);
  const finishLineDraft = useStore((s) => s.finishLineDraft);
  const undoLastLinePoint = useStore((s) => s.undoLastLinePoint);
  const finishMeasure = useStore((s) => s.finishMeasure);
  const undoMeasurePoint = useStore((s) => s.undoMeasurePoint);
  const clearMeasure = useStore((s) => s.clearMeasure);
  const saveMeasureAsTargetDistance = useStore((s) => s.saveMeasureAsTargetDistance);
  const saveMeasureAsLink = useStore((s) => s.saveMeasureAsLink);

  if (activeTool === "select") return null;

  const unit = t("unitKm");
  const km = (pts) => formatKm(pathKm(pts), lang, unit);

  let message = "";
  let buttons = [];

  if (activeTool === "place-icon") {
    message = t("placingIcon", { icon: tIcon(activeIconId) });
  } else if (activeTool === "place-circle") {
    message = t("placingCircle", { color: tColor(activeCircleColor) });
  } else if (activeTool === "place-text") {
    message = t("placingText");
  } else if (activeTool === "draw-line") {
    const n = lineDraft?.points.length || 0;
    if (n === 0) {
      message = t("drawingLineStart", { color: tColor(lineDraft?.color || activeLineColor) });
    } else {
      message = t("drawingLineProgress", { distance: km(lineDraft.points) });
      buttons.push({ label: t("undoPoint"), onClick: undoLastLinePoint });
      if (n >= 2) buttons.push({ label: t("finishLine"), onClick: finishLineDraft, primary: true });
    }
  } else if (activeTool === "measure") {
    const n = measureDraft?.points.length || 0;
    if (measureDraft?.done) {
      const text = km(measureDraft.points);
      const target = measureTargets(measureDraft, markers);
      message = t("measureResult", { distance: text });
      if (target.kind === "link") {
        buttons.push({
          label: t("saveAsSupplyDistance", { sm: target.sm.code || "SM", mp: target.mp.code || "MP" }),
          onClick: () => saveMeasureAsLink(target.mp.id, target.sm.id, text),
          primary: true,
        });
      } else if (target.kind === "target") {
        buttons.push({
          label: t("saveAsTargetDistance", { mp: target.mp.code || "MP" }),
          onClick: () => saveMeasureAsTargetDistance(target.mp.id, text),
          primary: true,
        });
      } else {
        message += " " + t("measureNoSaveHint");
      }
      buttons.push({ label: t("measureAgain"), onClick: clearMeasure });
    } else if (n === 0) {
      message = t("measureStart");
    } else {
      message = t("measureProgress", { distance: km(measureDraft.points) });
      buttons.push({ label: t("undoPoint"), onClick: undoMeasurePoint });
      if (n >= 2) buttons.push({ label: t("finishMeasure"), onClick: finishMeasure, primary: true });
    }
  }

  return (
    <div className="status-banner">
      <span className="status-dot" />
      <span>{message}</span>
      {buttons.map((b) => (
        <button
          key={b.label}
          className={"status-btn" + (b.primary ? " status-btn--primary" : "")}
          onClick={b.onClick}
        >
          {b.label}
        </button>
      ))}
      <button className="status-btn" onClick={cancelTool}>
        {activeTool === "measure" && measureDraft?.done ? t("close") : t("cancelEsc")}
      </button>
    </div>
  );
}
