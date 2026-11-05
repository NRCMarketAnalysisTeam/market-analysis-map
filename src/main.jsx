import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { LanguageProvider } from "./i18n/LanguageContext.jsx";
// Leaflet's own stylesheet is bundled with the app rather than loaded from a
// CDN, so the map still works if that outside site is slow or unreachable.
import "leaflet/dist/leaflet.css";
import "./styles/fonts.css";
import "./styles/tokens.css";
import "./styles/app.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>
);
