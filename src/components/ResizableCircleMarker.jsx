import React from "react";
import { CircleMarker, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { COLOR_ORDER, hexFor } from "../colors.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const MIN_RADIUS = 8;
const MAX_RADIUS = 60;

// A small square handle sitting on the circle's edge. Always rendered (no
// "select it first" step) so it's discoverable on sight. Dragging it
// updates the circle's pixel radius. Because CircleMarker radius is in
// screen pixels (not meters), the handle's position has to be recomputed
// from the map's current pan/zoom on every render — there's no fixed
// lat/lng for "radius pixels to the right of center" that survives a zoom
// change.
function ResizeHandle({ center, radius, onResize }) {
  const map = useMap();
  const [, forceRerender] = React.useState(0);

  useMapEvents({
    zoom: () => forceRerender((n) => n + 1),
    move: () => forceRerender((n) => n + 1),
  });

  const centerLatLng = L.latLng(center[0], center[1]);
  const centerPoint = map.latLngToLayerPoint(centerLatLng);
  const handlePoint = centerPoint.add(L.point(radius, 0));
  const handleLatLng = map.layerPointToLatLng(handlePoint);

  const handleIcon = L.divIcon({
    className: "circle-resize-handle",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  return (
    <Marker
      position={handleLatLng}
      icon={handleIcon}
      draggable
      eventHandlers={{
        drag: (e) => {
          const newPoint = map.latLngToLayerPoint(e.target.getLatLng());
          const dist = newPoint.distanceTo(centerPoint);
          onResize(dist);
        },
      }}
    />
  );
}

export default function ResizableCircleMarker({ circle, onUpdate, onRemove, interactive = true, scale = 1 }) {
  const { t } = useLanguage();
  // Marker-attached circles (circle.markerId set) auto-size to fit their
  // icon (see MARKER_FUNCTIONALITY_CIRCLE_RADIUS in store.js) — no need
  // for a resize handle there, since there's nothing for the user to
  // tune. Only standalone circles (placed anywhere, not tied to an icon)
  // keep the manual resize handle.
  const isStandalone = !circle.markerId;

  return (
    <>
      <CircleMarker
        center={[circle.lat, circle.lng]}
        // stored radius is the full-size one; drawn smaller when zoomed out
        radius={Math.max(4, circle.radius * scale)}
        interactive={interactive}
        pathOptions={{ color: hexFor(circle.color), weight: 3, fillOpacity: 0 }}
      >
        <Popup closeButton={false} className="circle-popup">
          <div className="circle-popup-inner">
            <div className="circle-popup-row">
              {COLOR_ORDER.map((c) => (
                <button
                  key={c}
                  className={"circle-swatch" + (circle.color === c ? " circle-swatch--active" : "")}
                  style={{ background: hexFor(c) }}
                  onClick={() => onUpdate({ color: c })}
                  title={c}
                />
              ))}
            </div>
            {isStandalone && <div className="circle-popup-hint">{t("circleDragHint")}</div>}
            <button className="tool-btn tool-btn--danger tool-btn--small" onClick={onRemove}>
              {t("delete")}
            </button>
          </div>
        </Popup>
      </CircleMarker>
      {isStandalone && interactive && (
        <ResizeHandle
          center={[circle.lat, circle.lng]}
          radius={circle.radius * scale}
          onResize={(r) => onUpdate({ radius: Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, Math.round(r / scale))) })}
        />
      )}
    </>
  );
}
