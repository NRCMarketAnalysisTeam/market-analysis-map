import { useLayoutEffect, useRef, useState } from "react";

/*
  Legend and distance box: grow downwards as rows are added, and when the
  map runs out of height, flow into a second (third...) column instead of
  hiding rows behind a scroll bar. The old version capped both boxes at 45%
  of the map height with a scroll bar; rows past the cap looked missing on
  screen and were cut off in the downloaded PNG.

  Returns [boxRef, rowsPerColumn]. Put boxRef on the box; render the rows
  as direct children of an element with class "ov-grid" inside it, laid
  out with gridTemplateRows: repeat(rowsPerColumn, auto) and
  gridAutoFlow: column. reservedPx is the space to keep free inside the
  map (box margins, zoom buttons, the map credit line).
*/
export function useOverlayColumns(itemCount, reservedPx, deps = []) {
  const boxRef = useRef(null);
  const [rowsPerColumn, setRowsPerColumn] = useState(Math.max(1, itemCount));

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;
    const body = box.closest(".map-body") || box.parentElement;

    const compute = () => {
      const grid = box.querySelector(".ov-grid");
      if (!grid || !grid.children.length || !body) return;
      const items = Array.from(grid.children);
      const rowH = Math.max(...items.map((el) => el.offsetHeight), 1);
      const chrome = box.offsetHeight - grid.offsetHeight; // title, padding, border
      const available = body.clientHeight - reservedPx - chrome;
      let rows = Math.max(1, Math.floor(available / rowH));
      if (rows >= itemCount) rows = itemCount;
      setRowsPerColumn((prev) => (prev === rows ? prev : rows));
    };

    compute();
    const ro = new ResizeObserver(compute);
    if (body) ro.observe(body);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemCount, reservedPx, ...deps]);

  return [boxRef, Math.max(1, Math.min(rowsPerColumn, itemCount || 1))];
}
