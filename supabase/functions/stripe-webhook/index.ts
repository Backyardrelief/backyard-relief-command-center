import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2025-06-30.basil",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function updateCustomerBySubscription(
  subscriptionId: string,
  updates: Record<string, unknown>
) {
  const { error } = await supabase
    .from("customers")
    .update(updates)
    .eq("stripe_subscription_id", subscriptionId);

  if (error) throw error;
}

async function geocodeAddress({ address, city, state, zip }) {
  const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!apiKey) return { lat: null, lng: null };

  const fullAddress = `${address}, ${city}, ${state} ${zip}`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    fullAddress
  )}&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== "OK" || !data.results?.[0]?.geometry?.location) {
    return { lat: null, lng: null };
  }

  return {
    lat: data.results[0].geometry.location.lat,
    lng: data.results[0].geometry.location.lng,
  };
}

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing Stripe signature", { status: 400 });

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

      let parsedServiceDays: string[] = [];
      try {
        parsedServiceDays = JSON.parse(metadata.service_days || "[]");
      } catch {
        parsedServiceDays = [];
      }

      const serviceDay = metadata.service_day || parsedServiceDays[0] || "";

      const geocode = await geocodeAddress({
        address: metadata.address || "",
        city: metadata.city || "",
        state: metadata.state || "CO",
        zip: metadata.zip || "",
      });

      const customerData = {
        first_name: metadata.first_name || "",
        last_name: metadata.last_name || "",
        phone: metadata.phone || "",
        email: metadata.email || session.customer_email || "",
        address: metadata.address || "",
        city: metadata.city || "",
        state: metadata.state || "CO",
        zip: metadata.zip || "",

        lat: geocode.lat,
        lng: geocode.lng,

        service_plan: metadata.plan_name || "",
        service_frequency: metadata.service_frequency || "",
        service_day: serviceDay,
        zone: metadata.zone || "",

        status: "Active",
        source: "stripe",
        signup_source: "website",

        stripe_customer_id:
          typeof session.customer === "string" ? session.customer : "",
        stripe_subscription_id:
          typeof session.subscription === "string" ? session.subscription : "",

        subscription_status: "active",
        monthly_amount: Number(metadata.monthly_total || 0),

        notes: `Stripe signup. Zone: ${metadata.zone || ""}`,
      };

      const { error } = await supabase.from("customers").insert(customerData);
      if (error) throw error;

      console.log("Customer created from Stripe checkout.");
    }

    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId =
        typeof invoice.subscription === "string" ? invoice.subscription : "";

      if (subscriptionId) {
        await updateCustomerBySubscription(subscriptionId, {
          subscription_status: "active",
          status: "Active",
        });
      }
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId =
        typeof invoice.subscription === "string" ? invoice.subscription : "";

      if (subscriptionId) {
        await updateCustomerBySubscription(subscriptionId, {
          subscription_status: "payment_failed",
          status: "Payment Failed",
        });
      }
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;

      await updateCustomerBySubscription(subscription.id, {
        subscription_status: subscription.status,
        status:
          subscription.status === "active" || subscription.status === "trialing"
            ? "Active"
            : "On Hold",
      });
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;

      await updateCustomerBySubscription(subscription.id, {
        subscription_status: "cancelled",
        status: "Cancelled",
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook processing error:", err);

    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});