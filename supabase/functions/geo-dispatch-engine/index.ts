import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// -------------------------
function roundRobinDrivers(customers, drivers) {
  const result = {};

  drivers.forEach((d) => (result[d.id] = []));

  let i = 0;

  for (const c of customers) {
    const driver = drivers[i % drivers.length];
    result[driver.id].push(c);
    i++;
  }

  return result;
}

// -------------------------
Deno.serve(async () => {
  try {
    const { data: customers } = await supabase
      .from("customers")
      .select("*");

    const { data: drivers } = await supabase
      .from("drivers")
      .select("*")
      .eq("active", true);

    if (!customers?.length || !drivers?.length) {
      return Response.json({
        success: true,
        message: "No data",
      });
    }

    const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

    const results = [];

    for (const day of DAYS) {
      const dayCustomers = customers.filter(
        (c) => c.service_day === day
      );

      const assigned = roundRobinDrivers(dayCustomers, drivers);

      // -------------------------
      // WRITE TO DB
      // -------------------------
      for (const driver of drivers) {
        const stops = assigned[driver.id];

        let order = 0;

        for (const c of stops) {
          await supabase.from("dispatch_assignments").upsert({
            service_day: day,
            driver_id: driver.id,
            customer_id: c.id,
            route_order: order++,
          });
        }
      }

      results.push({
        day,
        drivers: drivers.length,
        stops: dayCustomers.length,
      });
    }

    return Response.json({
      success: true,
      results,
    });
  } catch (e) {
    return Response.json(
      { success: false, error: e.message },
      { status: 500 }
    );
  }
});