import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("Geo Cluster Function Running");

// -------------------------
// Supabase Admin Client
// -------------------------
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// -------------------------
// Haversine Distance (miles)
// -------------------------
function distance(a: any, b: any) {
  const R = 3958.8; // miles

  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;

  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * R * Math.asin(Math.sqrt(x));
}

// -------------------------
// Simple clustering (greedy radius grouping)
// -------------------------
function clusterCustomers(customers: any[], radius = 2.5) {
  const clusters: any[] = [];
  const used = new Set();

  for (let i = 0; i < customers.length; i++) {
    if (used.has(i)) continue;

    const cluster = [customers[i]];
    used.add(i);

    for (let j = i + 1; j < customers.length; j++) {
      if (used.has(j)) continue;

      const d = distance(customers[i], customers[j]);

      if (d <= radius) {
        cluster.push(customers[j]);
        used.add(j);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

// -------------------------
// Handler
// -------------------------
Deno.serve(async (req) => {
  try {
    const { service_day } = await req.json().catch(() => ({}));

    let query = supabase.from("customers").select("*");

    if (service_day) {
      query = query.eq("service_day", service_day);
    }

    const { data: customers, error } = await query;

    if (error) throw error;

    const valid = (customers || []).filter(
      (c) => c.lat != null && c.lng != null
    );

    const clusters = clusterCustomers(valid);

    const result = clusters.map((cluster, idx) => ({
      cluster_id: idx + 1,
      size: cluster.length,
      customers: cluster,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        clusters: result,
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