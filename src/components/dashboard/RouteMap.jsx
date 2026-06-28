import { useEffect, useRef, useState } from "react";
import { useGoogleMaps } from "../../maps/core/GoogleMapsProvider";

const depot = {
  lat: 39.6433,
  lng: -104.9878,
};

export default function RouteMap({ jobs }) {
  const { google, loading } = useGoogleMaps();

  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const directionsRendererRef = useRef(null);

  const [directionsLoaded, setDirectionsLoaded] = useState(false);

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

    directionsRendererRef.current = new google.maps.DirectionsRenderer({
      map: mapRef.current,
    });
  }, [google, loading]);

  // -------------------------
  // BUILD ROUTE
  // -------------------------
  useEffect(() => {
    if (!google || !mapRef.current) return;
    if (!jobs?.length) return;

    const directionsService = new google.maps.DirectionsService();

    const waypoints = jobs.map((job) => ({
      location: {
        lat: Number(job.lat),
        lng: Number(job.lng),
      },
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
        if (status === "OK" && directionsRendererRef.current) {
          directionsRendererRef.current.setDirections(result);
          setDirectionsLoaded(true);
        } else {
          console.error("Directions failed:", status);
        }
      }
    );
  }, [google, jobs]);

  if (loading || !google) {
    return <div>Loading Map...</div>;
  }

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "400px" }}
    />
  );
}