import React from "react";
import { CircleMarker, Marker, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useStore, useIconScale } from "../store.js";
import { hexFor } from "../colors.js";
import { pathKm, formatKm } from "../geo.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

/*
  Drawing for supply lines and the Measure tool, modelled on Google Maps'
  "Measure distance":
  - every click adds a point, shown as a small white dot;
  - a dashed segment follows the mouse from the last point, and a label
    next to the mouse shows the running total in km;
  - near an icon, the point snaps to the icon's centre and the icon gets a
    highlight ring, so a line can start on a source market and end on a
    marketplace exactly (that is how the app knows which pair it links);
  - finish by clicking the end icon (supply line: the other market type;
    Measure: any icon), by clicking the last point again, by
    double-clicking, by pressing Enter, or with the Finish button;
  - Backspace removes the last point, Esc cancels.
*/

const SNAP_PX = 18; // how close (screen pixels) the mouse must be to snap to an icon
const FINISH_PX = 10; // clicking this close to the last point finishes
const MEASURE_COLOR = "#2b2b2b";

// Nearest icon within SNAP_PX of a screen point, or null.
function findSnap(map, containerPoint, markers) {
  let best = null;
  let bestD = SNAP_PX;
  for (const m of markers) {
    const p = map.latLngToContainerPoint([m.lat, m.lng]);
    const d = p.distanceTo(containerPoint);
    if (d <= bestD) {
      best = m;
      bestD = d;
    }
  }
  return best;
}

export default function DrawingLayer() {
  const map = useMap();
  const { t, lang } = useLanguage();
  const iconScale = useIconScale();
  const activeTool = useStore((s) => s.activeTool);
  const lineDraft = useStore((s) => s.lineDraft);
  const measureDraft = useStore((s) => s.measureDraft);
  const markers = useStore((s) => s.markers);
  const mapLocked = useStore((s) => s.mapLocked);

  const isLine = activeTool === "draw-line";
  const isMeasure = activeTool === "measure";
  const measuring = isMeasure && !(measureDraft && measureDraft.done);
  const active = isLine || measuring;

  const [cursor, setCursor] = React.useState(null); // [lat, lng]
  const [snap, setSnap] = React.useState(null); // marker under the mouse

  const draft = isLine ? lineDraft : isMeasure ? measureDraft : null;
  const points = draft?.points || [];
  const snaps = draft?.snaps || [];
  const color = isLine ? hexFor(lineDraft?.color || useStore.getState().activeLineColor) : MEASURE_COLOR;

  // Double-click must finish the line, not zoom the map.
  React.useEffect(() => {
    if (!map.doubleClickZoom) return undefined;
    if (active) map.doubleClickZoom.disable();
    return () => {
      if (!useStore.getState().mapLocked) map.doubleClickZoom.enable();
    };
  }, [active, map, mapLocked]);

  React.useEffect(() => {
    if (!active) {
      setCursor(null);
      setSnap(null);
    }
  }, [active]);

  const finish = React.useCallback(() => {
    const s = useStore.getState();
    if (s.activeTool === "draw-line") s.finishLineDraft();
    else if (s.activeTool === "measure") s.finishMeasure();
  }, []);

  const addPoint = React.useCallback((lat, lng, markerId) => {
    const s = useStore.getState();
    if (s.activeTool === "draw-line") {
      if (!s.lineDraft) s.startLineDraft(s.activeLineColor);
      s.addLineDraftPoint(lat, lng, markerId);
    } else if (s.activeTool === "measure") {
      s.addMeasurePoint(lat, lng, markerId);
    }
  }, []);

  // Keyboard: Enter finishes, Backspace removes the last point.
  React.useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      const s = useStore.getState();
      if (e.key === "Enter") {
        e.preventDefault();
        finish();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        if (s.activeTool === "draw-line") s.undoLastLinePoint();
        else s.undoMeasurePoint();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, finish]);

  useMapEvents({
    mousemove(e) {
      if (!active) return;
      const m = findSnap(map, e.containerPoint, markers);
      setSnap(m);
      setCursor(m ? [m.lat, m.lng] : [e.latlng.lat, e.latlng.lng]);
    },
    mouseout() {
      if (active) setCursor(null);
    },
    click(e) {
      if (!isLine && !isMeasure) return;
      const st = useStore.getState();
      // A click after a finished measurement starts a new one.
      let pts = points;
      let snp = snaps;
      if (isMeasure && st.measureDraft?.done) {
        st.clearMeasure();
        pts = [];
        snp = [];
      }
      const m = findSnap(map, e.containerPoint, markers);
      const n = pts.length;

      if (n >= 1) {
        const last = map.latLngToContainerPoint(pts[n - 1]);
        const nearLast = last.distanceTo(e.containerPoint) <= FINISH_PX && (!m || m.id === snp[n - 1]);
        if (nearLast) {
          // Clicking the last point again finishes (Google Maps behaviour);
          // with a single point it is just the second half of a double-click.
          if (n >= 2) finish();
          return;
        }
      }
      // Points as they were before this click (after any measure reset).
      const points_ = pts;
      const snaps_ = snp;

      const lat = m ? m.lat : e.latlng.lat;
      const lng = m ? m.lng : e.latlng.lng;
      addPoint(lat, lng, m ? m.id : null);

      // Ending on an icon finishes automatically.
      if (m && points_.length >= 1 && m.id !== snaps_[0]) {
        const start = markers.find((x) => x.id === snaps_[0]);
        if (isLine) {
          // A supply line ends itself when it goes from a source market to
          // a marketplace (or the other way round).
          const pair =
            start &&
            ((start.iconId === "source-market" && m.iconId === "market") ||
              (start.iconId === "market" && m.iconId === "source-market"));
          if (pair) finish();
        } else {
          finish();
        }
      }
    },
  });

  // Finished ruler: keep it on the map (dots, no live segment) until the
  // user saves, measures again or closes.
  const showFinishedMeasure = isMeasure && measureDraft?.done;

  if (!active && !showFinishedMeasure) return null;
  if (!points.length && !snap) return null;

  const live = active && cursor && points.length ? [...points, cursor] : points;
  const km = pathKm(live);
  const unit = t("unitKm");

  const labelIcon =
    active && cursor && points.length
      ? L.divIcon({
          className: "draw-cursor-label",
          html: `<span class="draw-cursor-km">${formatKm(km, lang, unit)}</span>${
            snap ? `<span class="draw-cursor-snap">${snap.code || ""}</span>` : ""
          }`,
          iconSize: null,
          iconAnchor: [-14, 26],
        })
      : null;

  const dash = isMeasure ? "6 5" : null;

  return (
    <>
      {points.length >= 2 && (
        <Polyline
          positions={points}
          interactive={false}
          pathOptions={{ color, weight: isMeasure ? 3 : 4, dashArray: dash, opacity: 0.95 }}
        />
      )}
      {active && cursor && points.length >= 1 && (
        <Polyline
          positions={[points[points.length - 1], cursor]}
          interactive={false}
          pathOptions={{ color, weight: 3, dashArray: "4 6", opacity: 0.9 }}
        />
      )}
      {points.map((p, i) => (
        <CircleMarker
          key={i}
          center={p}
          radius={i === 0 || i === points.length - 1 ? 6 : 5}
          interactive={false}
          pathOptions={{ color, weight: 2, fillColor: "#ffffff", fillOpacity: 1 }}
        />
      ))}
      {active && snap && (
        <CircleMarker
          center={[snap.lat, snap.lng]}
          radius={Math.max(10, 20 * iconScale)}
          interactive={false}
          pathOptions={{ color, weight: 2, dashArray: "3 4", fillColor: color, fillOpacity: 0.12 }}
        />
      )}
      {labelIcon && <Marker position={cursor} icon={labelIcon} interactive={false} keyboard={false} />}
    </>
  );
}
