import { useEffect, useRef, useState } from "react";
import { TextField, CircularProgress } from "@mui/material";
import { useGoogleMaps } from "../core/GoogleMapsProvider";

export default function PlacesAutocomplete({
  value,
  onChange,
  onPlaceSelected,
  label = "Street Address",
  helperText = "Begin typing and choose an address.",
}) {
  const { google, loading } = useGoogleMaps();

  const containerRef = useRef(null);
  const widgetRef = useRef(null);

  const [ready, setReady] = useState(false);

  // -----------------------------
  // INIT PLACE AUTOCOMPLETE
  // -----------------------------
  useEffect(() => {
    if (!google || loading) return;
    if (!containerRef.current) return;
    if (widgetRef.current) return;

    async function init() {
      try {
        // NEW Google recommended API
        const { PlaceAutocompleteElement } =
          await google.maps.importLibrary("places");

        const widget = new PlaceAutocompleteElement({
          inputElement: document.createElement("input"),
        });

        widgetRef.current = widget;

        // Attach internal input to our container
        containerRef.current.appendChild(widget);

        widget.addEventListener("gmp-select", async (event) => {
          try {
            const placePrediction = event.placePrediction;

            if (!placePrediction) return;

            const place = placePrediction.toPlace();

            await place.fetchFields({
              fields: [
                "displayName",
                "formattedAddress",
                "location",
                "addressComponents",
              ],
            });

            const result = place;

            const components = result.addressComponents || [];

            const get = (type) =>
              components.find((c) =>
                c.types.includes(type)
              )?.longText || "";

            const structured = {
              address: result.formattedAddress || "",
              city: get("locality"),
              state: get("administrative_area_level_1"),
              zip: get("postal_code"),
              lat: result.location?.lat?.(),
              lng: result.location?.lng?.(),
            };

            onPlaceSelected?.(structured);
          } catch (err) {
            console.error("Place selection error:", err);
          }
        });

        setReady(true);
      } catch (err) {
        console.error("Places init failed:", err);
      }
    }

    init();
  }, [google, loading, onPlaceSelected]);

  // -----------------------------
  // SYNC VALUE DISPLAY (fallback UI)
  // -----------------------------
  useEffect(() => {
    if (!widgetRef.current) return;

    // Best-effort sync if parent controls value
    const input = widgetRef.current.querySelector?.("input");
    if (input && value !== undefined) {
      input.value = value;
    }
  }, [value]);

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={containerRef}
        style={{
          width: "100%",
          position: "relative",
          zIndex: 1,
        }}
      />

      {!ready && (
        <div
          style={{
            position: "absolute",
            right: 10,
            top: 14,
          }}
        >
          <CircularProgress size={18} />
        </div>
      )}

      {!ready && (
        <TextField
          fullWidth
          label={label}
          value={value}
          onChange={onChange}
          helperText={helperText}
          disabled
          style={{ marginTop: 8 }}
        />
      )}
    </div>
  );
}