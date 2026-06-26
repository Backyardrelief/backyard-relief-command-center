import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const { customers } = await req.json();

    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");

    if (!customers || customers.length === 0) {
      return new Response(
        JSON.stringify({
          route: [],
          total_stops: 0,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const valid = customers.filter(
      (c: any) => c.lat != null && c.lng != null
    );

    if (valid.length < 2) {
      const ordered = customers.map((c: any, i: number) => ({
        ...c,
        route_order: i + 1,
      }));

      return new Response(
        JSON.stringify({
          route: ordered,
          total_stops: ordered.length,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const locations = valid
      .map((c: any) => `${c.lat},${c.lng}`)
      .join("|");

    const url =
      `https://maps.googleapis.com/maps/api/distancematrix/json` +
      `?origins=${locations}` +
      `&destinations=${locations}` +
      `&key=${apiKey}`;

    const googleResponse = await fetch(url);
    const googleData = await googleResponse.json();

    console.log("Google response:");
    console.log(JSON.stringify(googleData, null, 2));

    const matrix = googleData.rows;

    const visited: any[] = [];
    const remaining = new Set(valid.map((_: any, i: number) => i));

    let current = 0;

    visited.push(valid[current]);
    remaining.delete(current);

    while (remaining.size > 0) {
      let next: number | null = null;
      let bestTime = Infinity;

      const row = matrix[current].elements;

      remaining.forEach((i) => {
        const travelTime =
          row[i]?.duration?.value ?? Infinity;

        if (travelTime < bestTime) {
          bestTime = travelTime;
          next = i;
        }
      });

      if (next === null) break;

      visited.push(valid[next]);
      remaining.delete(next);
      current = next;
    }

    const ordered = visited.map((customer, index) => ({
      ...customer,
      route_order: index + 1,
    }));

    return new Response(
      JSON.stringify({
        route: ordered,
        total_stops: ordered.length,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.error(err);

    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});