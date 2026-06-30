import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("Geo Scheduler (K-Means) Running");

// -----------------------------
// Supabase Admin Client
// -----------------------------
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// -----------------------------
// CONFIG
// -----------------------------
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const K = 3; // number of clusters (zones)

// -----------------------------
// TYPES
// -----------------------------
type Customer = {
  id: string;
  lat: number;
  lng: number;
  service_plan?: string;
};

// -----------------------------
// HAVERSINE DISTANCE (earth distance in km)
// -----------------------------
function distance(a: Customer, b: Customer) {
  const R = 6371;

  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;

  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) *
      Math.cos(lat1) *
      Math.cos(lat2);

  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// -----------------------------
// RANDOM INITIAL CENTROIDS
// -----------------------------
function initCentroids(customers: Customer[], k: number) {
  return customers
    .sort(() => Math.random() - 0.5)
    .slice(0, k)
    .map((c) => ({ lat: c.lat, lng: c.lng }));
}

// -----------------------------
// K-MEANS CLUSTERING
// -----------------------------
function kMeans(customers: Customer[], k: number, maxIter = 10) {
  let centroids = initCentroids(customers, k);
  let clusters: Customer[][] = [];

  for (let iter = 0; iter < maxIter; iter++) {
    clusters = Array.from({ length: k }, () => []);

    // assign step
    for (const c of customers) {
      let bestIndex = 0;
      let bestDist = Infinity;

      centroids.forEach((centroid, i) => {
        const d = distance(c, centroid as Customer);
        if (d < bestDist) {
          bestDist = d;
          bestIndex = i;
        }
      });

      clusters[bestIndex].push(c);
    }

    // recompute centroids
    centroids = clusters.map((cluster) => {
      if (cluster.length === 0) return centroids[0];

      const avgLat =
        cluster.reduce((sum, c) => sum + c.lat, 0) / cluster.length;

      const avgLng =
        cluster.reduce((sum, c) => sum + c.lng, 0) / cluster.length;

      return { lat: avgLat, lng: avgLng };
    });
  }

  return clusters;
}

// -----------------------------
// MAIN FUNCTION
// -----------------------------
Deno.serve(async () => {
  try {
    // 1. fetch geo-enabled customers
    const { data: customers, error } = await supabase
      .from("customers")
      .select("*")
      .not("lat", "is", null)
      .not("lng", "is", null);

    if (error) throw error;

    if (!customers?.length) {
      return Response.json({
        success: true,
        message: "No geo-enabled customers found",
        zones: [],
      });
    }

    // 2. run k-means clustering
    const clusters = kMeans(customers as Customer[], K);

    // 3. build zone map
    const zones: Record<string, Customer[]> = {};

    clusters.forEach((cluster, i) => {
      zones[`ZONE_${i + 1}`] = cluster;
    });

    // 4. assign zones → days (balanced rotation)
    const schedule: Record<string, Customer[]> = {};
    DAYS.forEach((d) => (schedule[d] = []));

    Object.entries(zones).forEach(([zoneName, list], index) => {
      const day = DAYS[index % DAYS.length];
      schedule[day].push(...list);
    });

    // 5. persist routes + history
    const results: any[] = [];

    for (const day of DAYS) {
      const route = schedule[day];

      if (!route || route.length === 0) continue;

      await supabase.from("routes").upsert({
        service_day: day,
        route,
        locked: false,
        updated_at: new Date().toISOString(),
      });

      await supabase.from("route_history").insert({
        service_day: day,
        route,
        locked: false,
      });

      results.push({
        day,
        stops: route.length,
      });
    }

    return Response.json({
      success: true,
      message: "K-Means geo scheduling completed",
      zones: Object.entries(zones).map(([zone, list]) => ({
        zone,
        size: list.length,
      })),
      results,
    });
  } catch (err: any) {
    console.error(err);

    return Response.json(
      {
        success: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
});