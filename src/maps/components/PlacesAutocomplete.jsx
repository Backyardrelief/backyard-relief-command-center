import { useEffect, useRef, useState } from "react";
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
  const listenerRef = useRef(null);

  const [inputValue, setInputValue] = useState(value || "");

  // Keep the displayed text synchronized when editing an existing customer
  // or when the parent updates the selected address.
  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  useEffect(() => {
    if (!google || loading) return;
    if (!inputRef.current) return;
    if (autocompleteRef.current) return;

    const autocomplete = new google.maps.places.Autocomplete(
      inputRef.current,
      {
        fields: [
          "formatted_address",
          "geometry",
          "address_components",
        ],
        types: ["address"],
        componentRestrictions: {
          country: "us",
        },
      }
    );

    autocompleteRef.current = autocomplete;

    listenerRef.current = autocomplete.addListener(
      "place_changed",
      () => {
        const place = autocomplete.getPlace();

        const components =
          place.address_components || [];

        const getLong = (type) =>
          components.find((component) =>
            component.types.includes(type)
          )?.long_name || "";

        const getShort = (type) =>
          components.find((component) =>
            component.types.includes(type)
          )?.short_name || "";

        const streetNumber =
          getLong("street_number");

        const route = getLong("route");

        const streetAddress =
          streetNumber && route
            ? `${streetNumber} ${route}`
            : place.formatted_address || "";

        const structured = {
          address: streetAddress,

          city:
            getLong("locality") ||
            getLong("sublocality") ||
            getLong("postal_town") ||
            "",

          state:
            getShort(
              "administrative_area_level_1"
            ) || "",

          zip:
            getLong("postal_code") || "",

          lat:
            place.geometry?.location?.lat?.() ??
            null,

          lng:
            place.geometry?.location?.lng?.() ??
            null,
        };

        setInputValue(streetAddress);

        onChange?.(structured);
        onPlaceSelected?.(structured);
      }
    );

    return () => {
      if (listenerRef.current) {
        listenerRef.current.remove();
        listenerRef.current = null;
      }

      autocompleteRef.current = null;
    };
  }, [google, loading, onChange, onPlaceSelected]);

  const handleInputChange = (event) => {
    const typedValue = event.target.value;

    // Always update locally so keystrokes remain visible,
    // even when the parent does not provide onChange.
    setInputValue(typedValue);

    onChange?.({
      address: typedValue,
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
      value={inputValue}
      onChange={handleInputChange}
      helperText={helperText}
      disabled={loading}
      autoComplete="off"
    />
  );
}