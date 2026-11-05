import { useEffect, useRef, useState } from "react";

/**
 * Returns [containerRef, {width, height}] — attach containerRef to the
 * element whose available space you want to fill, and apply the returned
 * {width, height} (in px) to the child that must keep a fixed aspect
 * ratio. This is the classic "letterbox" fit: as large as possible within
 * the container without exceeding it in either dimension or breaking the
 * ratio.
 *
 * A plain CSS `aspect-ratio` can't do this alone on a non-replaced element
 * (a <div>, not an <img>/<video>) — those only auto-fill a *missing*
 * dimension, they don't "contain" within both a max-width and a max-height
 * simultaneously the way object-fit does for media. Hence the small
 * ResizeObserver-driven calculation here instead.
 */
export function useAspectFit(ratio, padding = 0) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const compute = () => {
      const availW = el.clientWidth - padding * 2;
      const availH = el.clientHeight - padding * 2;
      if (availW <= 0 || availH <= 0) return;

      let width = availW;
      let height = width / ratio;
      if (height > availH) {
        height = availH;
        width = height * ratio;
      }
      setSize({ width: Math.floor(width), height: Math.floor(height) });
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [ratio, padding]);

  return [containerRef, size];
}
