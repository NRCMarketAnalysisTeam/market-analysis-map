import { useEffect } from "react";
import { useMap } from "react-leaflet";

/**
 * Leaflet caches its own computed container size and doesn't notice when
 * that container's CSS size changes — it needs an explicit
 * invalidateSize() call, or tiles can end up stale/misaligned (grey gaps,
 * wrong offsets) until the user pans or zooms. This matters now that the
 * frame resizes to fill the screen (useAspectFit.js recalculates on every
 * window resize), where previously the frame was a fixed size and this
 * was never triggered.
 */
export default function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [map]);

  return null;
}
