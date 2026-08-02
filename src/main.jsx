import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import GoogleMapsProvider from "./maps/core/GoogleMapsProvider";

async function registerServiceWorker() {
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register(
        "/sw.js",
        { scope: "/" }
      );

      console.log(
        "Backyard Relief service worker registered:",
        registration.scope
      );
    } catch (error) {
      console.error("Service worker registration failed:", error);
    }
  }
}

window.addEventListener("load", registerServiceWorker);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleMapsProvider>
      <App />
    </GoogleMapsProvider>
  </React.StrictMode>
);
