import { createContext, useContext, useEffect, useState } from "react";
import { loadGoogleMaps } from "./googleMapsLoader";

const GoogleMapsContext = createContext(null);

export function useGoogleMaps() {
  return useContext(GoogleMapsContext);
}

export default function GoogleMapsProvider({ children }) {
  const [google, setGoogle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        setLoading(true);

        const g = await loadGoogleMaps();

        if (!isMounted) return;

        // ✅ Only assign google object — no importLibrary usage anywhere
        setGoogle(g);
        setError(null);
      } catch (err) {
        if (!isMounted) return;

        console.error("Google Maps failed to load:", err);
        setError(err);
        setGoogle(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <GoogleMapsContext.Provider value={{ google, loading, error }}>
      {children}
    </GoogleMapsContext.Provider>
  );
}