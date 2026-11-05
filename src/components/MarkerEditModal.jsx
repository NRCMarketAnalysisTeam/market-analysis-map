import React, { useEffect, useState } from "react";
import { useStore } from "../store.js";
import { useIcons } from "../icons.js";
import { COLOR_ORDER, hexFor } from "../colors.js";
import { formatKm } from "../geo.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

// Builds the checklist rows for a marketplace ("Supplied by" source
// markets) or a source market ("Supplies" marketplaces) from the links in
// the store. One link per SM/MP pair; many pairs per market are allowed.
function initialLinkRows(marker, markers, links) {
  const isMp = marker.iconId === "market";
  const others = markers.filter((m) => m.iconId === (isMp ? "source-market" : "market"));
  return others.map((o) => {
    const link = links.find((l) =>
      isMp ? l.mpId === marker.id && l.smId === o.id : l.smId === marker.id && l.mpId === o.id
    );
    return {
      otherId: o.id,
      checked: !!link,
      text: link?.text || "",
      km: link?.km ?? null,
      fromLine: !!link?.lineId,
    };
  });
}

export default function MarkerEditModal() {
  const { t, tIcon, lang } = useLanguage();
  const { ICONS_BY_ID } = useIcons();
  const editingMarkerId = useStore((s) => s.editingMarkerId);
  const markers = useStore((s) => s.markers);
  const circles = useStore((s) => s.circles);
  const links = useStore((s) => s.links);
  const updateMarker = useStore((s) => s.updateMarker);
  const removeMarker = useStore((s) => s.removeMarker);
  const closeEditingMarker = useStore((s) => s.closeEditingMarker);
  const setMarkerFunctionality = useStore((s) => s.setMarkerFunctionality);
  const removeMarkerFunctionality = useStore((s) => s.removeMarkerFunctionality);
  const setLinksForMarker = useStore((s) => s.setLinksForMarker);

  const marker = markers.find((m) => m.id === editingMarkerId);
  const linkedCircle = marker ? circles.find((c) => c.markerId === marker.id) : null;

  const [code, setCode] = useState("");
  const [distance, setDistance] = useState("");
  const [label, setLabel] = useState("");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (marker) {
      setCode(marker.code || "");
      setDistance(marker.distance || "");
      setLabel(marker.label || "");
      if (marker.iconId === "market" || marker.iconId === "source-market") {
        setRows(initialLinkRows(marker, markers, links));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marker?.id]);

  if (!marker) return null;

  const icon = ICONS_BY_ID[marker.iconId];
  const isMarket = marker.iconId === "market";
  const isSourceMarket = marker.iconId === "source-market";
  const isCoded = isMarket || isSourceMarket;
  const unit = t("unitKm");

  const handleSave = () => {
    if (isCoded) {
      const patch = { code: code.trim() };
      if (isMarket) patch.distance = distance.trim();
      updateMarker(marker.id, patch);
      setLinksForMarker(
        marker.id,
        rows.map((r) => ({ otherId: r.otherId, checked: r.checked, text: r.text }))
      );
    } else {
      updateMarker(marker.id, { label: label.trim() });
    }
    closeEditingMarker();
  };

  const handleDelete = () => {
    removeMarker(marker.id);
    closeEditingMarker();
  };

  const setRow = (otherId, patch) =>
    setRows((rs) => rs.map((r) => (r.otherId === otherId ? { ...r, ...patch } : r)));

  const codeOf = (id) => markers.find((m) => m.id === id)?.code || "?";

  return (
    <div className="modal-backdrop" onClick={closeEditingMarker}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <img src={icon.url} alt="" className="modal-icon" />
          <span>{tIcon(marker.iconId)}</span>
        </div>

        {isCoded ? (
          <>
            <label className="modal-field">
              <span>{isMarket ? t("marketplaceCode") : t("sourceMarketCode")}</span>
              <input
                autoFocus
                value={code}
                dir="auto"
                onChange={(e) => setCode(e.target.value)}
                placeholder={isMarket ? "MP1" : "SM1"}
              />
            </label>

            {isMarket && (
              <label className="modal-field">
                <span>{t("distanceFromTargetPop")}</span>
                <input
                  value={distance}
                  dir="auto"
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder={t("targetDistancePlaceholder")}
                />
                <small>{t("measureTip")}</small>
              </label>
            )}

            <div className="modal-field">
              <span>{isMarket ? t("suppliedBy") : t("supplies")}</span>
              {rows.length === 0 ? (
                <small>{isMarket ? t("noSourceMarketsYet") : t("noMarketplacesYet")}</small>
              ) : (
                <div className="link-list">
                  {rows.map((r) => {
                    const lineKm = r.km != null ? formatKm(r.km, lang, unit) : "";
                    return (
                      <div key={r.otherId} className={"link-row" + (r.checked ? " link-row--on" : "")}>
                        <label className="link-check">
                          <input
                            type="checkbox"
                            checked={r.checked}
                            onChange={(e) => setRow(r.otherId, { checked: e.target.checked })}
                          />
                          <span className="link-code">{codeOf(r.otherId)}</span>
                        </label>
                        <input
                          className="link-km"
                          dir="auto"
                          value={r.text}
                          disabled={!r.checked}
                          onChange={(e) => setRow(r.otherId, { text: e.target.value })}
                          placeholder={lineKm || t("distancePlaceholder")}
                          aria-label={t("distance")}
                        />
                        {r.checked && r.fromLine && !r.text && (
                          <span className="link-tag">{t("fromSupplyLine")}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <small>{isMarket ? t("suppliedByHint") : t("suppliesHint")}</small>
            </div>

            <div className="modal-field">
              <span>{t("marketFunctionalityCircle")}</span>
              <div className="modal-swatch-row">
                {COLOR_ORDER.map((c) => (
                  <button
                    key={c}
                    className={
                      "circle-swatch" + (linkedCircle?.color === c ? " circle-swatch--active" : "")
                    }
                    style={{ background: hexFor(c) }}
                    title={c}
                    onClick={() => setMarkerFunctionality(marker.id, marker.lat, marker.lng, c)}
                  />
                ))}
                {linkedCircle && (
                  <button
                    className="tool-btn tool-btn--small"
                    onClick={() => removeMarkerFunctionality(marker.id)}
                  >
                    {t("remove")}
                  </button>
                )}
              </div>
              <small>{t("circleHint")}</small>
            </div>
          </>
        ) : (
          <label className="modal-field">
            <span>{t("labelOptional")}</span>
            <input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("labelPlaceholder")}
            />
          </label>
        )}

        <div className="modal-actions">
          <button className="tool-btn tool-btn--danger" onClick={handleDelete}>
            {t("deleteIcon")}
          </button>
          <div className="modal-actions-right">
            <button className="tool-btn" onClick={closeEditingMarker}>
              {t("cancel")}
            </button>
            <button className="tool-btn tool-btn--primary" onClick={handleSave}>
              {t("save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
