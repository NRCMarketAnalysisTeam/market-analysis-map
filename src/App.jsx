import React, { useRef, useState } from "react";
import IconPalette from "./components/IconPalette.jsx";
import Toolbar from "./components/Toolbar.jsx";
import MapCanvas from "./components/MapCanvas.jsx";
import MapTitleBanner from "./components/MapTitleBanner.jsx";
import Legend from "./components/Legend.jsx";
import DistanceList from "./components/DistanceList.jsx";
import StatusBanner from "./components/StatusBanner.jsx";
import MarkerEditModal from "./components/MarkerEditModal.jsx";
import HelpOverlay from "./components/HelpOverlay.jsx";
import LandingPage from "./components/LandingPage.jsx";
import LegalDialog, { useLegal } from "./components/LegalDialog.jsx";
import EuEmblem from "./components/EuEmblem.jsx";
import { useLanguage } from "./i18n/LanguageContext.jsx";
import { exportMapToPng } from "./export.js";
import { useStore, readEditionFromUrl } from "./store.js";
import { useAspectFit } from "./useAspectFit.js";
import { PAPER_ASPECT_RATIO } from "./paperSize.js";
import { trackEvent } from "./analytics.js";

function Editor({ edition, onHome, onLegal }) {
  const L = useLegal();
  const { t } = useLanguage();
  const exportFrameRef = useRef(null);
  const mapRef = useRef(null);

  const [exporting, setExporting] = useState(false);
  const [showHelp, setShowHelp] = useState(() => window.location.hash === "#help");

  const title = useStore((s) => s.title);

  const [mapAreaRef, frameSize] = useAspectFit(PAPER_ASPECT_RATIO, 10);

  const openHelp = () => {
    trackEvent("help_opened", { edition });
    window.history.replaceState(null, "", "#help");
    setShowHelp(true);
  };

  const closeHelp = () => {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setShowHelp(false);
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!exportFrameRef.current || exporting) return;
    // Drawing aids (unfinished lines, the Measure ruler, point handles)
    // are editing tools, not part of the printed map.
    const st = useStore.getState();
    if (st.lineDraft || st.measureDraft || st.selectedLineId) st.cancelTool();
    setExporting(true);
    trackEvent("png_export_started", { edition });
    try {
      const filename = title.replace(/[^\w\- ]/g, "").trim() || "market-map";
      await exportMapToPng(exportFrameRef.current, `${filename}.png`);
      trackEvent("png_export_succeeded", { edition });
    } catch (err) {
      trackEvent("png_export_failed", { edition });
      console.error("Export failed:", err);
      alert("Export failed. See the comment in src/export.js for common causes.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="app" data-edition={edition}>
      <Toolbar
        onHome={onHome}
        onExport={handleExport}
        exporting={exporting}
        mapRef={mapRef}
        onHowToUse={openHelp}
      />
      <div className="app-body">
        <IconPalette />
        <div className="map-column">
          <div className="map-area" ref={mapAreaRef}>
            <StatusBanner />
            {frameSize.width > 0 && (
              <div
                className="export-frame"
                ref={exportFrameRef}
                style={{ width: frameSize.width, height: frameSize.height }}
              >
                <MapTitleBanner frameHeight={frameSize.height} />
                <div className="map-body">
                  <MapCanvas mapRef={mapRef} />
                  <Legend frameWidth={frameSize.width} />
                  <DistanceList frameWidth={frameSize.width} />
                </div>
              </div>
            )}
          </div>
          {/* Safety reminder, legal links and EU emblem, outside the export
              frame so they never appear in a downloaded image. */}
          <div className="editor-footnote">
            <span className="editor-footnote-note">{L.safetyNote}</span>
            <span className="editor-footnote-links">
              <button type="button" onClick={() => onLegal("terms")}>{L.termsLink}</button>
              <button type="button" onClick={() => onLegal("privacy")}>{L.privacyLink}</button>
              {/* EU funding acknowledgement on every editor screen, since
                  edition links can skip the landing page. Outside the export
                  frame, so it never appears on users' downloaded maps. */}
              <EuEmblem text={t("fundedByEu")} height={38} />
            </span>
          </div>
        </div>
      </div>

      <MarkerEditModal />
      {showHelp && <HelpOverlay onClose={closeHelp} />}
    </div>
  );
}

// Top level: the landing page until an edition is chosen, then the editor.
// The choice lives in the address bar (?edition=nrc or ?edition=humanitarian)
// so the browser Back button returns to the landing page and either edition
// can be shared as a direct link. The editor is its own component so its
// layout hooks (useAspectFit) mount fresh when it first appears.
export default function App() {
  const edition = useStore((s) => s.edition);
  const setEdition = useStore((s) => s.setEdition);

  React.useEffect(() => {
    const onPop = () => setEdition(readEditionFromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [setEdition]);

  const go = (next) => {
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("edition", next);
    else url.searchParams.delete("edition");
    url.hash = "";
    window.history.pushState(null, "", url);
    setEdition(next);
    trackEvent(next ? "edition_selected" : "editor_returned_home", {
      edition: next || edition,
    });
    window.scrollTo(0, 0);
  };

  const [legalPage, setLegalPage] = useState(null);
  const legalDialog = legalPage && (
    <LegalDialog page={legalPage} onSwitch={setLegalPage} onClose={() => setLegalPage(null)} />
  );

  if (!edition) {
    return (
      <>
        <LandingPage onChoose={go} onLegal={setLegalPage} />
        {legalDialog}
      </>
    );
  }
  return (
    <div className="edition-root" data-edition={edition}>
      <Editor edition={edition} onHome={() => go(null)} onLegal={setLegalPage} />
      {legalDialog}
    </div>
  );
}
