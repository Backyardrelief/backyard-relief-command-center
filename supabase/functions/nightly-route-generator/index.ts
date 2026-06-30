import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// -------------------------
// Supabase Admin Client
// -------------------------
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// -------------------------
// Distance helper
// -------------------------
function distance(a: any, b: any) {
  return Math.sqrt(
    Math.pow(a.lat - b.lat, 2) + Math.pow(a.lng - b.lng, 2)
  );
}

// -------------------------
// Simple K-Means clustering
// -------------------------
function kMeans(points: any[], k = 3, iterations = 6) {
  if (!points.length) return [];

  let centroids = points.slice(0, k).map(p => ({
    lat: p.lat,
    lng: p.lng,
  }));

  let clusters: any[][] = [];

  for (let i = 0; i < iterations; i++) {
    clusters = Array.from({ length: k }, () => []);

    for (const p of points) {
      let bestIndex = 0;
      let bestDist = Infinity;

      centroids.forEach((c, idx) => {
        const d = distance(p, c);
        if (d < bestDist) {
          bestDist = d;
          bestIndex = idx;
        }
      });

      clusters[bestIndex].push(p);
    }

    centroids = clusters.map(cluster => {
      if (!cluster.length) return { lat: 0, lng: 0 };

      return {
        lat:
          cluster.reduce((sum, p) => sum + p.lat, 0) /
          cluster.length,
        lng:
          cluster.reduce((sum, p) => sum + p.lng, 0) /
          cluster.length,
      };
    });
  }

  return clusters;
}

// -------------------------
// MAIN FUNCTION
// -------------------------
Deno.serve(async () => {
  try {
    const { data: customers, error } = await supabase
      .from("customers")
      .select("*");

    if (error) throw error;

    const validCustomers = (customers || []).filter(
      (c) => c.lat != null && c.lng != null
    );

    // Run clustering
    const clusters = kMeans(validCustomers, 3);

    const results: any[] = [];
    let zoneIndex = 1;

    for (const cluster of clusters) {
      const zoneId = `ZONE_${zoneIndex++}`;

      for (const customer of cluster) {
        await supabase
          .from("customers")
          .update({ zone_id: zoneId })
          .eq("id", customer.id);
      }

      results.push({
        zone: zoneId,
        size: cluster.length,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        zones: results,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});