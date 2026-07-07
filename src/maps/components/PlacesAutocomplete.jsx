import { useEffect, useRef } from "react";
import { TextField } from "@mui/material";
import { useGoogleMaps } from "../core/GoogleMapsProvider";

export default function PlacesAutocomplete({
  value,
  onChange,
  onPlaceSelected,
  label = "Search Address",
  helperText = "Begin typing and choose an address.",
}) {
  const { google, loading } = useGoogleMaps();

  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    if (!google || loading) return;
    if (!inputRef.current) return;
    if (autocompleteRef.current) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ["formatted_address", "geometry", "address_components"],
      types: ["address"],
      componentRestrictions: { country: "us" },
    });

    autocompleteRef.current = autocomplete;

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();

      const components = place.address_components || [];

      const get = (type) =>
        components.find((component) => component.types.includes(type))
          ?.long_name || "";

      const structured = {
        address: place.formatted_address || "",
        city: get("locality") || get("sublocality") || "",
        state: get("administrative_area_level_1") || "",
        zip: get("postal_code") || "",
        lat: place.geometry?.location?.lat?.() ?? null,
        lng: place.geometry?.location?.lng?.() ?? null,
      };

      onPlaceSelected?.(structured);
    });
  }, [google, loading, onPlaceSelected]);

  return (
    <TextField
      inputRef={inputRef}
      fullWidth
      label={label}
      value={value || ""}
      onChange={onChange}
      helperText={helperText}
      disabled={loading}
    />
  );
}