import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import GoogleMapsProvider from "./maps/core/GoogleMapsProvider";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleMapsProvider>
      <App />
    </GoogleMapsProvider>
  </React.StrictMode>
);