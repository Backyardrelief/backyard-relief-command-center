import Stripe from "npm:stripe@18.5.0";

const stripe = new Stripe(
  Deno.env.get("STRIPE_SECRET_KEY")!,
  {
    apiVersion: "2025-06-30.basil",
  }
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
      zone,
      service_schedule,
      monthly_total,
    } = body;

    if (!customer?.email) {
      throw new Error("Customer email is required.");
    }

    if (!plan?.stripePriceId) {
      throw new Error("Missing Stripe price ID for selected plan.");
    }

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

    const appUrl =
      Deno.env.get("APP_URL") || "http://localhost:5173";

    console.log("APP_URL:", appUrl);
    console.log("Customer Email:", customer.email);
    console.log("Plan:", plan.name);
    console.log("Stripe Price ID:", plan.stripePriceId);

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
        state: customer.state || "",
        zip: customer.zip || "",
        plan_key: plan.key || "",
        plan_name: plan.name || "",
        zone: zone || "",
        service_days: JSON.stringify(service_schedule?.days || []),
        service_frequency: service_schedule?.frequency || "",
        monthly_total: String(monthly_total || 0),
      },

      subscription_data: {
        metadata: {
          plan_key: plan.key || "",
          plan_name: plan.name || "",
          zone: zone || "",
          service_days: JSON.stringify(service_schedule?.days || []),
          service_frequency: service_schedule?.frequency || "",
          monthly_total: String(monthly_total || 0),
        },
      },
    });

    console.log("CHECKOUT SESSION CREATED:", session.id);

    return new Response(
      JSON.stringify({
        url: session.url,
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
        stack: error instanceof Error ? error.stack : null,
        raw: error,
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