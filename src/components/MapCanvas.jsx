import React from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  Tooltip,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { useStore, useIconScale } from "../store.js";
import { labelScaleFor, lineScaleFor } from "../iconScale.js";
import { useIcons } from "../icons.js";
import { hexFor } from "../colors.js";
import ResizableCircleMarker from "./ResizableCircleMarker.jsx";
import MapLockController from "./MapLockController.jsx";
import MapResizeHandler from "./MapResizeHandler.jsx";
import DrawingLayer from "./DrawingLayer.jsx";
import { pathKm, formatKm } from "../geo.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

// CARTO Voyager raster tiles, loaded by the browser straight from CARTO.
// The key is added when the site is built (VITE_CARTO_BASEMAP_KEY, kept as a
// GitHub Actions secret), so it is not in the source code. It is visible in
// the published site, which is how browser map keys work. If it is ever
// misused, create a new key in CARTO and update the secret.
const CARTO_KEY = import.meta.env.VITE_CARTO_BASEMAP_KEY || "";
const TILE_URL =
  "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png" +
  (CARTO_KEY ? `?key=${encodeURIComponent(CARTO_KEY)}` : "");
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Drop Leaflet's own "Leaflet" link from the credit line so the map shows
// (and exports) only the required data credit: OpenStreetMap and CARTO.
function AttributionSetup() {
  const map = useMap();
  React.useEffect(() => {
    if (map.attributionControl) map.attributionControl.setPrefix(false);
  }, [map]);
  return null;
}

// Icons are 24 px at full size; the size follows the zoom (iconScale.js).
const ICON_PX = 24;
function makeIcon(iconUrl, scale = 1) {
  const px = Math.max(6, Math.round(ICON_PX * scale));
  return L.icon({
    iconUrl,
    iconSize: [px, px],
    iconAnchor: [px / 2, px / 2],
    className: "map-icon-marker",
  });
}

// Keeps the store's copy of the map zoom up to date, so icon sizes follow it.
function ZoomWatcher() {
  const map = useMap();
  const setMapZoom = useStore((s) => s.setMapZoom);
  React.useEffect(() => {
    setMapZoom(map.getZoom());
    // handle for local browser tests only; not in the published build
    if (import.meta.env.DEV) window.__map = map;
  }, [map, setMapZoom]);
  useMapEvents({ zoomend: () => setMapZoom(map.getZoom()) });
  return null;
}

// Placement tools (icons, circles, text). Supply lines and the Measure
// tool are handled by DrawingLayer.jsx.
function ClickHandler({ promptLabel }) {
  const activeTool = useStore((s) => s.activeTool);
  const activeIconId = useStore((s) => s.activeIconId);
  const activeCircleColor = useStore((s) => s.activeCircleColor);
  const addMarker = useStore((s) => s.addMarker);
  const addCircle = useStore((s) => s.addCircle);
  const addText = useStore((s) => s.addText);
  const setEditingMarkerId = useStore((s) => s.setEditingMarkerId);
  const setActiveTool = useStore((s) => s.setActiveTool);
  const selectLine = useStore((s) => s.selectLine);

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      if (activeTool === "place-icon" && activeIconId) {
        const newId = addMarker(activeIconId, lat, lng);
        // One placement per icon click, then back to select — placing five
        // markets used to mean five map-clicks while the tool stayed
        // "loaded"; now each one is a deliberate click-icon, click-map pair,
        // which avoids accidentally dropping extra icons.
        setActiveTool("select", { activeIconId: null });
        // Market / source-market icons always need a code — open the editor
        // immediately so the label isn't a separate, easy-to-forget step.
        if (activeIconId === "market" || activeIconId === "source-market") {
          setEditingMarkerId(newId);
        }
      } else if (activeTool === "place-circle") {
        addCircle(lat, lng, activeCircleColor);
      } else if (activeTool === "place-text") {
        const text = window.prompt(promptLabel);
        if (text) addText(lat, lng, text);
      } else if (activeTool === "select") {
        // clicking empty map ends editing of a selected supply line
        selectLine(null);
      }
    },
  });

  return null;
}

// What a committed supply line shows when clicked: which markets it links
// and its measured length, plus Delete.
function LinePopup({ line }) {
  const { t, lang } = useLanguage();
  const links = useStore((s) => s.links);
  const markers = useStore((s) => s.markers);
  const removeLine = useStore((s) => s.removeLine);
  const link = links.find((l) => l.lineId === line.id);
  const code = (mid) => markers.find((m) => m.id === mid)?.code || "?";
  const km = formatKm(pathKm(line.points), lang, t("unitKm"));
  return (
    <div className="line-popup">
      <div className="line-popup-info">
        {link ? (
          <strong>
            {code(link.smId)} &rarr; {code(link.mpId)}
          </strong>
        ) : (
          <span className="line-popup-muted">{t("lineNotLinked")}</span>
        )}
        <bdi className="line-popup-km">{km}</bdi>
      </div>
      <div className="line-popup-hint">{t("lineEditHint")}</div>
      <button className="tool-btn tool-btn--danger tool-btn--small" onClick={() => removeLine(line.id)}>
        {t("deleteLine")}
      </button>
    </div>
  );
}

// Drag handles on the points of the selected supply line (Google Maps
// style editing). Dropping an end point on an icon snaps it there; pulling
// it off an icon detaches it.
function LineHandles({ line }) {
  const map = useMap();
  const markers = useStore((s) => s.markers);
  const updateLine = useStore((s) => s.updateLine);
  const last = line.points.length - 1;
  const handleIcon = (end) =>
    L.divIcon({
      className: "line-vertex-handle" + (end ? " line-vertex-handle--end" : ""),
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });
  return line.points.map((p, i) => (
    <Marker
      key={`${line.id}-${i}`}
      position={p}
      icon={handleIcon(i === 0 || i === last)}
      draggable
      keyboard={false}
      eventHandlers={{
        drag: (e) => {
          const { lat, lng } = e.target.getLatLng();
          const points = line.points.map((q, j) => (j === i ? [lat, lng] : q));
          updateLine(line.id, { points });
        },
        dragend: (e) => {
          if (i !== 0 && i !== last) return;
          const ll = e.target.getLatLng();
          const cp = map.latLngToContainerPoint(ll);
          let snapTo = null;
          let bestD = 18;
          for (const m of markers) {
            const d = map.latLngToContainerPoint([m.lat, m.lng]).distanceTo(cp);
            if (d <= bestD) {
              snapTo = m;
              bestD = d;
            }
          }
          const points = line.points.map((q, j) =>
            j === i ? (snapTo ? [snapTo.lat, snapTo.lng] : [ll.lat, ll.lng]) : q
          );
          const key = i === 0 ? "fromId" : "toId";
          updateLine(line.id, { points, [key]: snapTo ? snapTo.id : null });
        },
      }}
    />
  ));
}

// Text labels (place-text tool) used to only support delete, hidden behind
// a right-click with no visible affordance, and no way to edit the text
// at all short of deleting and re-adding it. This gives them the same
// click-to-open-popup pattern already used for lines and circles.
function TextLabelPopup({ text, onUpdate, onRemove }) {
  const { t } = useLanguage();
  const [value, setValue] = React.useState(text.text);

  return (
    <div className="text-label-popup">
      <input
        className="text-label-popup-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onUpdate({ text: value });
        }}
        autoFocus
      />
      <div className="text-label-popup-actions">
        <button className="tool-btn tool-btn--small" onClick={() => onUpdate({ text: value })}>
          {t("save")}
        </button>
        <button className="tool-btn tool-btn--danger tool-btn--small" onClick={onRemove}>
          {t("delete")}
        </button>
      </div>
    </div>
  );
}

// Escape cancels whatever tool/draft is active — a keyboard-level "get me out"
// that doesn't depend on finding the right button.
function useEscapeToCancel() {
  const cancelTool = useStore((s) => s.cancelTool);
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") cancelTool();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancelTool]);
}

export default function MapCanvas({ mapRef }) {
  const { t } = useLanguage();
  const { ICONS_BY_ID } = useIcons();
  const markers = useStore((s) => s.markers);
  const lines = useStore((s) => s.lines);
  const circles = useStore((s) => s.circles);
  const texts = useStore((s) => s.texts);
  const greyscale = useStore((s) => s.greyscale);
  const activeTool = useStore((s) => s.activeTool);
  const moveMarker = useStore((s) => s.moveMarker);
  const selectedLineId = useStore((s) => s.selectedLineId);
  const selectLine = useStore((s) => s.selectLine);
  const removeMarker = useStore((s) => s.removeMarker);
  const updateCircle = useStore((s) => s.updateCircle);
  const removeCircle = useStore((s) => s.removeCircle);
  const removeLine = useStore((s) => s.removeLine);
  const removeText = useStore((s) => s.removeText);
  const updateText = useStore((s) => s.updateText);
  const setEditingMarkerId = useStore((s) => s.setEditingMarkerId);
  const scale = useIconScale();
  const labelScale = labelScaleFor(scale);
  const lineWeight = 4 * lineScaleFor(scale);

  useEscapeToCancel();

  // While drawing a supply line or measuring, existing icons, lines and
  // circles stop catching clicks, so a click on an icon reaches the map and
  // snaps the point to it. (Leaflet reads `interactive` only when a layer
  // is created, hence the key suffix that re-creates the layers.)
  const drawing = activeTool === "draw-line" || activeTool === "measure";
  const k = drawing ? "-d" : "";

  const cursorClass =
    activeTool === "place-icon" ||
    activeTool === "place-circle" ||
    activeTool === "place-text" ||
    activeTool === "draw-line" ||
    activeTool === "measure"
      ? " map-wrap--crosshair"
      : "";

  return (
    <div
      className={"map-wrap" + (greyscale ? " map-wrap--greyscale" : "") + cursorClass}
      style={{ "--label-scale": labelScale }}
    >
      <MapContainer
        center={[15, 20]}
        zoom={2}
        minZoom={2}
        ref={mapRef}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url={TILE_URL}
          attribution={TILE_ATTRIBUTION}
          crossOrigin={true}
        />
        <AttributionSetup />
        <ClickHandler promptLabel={t("labelPlaceholder")} />
        <DrawingLayer />
        <MapLockController />
        <MapResizeHandler />
        <ZoomWatcher />

        {markers.map((m) => {
          const icon = ICONS_BY_ID[m.iconId];
          if (!icon) return null;
          const displayLabel = m.code || m.label;
          // A functionality circle attached to this marker is drawn as a
          // separate layer, larger than the icon itself — the tooltip's
          // default position only accounts for the icon, so with a circle
          // attached it used to land overlapping the circle's lower half.
          // Offsetting by the circle's own radius (plus a small gap)
          // clears it; markers with no circle keep Leaflet's own default.
          const attachedCircle = circles.find((c) => c.markerId === m.id);
          // Label sits just below the circle (or just below the icon if there
          // is no circle). Leaflet only reads a tooltip's offset when the
          // tooltip is created, so the Tooltip is keyed on the offset: when
          // a circle is added later or the zoom changes the size, the label
          // is re-created in the right place instead of staying inside the
          // circle.
          const labelOffsetY = attachedCircle
            ? Math.round(attachedCircle.radius * scale) + 2
            : Math.round(ICON_PX * scale * 0.5) - 1;
          return (
            <Marker
              key={m.id + k}
              position={[m.lat, m.lng]}
              icon={makeIcon(icon.url, scale)}
              draggable={!drawing}
              interactive={!drawing}
              eventHandlers={{
                dragend: (e) => {
                  const { lat, lng } = e.target.getLatLng();
                  // moves any attached functionality circle and the ends of
                  // supply lines snapped to this icon, and re-measures them
                  moveMarker(m.id, lat, lng);
                },
                click: () => {
                  if (activeTool === "select") setEditingMarkerId(m.id);
                },
                contextmenu: () => removeMarker(m.id),
              }}
            >
              {displayLabel && (
                <Tooltip
                  key={"lbl" + labelOffsetY}
                  permanent
                  direction="bottom"
                  offset={[0, labelOffsetY]}
                  className="marker-label"
                >
                  {displayLabel}
                </Tooltip>
              )}
            </Marker>
          );
        })}

        {lines.map((l) => (
          <Polyline
            key={l.id + k}
            positions={l.points}
            interactive={!drawing}
            // slightly thicker than the draft preview so a committed line is
            // an easier, more deliberate click target
            pathOptions={{ color: hexFor(l.color), weight: selectedLineId === l.id ? lineWeight + 2 : lineWeight }}
            eventHandlers={{
              contextmenu: () => removeLine(l.id),
              popupopen: () => selectLine(l.id),
              popupclose: () => {
                if (useStore.getState().selectedLineId === l.id) selectLine(null);
              },
            }}
          >
            <Popup closeButton={false} autoPan={false}>
              <LinePopup line={l} />
            </Popup>
          </Polyline>
        ))}
        {!drawing &&
          lines
            .filter((l) => l.id === selectedLineId)
            .map((l) => <LineHandles key={"h" + l.id} line={l} />)}

        {circles.map((c) => (
          <ResizableCircleMarker
            key={c.id + k}
            circle={c}
            scale={scale}
            interactive={!drawing}
            onUpdate={(patch) => updateCircle(c.id, patch)}
            onRemove={() => removeCircle(c.id)}
          />
        ))}

        {texts.map((txt) => (
          <Marker
            key={txt.id + k}
            position={[txt.lat, txt.lng]}
            interactive={!drawing}
            icon={L.divIcon({
              className: "map-text-label",
              html: `<span>${txt.text}</span>`,
              iconAnchor: [0, 0],
            })}
          >
            <Popup closeButton={false}>
              <TextLabelPopup
                text={txt}
                onUpdate={(patch) => updateText(txt.id, patch)}
                onRemove={() => removeText(txt.id)}
              />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
