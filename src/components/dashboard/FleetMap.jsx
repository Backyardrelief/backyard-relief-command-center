import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useGoogleMaps } from "../../maps/core/GoogleMapsProvider";

const depot = {
  lat: 39.6433,
  lng: -104.9878,
};

export default function FleetMap() {
  const { google, loading } = useGoogleMaps();

  const mapRef = useRef(null);
  const containerRef = useRef(null);

  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);

  const [driverLocation, setDriverLocation] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

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
      .order("last_name");

    if (error) {
      console.error("Customer load error:", error);
      return;
    }

    const valid = data.filter((c) =>
      Number.isFinite(Number(c.lat)) &&
      Number.isFinite(Number(c.lng))
    );

    setCustomers(valid);
  };

  // -------------------------
  // DRIVER LOCATION POLLING
  // -------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      const stored = localStorage.getItem("driverLocation");

      if (stored) {
        try {
          setDriverLocation(JSON.parse(stored));
        } catch {}
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // -------------------------
  // INIT MAP
  // -------------------------
  useEffect(() => {
    if (!google || loading) return;
    if (!containerRef.current) return;
    if (mapRef.current) return;

    mapRef.current = new google.maps.Map(containerRef.current, {
      center: depot,
      zoom: 12,
    });

    infoWindowRef.current = new google.maps.InfoWindow();
  }, [google, loading]);

  // -------------------------
  // UPDATE MARKERS
  // -------------------------
  useEffect(() => {
    if (!google || !mapRef.current) return;

    // clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const map = mapRef.current;

    // HQ marker
    markersRef.current.push(
      new google.maps.Marker({
        position: depot,
        map,
        label: "HQ",
      })
    );

    // driver marker
    if (driverLocation) {
      markersRef.current.push(
        new google.maps.Marker({
          position: driverLocation,
          map,
          label: "🚐",
        })
      );
    }

    // customer markers
    customers.forEach((customer) => {
      const marker = new google.maps.Marker({
        position: {
          lat: Number(customer.lat),
          lng: Number(customer.lng),
        },
        map,
      });

      marker.addListener("click", () => {
        setSelectedCustomer(customer);

        const content = `
          <div>
            <strong>${customer.first_name} ${customer.last_name}</strong><br/>
            ${customer.address}<br/>
            ${customer.city}, ${customer.state} ${customer.zip}
          </div>
        `;

        infoWindowRef.current.setContent(content);
        infoWindowRef.current.open(map, marker);
      });

      markersRef.current.push(marker);
    });
  }, [google, customers, driverLocation]);

  // -------------------------
  // CENTER MAP LOGIC
  // -------------------------
  const center = useMemo(() => {
    if (driverLocation) return driverLocation;

    if (customers.length > 0) {
      return {
        lat: Number(customers[0].lat),
        lng: Number(customers[0].lng),
      };
    }

    return depot;
  }, [driverLocation, customers]);

  // -------------------------
  // UPDATE CENTER WHEN DATA CHANGES
  // -------------------------
  useEffect(() => {
    if (!mapRef.current || !center) return;
    mapRef.current.setCenter(center);
  }, [center]);

  if (loading || !google) {
    return <div>Loading map...</div>;
  }

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "500px" }}
    />
  );
}