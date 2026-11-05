import React, { useState } from "react";
import { useIcons } from "../icons.js";
import { useStore } from "../store.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

// Two views of the same icon set:
// - .icon-dock: always visible, icon-only, ~64px wide. Hovering an icon
//   shows its name via the native title attribute (no custom tooltip
//   component needed). This replaces the old bottom icon-strip, which ate
//   120px of vertical space — the scarce dimension on a laptop screen.
// - .icon-drawer: an overlay opened by the dock's toggle button, showing
//   the full grid with names and categories (the original sidebar
//   layout) for actually browsing/picking. Selecting an icon closes it
//   automatically, since the next step is always "click the map."
//
// The dock also carries a small "Label" entry (place-text tool) at the
// top, separate from the manifest icons — it used to be its own button in
// the Toolbar, which was one of the things pushing Download PNG off-screen
// on laptop widths. Moved here instead of dropped, so the capability isn't
// lost, just relocated somewhere that doesn't compete for toolbar width.
export default function IconPalette() {
  const { t, tIcon, tCategory } = useLanguage();
  const activeTool = useStore((s) => s.activeTool);
  const activeIconId = useStore((s) => s.activeIconId);
  const setActiveTool = useStore((s) => s.setActiveTool);
  const [expanded, setExpanded] = useState(false);
  const { ICONS, ICON_CATEGORIES } = useIcons();

  const selectIcon = (iconId) => {
    setActiveTool("place-icon", { activeIconId: iconId });
    setExpanded(false);
  };

  const selectLabelTool = () => {
    setActiveTool("place-text");
    setExpanded(false);
  };

  const isActive = (iconId) => activeTool === "place-icon" && activeIconId === iconId;
  const isLabelActive = activeTool === "place-text";

  return (
    <>
      <div className="icon-dock">
        <button
          className="icon-dock-toggle"
          onClick={() => setExpanded(true)}
          title={t("sidebarIconsTitle")}
        >
          {"\u2630"}
        </button>
        <div className="icon-dock-list">
          <button
            className={"icon-dock-item icon-dock-item--label" + (isLabelActive ? " icon-dock-item--active" : "")}
            title={t("label")}
            onClick={selectLabelTool}
          >
            Aa
          </button>
          {ICONS.map((icon) => {
            const label = tIcon(icon.id);
            return (
              <button
                key={icon.id}
                className={"icon-dock-item" + (isActive(icon.id) ? " icon-dock-item--active" : "")}
                title={label}
                onClick={() => selectIcon(icon.id)}
              >
                <img src={icon.url} alt={label} />
              </button>
            );
          })}
        </div>
      </div>

      {expanded && (
        <div className="icon-drawer-backdrop" onClick={() => setExpanded(false)}>
          <div className="icon-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="icon-drawer-header">
              <span>{t("sidebarIconsTitle")}</span>
              <button className="icon-drawer-close" onClick={() => setExpanded(false)}>
                {"\u2715"}
              </button>
            </div>
            <p className="sidebar-hint">{t("sidebarHint")}</p>
            {ICON_CATEGORIES.map((category) => (
              <div key={category} className="icon-category">
                <div className="icon-category-label">{tCategory(category)}</div>
                <div className="icon-grid">
                  {ICONS.filter((i) => i.category === category).map((icon) => {
                    const label = tIcon(icon.id);
                    return (
                      <button
                        key={icon.id}
                        className={"icon-tile" + (isActive(icon.id) ? " icon-tile--active" : "")}
                        title={label}
                        onClick={() => selectIcon(icon.id)}
                      >
                        <img src={icon.url} alt={label} />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
