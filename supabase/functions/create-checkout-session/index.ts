import Stripe from "npm:stripe@18.5.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2025-06-30.basil",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ZIP_ZONE_MAP: Record<string, { zone: string; service_day: string }> = {
  "80235": { zone: "Zone E", service_day: "Monday" },
  "80236": { zone: "Zone E", service_day: "Monday" },

  "80121": { zone: "Zone D", service_day: "Tuesday" },
  "80122": { zone: "Zone D", service_day: "Tuesday" },

  "80120": { zone: "Zone B", service_day: "Wednesday" },

  "80123": { zone: "Zone A", service_day: "Thursday" },
  "80127": { zone: "Zone A", service_day: "Thursday" },
  "80128": { zone: "Zone A", service_day: "Thursday" },

  "80129": { zone: "Zone C", service_day: "Friday" },
  "80126": { zone: "Zone C", service_day: "Friday" },
  "80130": { zone: "Zone C", service_day: "Friday" },
};

function getServiceAssignment(zip: string) {
  const cleanZip = String(zip || "").trim().slice(0, 5);
  const assignment = ZIP_ZONE_MAP[cleanZip];

  if (!assignment) {
    throw new Error(
      `Sorry, ZIP code ${cleanZip || "provided"} is outside our current service area.`
    );
  }

  return {
    ...assignment,
    zip: cleanZip,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    console.log("REQUEST BODY:", body);

    const {
      customer,
      plan,
      selected_add_ons,
      service_schedule,
      monthly_total,
    } = body;

    if (!customer?.email) {
      throw new Error("Customer email is required.");
    }

    if (!customer?.zip) {
      throw new Error("Customer ZIP code is required.");
    }

    if (!plan?.stripePriceId) {
      throw new Error("Missing Stripe price ID for selected plan.");
    }

    const assignment = getServiceAssignment(customer.zip);

    // Keep frontend schedule behavior stable.
    const frontendDays = Array.isArray(service_schedule?.days)
      ? service_schedule.days
      : [];

    const serviceDays =
      frontendDays.length > 0 ? frontendDays : [assignment.service_day];

    const serviceFrequency =
      service_schedule?.frequency || plan.frequency || "";

    const lineItems = [
      {
        price: plan.stripePriceId,
        quantity: 1,
      },
      ...(selected_add_ons || []).map((item: any) => ({
        price: item.stripePriceId,
        quantity: 1,
      })),
    ];

    console.log("LINE ITEMS:", lineItems);
    console.log("ASSIGNMENT:", assignment);

    const appUrl = Deno.env.get("APP_URL") || "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: customer.email,
      line_items: lineItems,

      success_url: `${appUrl}/signup-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/signup`,

      metadata: {
        first_name: customer.first_name || "",
        last_name: customer.last_name || "",
        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.address || "",
        city: customer.city || "",
        state: customer.state || "CO",
        zip: assignment.zip,

        plan_key: plan.key || "",
        plan_name: plan.name || "",

        zone: assignment.zone,
        service_day: assignment.service_day,
        service_days: JSON.stringify(serviceDays),
        service_frequency: serviceFrequency,

        monthly_total: String(monthly_total || 0),
      },

      subscription_data: {
        metadata: {
          plan_key: plan.key || "",
          plan_name: plan.name || "",

          zone: assignment.zone,
          service_day: assignment.service_day,
          service_days: JSON.stringify(serviceDays),
          service_frequency: serviceFrequency,

          monthly_total: String(monthly_total || 0),
        },
      },
    });

    console.log("CHECKOUT SESSION CREATED:", session.id);

    return new Response(
      JSON.stringify({
        url: session.url,
        zone: assignment.zone,
        service_day: assignment.service_day,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("CHECKOUT ERROR:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});