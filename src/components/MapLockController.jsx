import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { useStore } from "../store.js";

/*
  Leaflet doesn't have a single "freeze" switch — panning, both zoom
  methods, box-zoom, and keyboard nav are separate handlers that each need
  enable()/disable(). Mounted as a child of MapContainer purely for its
  useMap() access; it renders nothing.
*/
export default function MapLockController() {
  const map = useMap();
  const locked = useStore((s) => s.mapLocked);

  useEffect(() => {
    const handlers = [
      map.dragging,
      map.scrollWheelZoom,
      map.doubleClickZoom,
      map.boxZoom,
      map.keyboard,
      map.touchZoom,
    ].filter(Boolean);

    handlers.forEach((h) => (locked ? h.disable() : h.enable()));

    // mobile tap handler isn't present in every Leaflet build
    if (map.tap) locked ? map.tap.disable() : map.tap.enable();
  }, [locked, map]);

  return null;
}
