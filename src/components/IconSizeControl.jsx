import React from "react";
import { useStore, useIconScale } from "../store.js";
import { USER_STEPS } from "../iconScale.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

/*
  Toolbar group, next to Lock map:

    ICON SIZE
    [-]  68%  [+]  [Auto]

  Applies to all icons on the map. The percentage is the size icons are
  drawn at right now (100% = full size). With Auto on (the default) it
  drops as you zoom out. - and + make everything smaller or bigger on top
  of that. Clicking the percentage goes back to normal with Auto on.
*/
export default function IconSizeControl() {
  const { t } = useLanguage();
  const scale = useIconScale();
  const user = useStore((s) => s.iconSizeUser);
  const auto = useStore((s) => s.iconAutoSize);
  const stepIconSize = useStore((s) => s.stepIconSize);
  const resetIconSize = useStore((s) => s.resetIconSize);
  const toggleIconAutoSize = useStore((s) => s.toggleIconAutoSize);

  const atMin = user === USER_STEPS[0];
  const atMax = user === USER_STEPS[USER_STEPS.length - 1];

  return (
    <div className="tool-group">
      <span className="tool-group-label-top">{t("iconSize")}</span>
      <div className="icon-size-control" dir="ltr">
        <button
          className="icon-size-btn"
          onClick={() => stepIconSize(-1)}
          disabled={atMin}
          title={t("iconSmaller")}
          aria-label={t("iconSmaller")}
        >
          &minus;
        </button>
        <button className="icon-size-value" onClick={resetIconSize} title={t("iconSizeReset")}>
          {Math.round(scale * 100)}%
        </button>
        <button
          className="icon-size-btn"
          onClick={() => stepIconSize(1)}
          disabled={atMax}
          title={t("iconBigger")}
          aria-label={t("iconBigger")}
        >
          +
        </button>
        <button
          className={"icon-size-auto" + (auto ? " icon-size-auto--on" : "")}
          onClick={toggleIconAutoSize}
          aria-pressed={auto}
          title={t("iconAutoTitle")}
        >
          {t("iconAuto")}
        </button>
      </div>
    </div>
  );
}
