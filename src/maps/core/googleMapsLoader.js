let googleMapsPromise = null;

export function loadGoogleMaps() {
  if (googleMapsPromise) return googleMapsPromise;

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error("Missing VITE_GOOGLE_MAPS_API_KEY");
  }

  // already loaded
  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-google-maps]");

    if (existing) {
      existing.addEventListener("load", () => resolve(window.google));
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");

    script.dataset.googleMaps = "true";

    // 🔥 CRITICAL FIX: REMOVE importLibrary dependency issues
    script.src =
      `https://maps.googleapis.com/maps/api/js` +
      `?key=${apiKey}` +
      `&libraries=places,geometry` +
      `&callback=initGoogleMaps`;

    script.async = true;
    script.defer = true;

    window.initGoogleMaps = () => {
      if (!window.google?.maps) {
        reject(new Error("Google Maps failed to initialize"));
        return;
      }

      console.log("✅ Google Maps loaded");
      resolve(window.google);
    };

    script.onerror = () => {
      reject(new Error("Failed to load Google Maps script"));
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}