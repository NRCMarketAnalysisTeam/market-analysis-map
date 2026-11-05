import nrcManifest from "./assets/icons/manifest.json";
import ochaManifest from "./assets/icons-ocha/manifest.json";
import { useStore } from "./store.js";

// Two icon sets that share the SAME icon ids, categories and translations:
//  - "nrc":          NRC's own adaptation of the humanitarian icons, in NRC orange.
//  - "humanitarian": the official OCHA Humanitarian Icons (public domain,
//                    https://github.com/UN-OCHA/humanitarian-icons), in UN blue.
// Because the ids match, everything placed on the map, the legend, the edit
// form and all labels work identically in both editions. Only the artwork
// changes. OCHA has no "factory" icon, so "source-market" uses OCHA's
// "Trade and market" icon in the humanitarian edition.
const nrcSvgs = import.meta.glob("./assets/icons/*.svg", { eager: true, query: "?url", import: "default" });
const ochaSvgs = import.meta.glob("./assets/icons-ocha/*.svg", { eager: true, query: "?url", import: "default" });

function buildSet(manifest, svgs, folder) {
  const icons = manifest.map((entry) => ({
    ...entry,
    url: svgs[`./assets/${folder}/${entry.file}`],
  }));
  return {
    ICONS: icons,
    ICONS_BY_ID: Object.fromEntries(icons.map((i) => [i.id, i])),
    ICON_CATEGORIES: [...new Set(icons.map((i) => i.category))],
  };
}

export const ICON_SETS = {
  nrc: buildSet(nrcManifest, nrcSvgs, "icons"),
  humanitarian: buildSet(ochaManifest, ochaSvgs, "icons-ocha"),
};

export function getIconSet(edition) {
  return ICON_SETS[edition] || ICON_SETS.nrc;
}

// Components call this instead of importing a fixed icon list, so switching
// edition re-renders every icon (dock, drawer, map, legend, edit form).
export function useIcons() {
  const edition = useStore((s) => s.edition);
  return getIconSet(edition);
}

// Kept for any code that still imports the NRC set directly.
export const { ICONS, ICONS_BY_ID, ICON_CATEGORIES } = ICON_SETS.nrc;
