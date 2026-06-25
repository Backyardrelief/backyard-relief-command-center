import { GoogleMap, useLoadScript, DirectionsRenderer, Marker } from "@react-google-maps/api";
import { useEffect, useState } from "react";

const depot = {
  lat: 39.6433,
  lng: -104.9878,
};

export default function RouteMap({ jobs }) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY,
  });

  const [directions, setDirections] = useState(null);

  useEffect(() => {
    if (!isLoaded || !jobs?.length) return;

    const directionsService = new google.maps.DirectionsService();

    const waypoints = jobs.map((job) => ({
      location: { lat: job.lat, lng: job.lng },
      stopover: true,
    }));

    directionsService.route(
      {
        origin: depot,
        destination: depot,
        waypoints,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: true,
      },
      (result, status) => {
        if (status === "OK") {
          setDirections(result);
        }
      }
    );
  }, [isLoaded, jobs]);

  if (!isLoaded) return <div>Loading Map...</div>;

  return (
    <GoogleMap mapContainerStyle={{ width: "100%", height: "400px" }} center={depot} zoom={12}>
      {/* DEPOT */}
      <Marker position={depot} label="DEPOT" />

      {/* ROUTE */}
      {directions && <DirectionsRenderer directions={directions} />}
    </GoogleMap>
  );
}