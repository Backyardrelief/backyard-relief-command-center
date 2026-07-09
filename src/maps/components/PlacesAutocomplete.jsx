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

      const getLong = (type) =>
        components.find((component) => component.types.includes(type))
          ?.long_name || "";

      const getShort = (type) =>
        components.find((component) => component.types.includes(type))
          ?.short_name || "";

      const streetNumber = getLong("street_number");
      const route = getLong("route");

      const structured = {
        address:
          streetNumber && route
            ? `${streetNumber} ${route}`
            : place.formatted_address || "",
        city:
          getLong("locality") ||
          getLong("sublocality") ||
          getLong("postal_town") ||
          "",
        state: getShort("administrative_area_level_1") || "",
        zip: getLong("postal_code") || "",
        lat: place.geometry?.location?.lat?.() ?? null,
        lng: place.geometry?.location?.lng?.() ?? null,
      };

      onChange?.(structured);
      onPlaceSelected?.(structured);
    });
  }, [google, loading, onChange, onPlaceSelected]);

  const handleInputChange = (event) => {
    onChange?.({
      address: event.target.value,
      city: "",
      state: "CO",
      zip: "",
      lat: null,
      lng: null,
    });
  };

  return (
    <TextField
      inputRef={inputRef}
      fullWidth
      required
      label={label}
      value={value || ""}
      onChange={handleInputChange}
      helperText={helperText}
      disabled={loading}
    />
  );
}