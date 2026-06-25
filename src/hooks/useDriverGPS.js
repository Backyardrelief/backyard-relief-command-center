import { useEffect } from "react";
import { supabase } from "../lib/supabase";

/**
 * LIVE DRIVER GPS TRACKING HOOK
 * Sends real-time location updates to Supabase
 */
export default function useDriverGPS(driverId) {
  useEffect(() => {
    if (!driverId) {
      console.warn("useDriverGPS: No driverId provided");
      return;
    }

    // Check if browser supports GPS
    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by this browser");
      return;
    }

    /**
     * SEND LOCATION TO SUPABASE
     */
    const sendLocation = async (position) => {
      const { latitude, longitude } = position.coords;

      const { error } = await supabase
        .from("driver_locations")
        .upsert({
          driver_id: driverId,
          lat: latitude,
          lng: longitude,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error("GPS update error:", error);
      }
    };

    /**
     * WATCH DEVICE LOCATION
     */
    const watchId = navigator.geolocation.watchPosition(
      sendLocation,
      (error) => {
        console.error("GPS watch error:", error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    /**
     * CLEANUP ON UNMOUNT
     */
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [driverId]);
}