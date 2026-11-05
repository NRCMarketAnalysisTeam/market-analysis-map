import { create } from "zustand";
import { trackEvent } from "./analytics.js";
import { pathKm } from "./geo.js";
import { stepUser, DEFAULT_USER_STEP, iconScaleFor } from "./iconScale.js";

// Current icon scale for components (re-renders when zoom or setting changes).
export const useIconScale = () =>
  useStore((s) => iconScaleFor(s.mapZoom, s.iconSizeUser, s.iconAutoSize));

/*
  The "document" is everything the user has placed on the map:
  - markers: {id, iconId, lat, lng, code, distance, label}
      code:     "MP1" / "SM1" style identifier, auto-suggested for
                market/source-market icons, editable via MarkerEditModal.
      distance: free-text distance note (e.g. "55.3 km - road"), meaning
                depends on icon type — distance from target population for
                a market, distance from its supplying marketplace for a
                source market.
      label:    freeform text for any other icon type.
  - lines: {id, points: [[lat,lng], ...], color, fromId, toId, noLink}
      fromId / toId: the marker the line's first / last point is snapped
      to (null if it starts or ends on open map). A line drawn from a
      source market to a marketplace (either direction) links the two
      automatically and supplies the distance. noLink is set when the
      user unticks that pair in the marketplace form, so the drawing stays
      but no longer counts as a supply link.
  - links: {id, mpId, smId, lineId, km, text}  -- which source market
      supplies which marketplace (many-to-many). km is the measured
      length of the linked supply line (or a saved Measure result); text
      is a typed distance that overrides km when filled in.
  - circles: {id, lat, lng, color, radius, markerId?}  -- market functionality
      indicator, radius is in screen pixels (CircleMarker). Standalone
      circles (no markerId) are user-resizable via a drag handle; circles
      attached to a marker (markerId set) auto-size to fit that marker's
      icon and hide the resize handle, since there's nothing to tune.
  - texts: {id, lat, lng, text}     -- freeform standalone labels

  lineDraft holds an in-progress line: {points, color, snaps} | null,
  where snaps[i] is the marker id point i is snapped to (or null).
  measureDraft is the Measure tool's ruler: {points, snaps, done} | null.
  It is never part of the map document and is never exported.
  selectedLineId is the committed line whose points are being edited. It's kept in
  the store (not component state) so the status banner and toolbar can both
  reflect drawing progress.
*/

let nextId = 1;
const id = () => String(nextId++);

// Standalone circles (not tied to any icon) keep a smaller default —
// there's nothing to fit around, so a modest starting size is fine.
const DEFAULT_CIRCLE_RADIUS = 16;
// Marker icons render at 32x32px, anchored at their center (see makeIcon()
// in MapCanvas.jsx) — so the icon's own edge sits 16px from that center.
// This radius is tuned to fully surround the icon with a bit of visible
// clearance rather than touching or clipping it, so a functionality
// circle attached to an MP/SM icon looks right immediately and the user
// doesn't need to manually resize it every time.
const MARKER_FUNCTIONALITY_CIRCLE_RADIUS = 26;

// Which edition the person picked on the landing page: "nrc" (NRC branding
// and NRC icons) or "humanitarian" (neutral branding, official OCHA icons).
// null means "show the landing page". Read from the address bar
// (?edition=nrc / ?edition=humanitarian) so an edition can be linked to
// directly and the browser Back button returns to the landing page.
export function readEditionFromUrl() {
  const e = new URLSearchParams(window.location.search).get("edition");
  return e === "nrc" || e === "humanitarian" ? e : null;
}

const CODED = new Set(["market", "source-market"]);

// Works out the market pair a line connects, if any: {mpId, smId} when one
// end is snapped to a marketplace and the other to a source market.
function linePair(line, markers) {
  if (!line.fromId || !line.toId || line.fromId === line.toId) return null;
  const a = markers.find((m) => m.id === line.fromId);
  const b = markers.find((m) => m.id === line.toId);
  if (!a || !b) return null;
  if (a.iconId === "market" && b.iconId === "source-market") return { mpId: a.id, smId: b.id };
  if (a.iconId === "source-market" && b.iconId === "market") return { mpId: b.id, smId: a.id };
  return null;
}

// Keeps links in step with the supply lines. Each SM-to-MP line creates or
// updates the link for that pair with the line's measured length. A link
// whose line was deleted (or re-routed) keeps its last distance, so no
// figure the user relied on silently disappears.
export function syncLinks(lines, markers, links) {
  const next = links.map((l) => ({ ...l }));
  const claimed = new Set();
  for (const line of lines) {
    if (line.noLink) continue;
    const pair = linePair(line, markers);
    if (!pair) continue;
    const km = pathKm(line.points);
    let link = next.find((l) => l.mpId === pair.mpId && l.smId === pair.smId);
    if (!link) {
      link = { id: id(), ...pair, lineId: null, km: null, text: "" };
      next.push(link);
    }
    if (claimed.has(link.id)) continue; // two lines for one pair: first wins
    claimed.add(link.id);
    link.lineId = line.id;
    link.km = km;
  }
  for (const link of next) {
    if (link.lineId && !claimed.has(link.id)) link.lineId = null;
  }
  return next;
}

export const useStore = create((set, get) => ({
  edition: readEditionFromUrl(),
  title: "Marketplace map: [Insert marketplace name], [date]",
  mapType: "marketplace", // 'marketplace' | 'supply-route'
  greyscale: true,

  markers: [],
  lines: [],
  circles: [],
  texts: [],
  links: [],

  mpCounter: 1,
  smCounter: 1,

  mapLocked: false,

  // Icon size (see iconScale.js): current map zoom, the person's own
  // bigger/smaller setting, and whether icons shrink when zooming out.
  mapZoom: 2,
  iconSizeUser: DEFAULT_USER_STEP,
  iconAutoSize: true,

  activeTool: "select", // 'select' | 'place-icon' | 'draw-line' | 'place-circle' | 'place-text'
  activeIconId: null,
  activeLineColor: "green",
  activeCircleColor: "green",

  lineDraft: null, // {points: [[lat,lng],...], color, snaps}
  measureDraft: null, // {points, snaps, done}
  selectedLineId: null,
  editingMarkerId: null,

  setTitle: (title) => set({ title }),
  setEdition: (edition) =>
    set({ edition, activeTool: "select", activeIconId: null, lineDraft: null, measureDraft: null, selectedLineId: null }),
  toggleGreyscale: () => set((s) => ({ greyscale: !s.greyscale })),
  toggleMapLock: () => set((s) => ({ mapLocked: !s.mapLocked })),
  setMapZoom: (mapZoom) => set({ mapZoom }),
  stepIconSize: (dir) => set((s) => ({ iconSizeUser: stepUser(s.iconSizeUser, dir) })),
  resetIconSize: () => set({ iconSizeUser: DEFAULT_USER_STEP, iconAutoSize: true }),
  toggleIconAutoSize: () => set((s) => ({ iconAutoSize: !s.iconAutoSize })),

  setActiveTool: (tool, extra = {}) => {
    // switching tools abandons any in-progress line so the map never
    // ends up with a half-drawn, unfinishable line
    set({ activeTool: tool, lineDraft: null, measureDraft: null, selectedLineId: null, ...extra });
    trackEvent("map_tool_selected", { edition: get().edition, tool });
  },

  cancelTool: () =>
    set({ activeTool: "select", lineDraft: null, measureDraft: null, activeIconId: null, selectedLineId: null }),

  addMarker: (iconId, lat, lng) => {
    const newId = id();
    set((s) => {
      let code = "";
      let mpCounter = s.mpCounter;
      let smCounter = s.smCounter;
      if (iconId === "market") {
        code = `MP${s.mpCounter}`;
        mpCounter = s.mpCounter + 1;
      } else if (iconId === "source-market") {
        code = `SM${s.smCounter}`;
        smCounter = s.smCounter + 1;
      }
      return {
        markers: [
          ...s.markers,
          { id: newId, iconId, lat, lng, code, distance: "", label: "" },
        ],
        mpCounter,
        smCounter,
      };
    });
    trackEvent("map_element_added", { edition: get().edition, kind: "marker" });
    return newId;
  },

  updateMarker: (markerId, patch) =>
    set((s) => ({
      markers: s.markers.map((m) => (m.id === markerId ? { ...m, ...patch } : m)),
    })),

  // Moving an icon also moves the end of any line snapped to it, so the
  // line and its measured distance stay attached.
  moveMarker: (markerId, lat, lng) =>
    set((s) => {
      const markers = s.markers.map((m) => (m.id === markerId ? { ...m, lat, lng } : m));
      const lines = s.lines.map((l) => {
        if (l.fromId !== markerId && l.toId !== markerId) return l;
        const points = l.points.map((p) => [...p]);
        if (l.fromId === markerId) points[0] = [lat, lng];
        if (l.toId === markerId) points[points.length - 1] = [lat, lng];
        return { ...l, points };
      });
      const circles = s.circles.map((c) => (c.markerId === markerId ? { ...c, lat, lng } : c));
      return { markers, lines, circles, links: syncLinks(lines, markers, s.links) };
    }),

  removeMarker: (markerId) =>
    set((s) => {
      const markers = s.markers.filter((m) => m.id !== markerId);
      const lines = s.lines.map((l) =>
        l.fromId === markerId || l.toId === markerId
          ? { ...l, fromId: l.fromId === markerId ? null : l.fromId, toId: l.toId === markerId ? null : l.toId }
          : l
      );
      const links = s.links.filter((l) => l.mpId !== markerId && l.smId !== markerId);
      return {
        markers,
        lines,
        links: syncLinks(lines, markers, links),
        // remove any functionality circle attached to this marker too
        circles: s.circles.filter((c) => c.markerId !== markerId),
      };
    }),

  // Saves the "Supplied by" (marketplace) or "Supplies" (source market)
  // checklist from the icon form. entries: [{otherId, checked, text}].
  setLinksForMarker: (markerId, entries) =>
    set((s) => {
      const me = s.markers.find((m) => m.id === markerId);
      if (!me) return {};
      const isMp = me.iconId === "market";
      let links = s.links.map((l) => ({ ...l }));
      let lines = s.lines;
      for (const { otherId, checked, text } of entries) {
        const mpId = isMp ? markerId : otherId;
        const smId = isMp ? otherId : markerId;
        const existing = links.find((l) => l.mpId === mpId && l.smId === smId);
        const pairLines = lines.filter((l) => {
          const p = linePair(l, s.markers);
          return p && p.mpId === mpId && p.smId === smId;
        });
        if (checked) {
          if (existing) existing.text = (text || "").trim();
          else links.push({ id: id(), mpId, smId, lineId: null, km: null, text: (text || "").trim() });
          if (pairLines.some((l) => l.noLink)) {
            lines = lines.map((l) => (pairLines.includes(l) ? { ...l, noLink: false } : l));
          }
        } else if (existing) {
          links = links.filter((l) => l !== existing);
          // keep the drawing, but stop it re-creating the link
          if (pairLines.length) {
            lines = lines.map((l) => (pairLines.includes(l) ? { ...l, noLink: true } : l));
          }
        }
      }
      return { lines, links: syncLinks(lines, s.markers, links) };
    }),

  setEditingMarkerId: (markerId) => set({ editingMarkerId: markerId }),
  closeEditingMarker: () => set({ editingMarkerId: null }),

  // ---- Lines (drafted point-by-point, then committed) ----
  startLineDraft: (color) => set({ lineDraft: { points: [], color, snaps: [] } }),

  // markerId: the icon this point is snapped to, if any (see DrawingLayer).
  addLineDraftPoint: (lat, lng, markerId = null) =>
    set((s) => {
      if (!s.lineDraft) return {};
      return {
        lineDraft: {
          ...s.lineDraft,
          points: [...s.lineDraft.points, [lat, lng]],
          snaps: [...(s.lineDraft.snaps || []), markerId],
        },
      };
    }),

  // Removes just the most recently clicked point — for a misclick mid-line,
  // without losing the whole line. Keeps the draft (and colour) alive even
  // if it empties out, so the next click starts the line over in place.
  undoLastLinePoint: () =>
    set((s) => {
      if (!s.lineDraft || s.lineDraft.points.length === 0) return {};
      return {
        lineDraft: {
          ...s.lineDraft,
          points: s.lineDraft.points.slice(0, -1),
          snaps: (s.lineDraft.snaps || []).slice(0, -1),
        },
      };
    }),

  finishLineDraft: () => {
    const completed = get().lineDraft?.points.length >= 2;
    set((s) => {
      if (!s.lineDraft || s.lineDraft.points.length < 2) return { lineDraft: null };
      const snaps = s.lineDraft.snaps || [];
      const line = {
        id: id(),
        points: s.lineDraft.points,
        color: s.lineDraft.color,
        fromId: snaps[0] || null,
        toId: snaps[s.lineDraft.points.length - 1] || null,
        noLink: false,
      };
      const lines = [...s.lines, line];
      return { lines, links: syncLinks(lines, s.markers, s.links), lineDraft: null };
    });
    if (completed) {
      trackEvent("map_element_added", { edition: get().edition, kind: "route" });
    }
  },

  cancelLineDraft: () => set({ lineDraft: null }),

  removeLine: (lineId) =>
    set((s) => {
      const lines = s.lines.filter((l) => l.id !== lineId);
      return {
        lines,
        links: syncLinks(lines, s.markers, s.links),
        selectedLineId: s.selectedLineId === lineId ? null : s.selectedLineId,
      };
    }),

  selectLine: (lineId) => set({ selectedLineId: lineId }),

  // Editing a committed line's points (drag handles). fromId / toId are
  // passed when an end point is dropped on, or pulled off, an icon.
  updateLine: (lineId, patch) =>
    set((s) => {
      const lines = s.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l));
      return { lines, links: syncLinks(lines, s.markers, s.links) };
    }),

  // ---- Measure tool (a ruler, never part of the printed map) ----
  addMeasurePoint: (lat, lng, markerId = null) =>
    set((s) => {
      const d = s.measureDraft && !s.measureDraft.done ? s.measureDraft : { points: [], snaps: [], done: false };
      return { measureDraft: { ...d, points: [...d.points, [lat, lng]], snaps: [...d.snaps, markerId] } };
    }),

  undoMeasurePoint: () =>
    set((s) => {
      if (!s.measureDraft || s.measureDraft.done || !s.measureDraft.points.length) return {};
      return {
        measureDraft: {
          ...s.measureDraft,
          points: s.measureDraft.points.slice(0, -1),
          snaps: s.measureDraft.snaps.slice(0, -1),
        },
      };
    }),

  finishMeasure: () =>
    set((s) => {
      if (!s.measureDraft || s.measureDraft.points.length < 2) return {};
      return { measureDraft: { ...s.measureDraft, done: true } };
    }),

  clearMeasure: () => set({ measureDraft: null }),

  // Saves a measured distance onto a marketplace (distance from the target
  // population) — stored as text, like a typed distance.
  saveMeasureAsTargetDistance: (mpId, text) =>
    set((s) => ({
      markers: s.markers.map((m) => (m.id === mpId ? { ...m, distance: text } : m)),
      measureDraft: null,
      activeTool: "select",
    })),

  // Saves a measured distance as the supply distance between a source
  // market and a marketplace, creating the link if it does not exist.
  saveMeasureAsLink: (mpId, smId, text) =>
    set((s) => {
      let links = s.links.map((l) => ({ ...l }));
      const existing = links.find((l) => l.mpId === mpId && l.smId === smId);
      if (existing) existing.text = text;
      else links.push({ id: id(), mpId, smId, lineId: null, km: null, text });
      return { links, measureDraft: null, activeTool: "select" };
    }),

  // ---- Circles ----
  // Standalone circle, placed anywhere (not tied to an icon).
  addCircle: (lat, lng, color) => {
    set((s) => ({
      circles: [
        ...s.circles,
        { id: id(), lat, lng, color: color || s.activeCircleColor, radius: DEFAULT_CIRCLE_RADIUS },
      ],
    }));
    trackEvent("map_element_added", { edition: get().edition, kind: "circle" });
  },

  // Circle attached to a specific marker (e.g. wraps an MP/SM icon).
  // Clicking directly on top of an existing icon can't be used to place a
  // free circle there (Leaflet markers intercept the click before it
  // reaches the map), so this is how a functionality circle gets aligned
  // exactly to an icon: called from the marker's own edit modal, using the
  // marker's own coordinates. Upserts — one circle per marker.
  setMarkerFunctionality: (markerId, lat, lng, color) =>
    set((s) => {
      const existing = s.circles.find((c) => c.markerId === markerId);
      if (existing) {
        return {
          circles: s.circles.map((c) => (c.markerId === markerId ? { ...c, color } : c)),
        };
      }
      return {
        circles: [
          ...s.circles,
          { id: id(), markerId, lat, lng, color, radius: MARKER_FUNCTIONALITY_CIRCLE_RADIUS },
        ],
      };
    }),

  removeMarkerFunctionality: (markerId) =>
    set((s) => ({ circles: s.circles.filter((c) => c.markerId !== markerId) })),

  // Keeps an attached circle centred on its marker when the marker is dragged.
  syncCirclePositionToMarker: (markerId, lat, lng) =>
    set((s) => ({
      circles: s.circles.map((c) => (c.markerId === markerId ? { ...c, lat, lng } : c)),
    })),

  updateCircle: (circleId, patch) =>
    set((s) => ({
      circles: s.circles.map((c) => (c.id === circleId ? { ...c, ...patch } : c)),
    })),

  removeCircle: (circleId) =>
    set((s) => ({ circles: s.circles.filter((c) => c.id !== circleId) })),

  // ---- Freeform text ----
  addText: (lat, lng, text) => {
    set((s) => ({ texts: [...s.texts, { id: id(), lat, lng, text }] }));
    trackEvent("map_element_added", { edition: get().edition, kind: "label" });
  },

  updateText: (textId, patch) =>
    set((s) => ({
      texts: s.texts.map((t) => (t.id === textId ? { ...t, ...patch } : t)),
    })),

  removeText: (textId) =>
    set((s) => ({ texts: s.texts.filter((t) => t.id !== textId) })),

  // Icons actually used on the map right now -> drives the auto-generated legend
  usedIconIds: () => {
    const s = get();
    return [...new Set(s.markers.map((m) => m.iconId))];
  },

  reset: () =>
    set({
      markers: [],
      lines: [],
      circles: [],
      texts: [],
      links: [],
      lineDraft: null,
      measureDraft: null,
      selectedLineId: null,
      mpCounter: 1,
      smCounter: 1,
    }),
}));
