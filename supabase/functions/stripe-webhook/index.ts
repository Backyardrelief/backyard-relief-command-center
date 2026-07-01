import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2025-06-30.basil",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing Stripe signature", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const metadata = session.metadata || {};

      const firstName = metadata.first_name || "";
      const lastName = metadata.last_name || "";
      const serviceDays = JSON.parse(metadata.service_days || "[]");

      const customerData = {
        first_name: firstName,
        last_name: lastName,
        phone: metadata.phone || "",
        email: metadata.email || session.customer_email || "",
        address: metadata.address || "",
        city: metadata.city || "",
        state: metadata.state || "CO",
        zip: metadata.zip || "",

        service_plan: metadata.plan_name || "",
        service_frequency: metadata.service_frequency || "",
        service_day: serviceDays.join(" & "),

        status: "Active",
        source: "stripe",

        stripe_customer_id:
          typeof session.customer === "string" ? session.customer : "",
        stripe_subscription_id:
          typeof session.subscription === "string" ? session.subscription : "",

        subscription_status: "active",
        monthly_amount: Number(metadata.monthly_total || 0),

        notes: `Stripe signup. Zone: ${metadata.zone || ""}`,
      };

      console.log("Creating Supabase customer:", customerData);

      const { error } = await supabase.from("customers").insert(customerData);

      if (error) {
        console.error("Supabase insert error:", error);
        throw error;
      }

      console.log("Customer created successfully from Stripe checkout.");
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error("Webhook processing error:", err);

    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
});