import { useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Paper,
} from "@mui/material";

import { supabase } from "../lib/supabase";
import { useGoogleMaps } from "../maps/core/GoogleMapsProvider";

const centerDefault = {
  lat: 39.6133,
  lng: -105.0166,
};

export default function Map() {
  const { google, loading } = useGoogleMaps();

  const mapRef = useRef(null);
  const containerRef = useRef(null);

  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);

  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);

  // -------------------------
  // LOAD CUSTOMERS
  // -------------------------
  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .not("lat", "is", null)
      .not("lng", "is", null);

    if (error) {
      console.error(error);
      return;
    }

    setCustomers(data || []);
  };

  // -------------------------
  // INIT MAP
  // -------------------------
  useEffect(() => {
    if (!google || loading) return;
    if (!containerRef.current) return;
    if (mapRef.current) return;

    mapRef.current = new google.maps.Map(containerRef.current, {
      center: centerDefault,
      zoom: 11,
    });

    infoWindowRef.current = new google.maps.InfoWindow();
  }, [google, loading]);

  // -------------------------
  // RENDER MARKERS
  // -------------------------
  useEffect(() => {
    if (!google || !mapRef.current) return;

    // clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    customers.forEach((customer) => {
      const marker = new google.maps.Marker({
        position: {
          lat: Number(customer.lat),
          lng: Number(customer.lng),
        },
        map: mapRef.current,
      });

      marker.addListener("click", () => {
        setSelected(customer);

        const content = `
          <div>
            <h3>${customer.first_name} ${customer.last_name}</h3>
            <p>${customer.address || ""}</p>
            <p>${customer.service_plan || ""}</p>
            <p>${customer.service_day || ""}</p>
          </div>
        `;

        infoWindowRef.current.setContent(content);
        infoWindowRef.current.open(mapRef.current, marker);
      });

      markersRef.current.push(marker);
    });
  }, [google, customers]);

  if (loading || !google) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading map...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        Customer Map
      </Typography>

      <Paper sx={{ p: 2, borderRadius: 3 }}>
        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "75vh",
          }}
        />
      </Paper>
    </Box>
  );
}