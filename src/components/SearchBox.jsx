import React, { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { trackEvent } from "../analytics.js";
import { useStore } from "../store.js";

/*
  Uses OpenStreetMap's public Nominatim geocoder — free, no API key, but
  rate-limited (usage policy: max ~1 request/second) and not meant for
  production-scale traffic. Fine for this tool's usage pattern (a person
  searching a handful of times per map). If this needs to scale to many
  concurrent users, swap for Mapbox/Google geocoding with an API key —
  the only thing that changes is the fetch URL and response parsing below.

  Renders inside the Toolbar now (not floating over the map, and outside
  the export frame entirely) — so it can't use react-leaflet's useMap()
  hook, which only works for descendants of MapContainer. It's driven by
  the mapRef passed down from App.jsx through Toolbar instead, pointing at
  the same Leaflet Map instance via MapContainer's own ref.
*/
export default function SearchBox({ mapRef }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const search = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&limit=6`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Location search request failed");
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Invalid location search response");
      setResults(data);
      setOpen(true);
      trackEvent("location_search_completed", {
        edition: useStore.getState().edition,
        result_count: data.length,
      });
    } catch (err) {
      trackEvent("location_search_failed", { edition: useStore.getState().edition });
      console.error("Location search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const goTo = (r) => {
    // Guard in case the map hasn't mounted yet — shouldn't normally happen
    // since the frame only renders once useAspectFit has a real size, but
    // cheap insurance against a race on very first load.
    if (mapRef.current) {
      mapRef.current.flyTo([parseFloat(r.lat), parseFloat(r.lon)], 15);
      trackEvent("search_result_selected", { edition: useStore.getState().edition });
    }
    setQuery(r.display_name);
    setOpen(false);
  };

  return (
    <div className="search-box">
      <div className="search-box-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") search();
          }}
          placeholder={t("searchPlaceholder")}
        />
        <button onClick={search} disabled={loading} title={t("searchButton")}>
          {loading ? "\u2026" : "\ud83d\udd0d"}
        </button>
      </div>
      {open && results.length > 0 && (
        <ul className="search-results">
          {results.map((r) => (
            <li key={r.place_id} onClick={() => goTo(r)}>
              {r.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
