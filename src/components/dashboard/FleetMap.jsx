import { GoogleMap, useLoadScript, Marker } from "@react-google-maps/api";
import { useEffect, useState } from "react";

const depot = {
  lat: 39.6433,
  lng: -104.9878,
};

export default function FleetMap() {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY,
  });

  const [driverLocation, setDriverLocation] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const data = localStorage.getItem("driverLocation");
      if (data) {
        setDriverLocation(JSON.parse(data));
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "400px" }}
      center={driverLocation || depot}
      zoom={14}
    >
      {/* DEPOT */}
      <Marker position={depot} label="HQ" />

      {/* LIVE DRIVER */}
      {driverLocation && (
        <Marker
          position={driverLocation}
          label="🚐"
        />
      )}
    </GoogleMap>
  );
}