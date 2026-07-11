import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (
  !stripeSecretKey ||
  !webhookSecret ||
  !supabaseUrl ||
  !serviceRoleKey
) {
  throw new Error(
    "Missing one or more required Stripe or Supabase environment variables."
  );
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-06-30.basil",
});

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey
);

function getSubscriptionId(
  value:
    | string
    | Stripe.Subscription
    | null
    | undefined
) {
  if (typeof value === "string") {
    return value;
  }

  return value?.id || "";
}

function getCustomerId(
  value:
    | string
    | Stripe.Customer
    | Stripe.DeletedCustomer
    | null
    | undefined
) {
  if (typeof value === "string") {
    return value;
  }

  return value?.id || "";
}

function getMonthlySubscriptionAmount(
  subscription: Stripe.Subscription
) {
  return subscription.items.data.reduce(
    (total, item) => {
      const unitAmount =
        Number(item.price.unit_amount || 0) / 100;

      const quantity = Number(item.quantity || 1);

      return total + unitAmount * quantity;
    },
    0
  );
}

function getNextBillingDate(
  subscription: Stripe.Subscription
) {
  const periodEnd = Number(
    subscription.current_period_end || 0
  );

  if (!periodEnd) {
    return null;
  }

  return new Date(
    periodEnd * 1000
  ).toISOString();
}

function getCustomerOperationalStatus(
  subscriptionStatus: Stripe.Subscription.Status
) {
  if (
    subscriptionStatus === "active" ||
    subscriptionStatus === "trialing"
  ) {
    return "Active";
  }

  if (
    subscriptionStatus === "past_due" ||
    subscriptionStatus === "unpaid"
  ) {
    return "Payment Failed";
  }

  if (subscriptionStatus === "canceled") {
    return "Cancelled";
  }

  return "On Hold";
}

async function hasProcessedEvent(eventId: string) {
  const { data, error } = await supabase
    .from("stripe_webhook_events")
    .select("event_id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

async function markEventProcessed(
  eventId: string,
  eventType: string
) {
  const { error } = await supabase
    .from("stripe_webhook_events")
    .insert({
      event_id: eventId,
      event_type: eventType,
    });

  if (error) {
    throw error;
  }
}

async function updateCustomerBySubscription(
  subscriptionId: string,
  updates: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from("customers")
    .update(updates)
    .eq("stripe_subscription_id", subscriptionId)
    .select("id");

  if (error) {
    throw error;
  }

  if (!data?.length) {
    console.warn(
      `No customer found for Stripe subscription ${subscriptionId}.`
    );
  }
}

async function geocodeAddress({
  address,
  city,
  state,
  zip,
}: {
  address: string;
  city: string;
  state: string;
  zip: string;
}) {
  const apiKey = Deno.env.get(
    "GOOGLE_MAPS_API_KEY"
  );

  if (!apiKey) {
    return {
      lat: null,
      lng: null,
    };
  }

  const fullAddress = `${address}, ${city}, ${state} ${zip}`;

  const url =
    "https://maps.googleapis.com/maps/api/geocode/json" +
    `?address=${encodeURIComponent(fullAddress)}` +
    `&key=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    console.error(
      `Google geocoding failed with status ${response.status}.`
    );

    return {
      lat: null,
      lng: null,
    };
  }

  const data = await response.json();

  if (
    data.status !== "OK" ||
    !data.results?.[0]?.geometry?.location
  ) {
    console.error(
      "Google geocoding did not return a usable location:",
      data.status
    );

    return {
      lat: null,
      lng: null,
    };
  }

  return {
    lat: data.results[0].geometry.location.lat,
    lng: data.results[0].geometry.location.lng,
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
    });
  }

  const signature = req.headers.get(
    "stripe-signature"
  );

  if (!signature) {
    return new Response(
      "Missing Stripe signature",
      {
        status: 400,
      }
    );
  }

  const body = await req.text();

  let event: Stripe.Event;

  try {
    event =
      await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      );
  } catch (error) {
    console.error(
      "Webhook signature verification failed:",
      error
    );

    return new Response("Invalid signature", {
      status: 400,
    });
  }

  try {
    if (await hasProcessedEvent(event.id)) {
      console.log(
        `Stripe event ${event.id} was already processed.`
      );

      return new Response(
        JSON.stringify({
          received: true,
          duplicate: true,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (
      event.type ===
      "checkout.session.completed"
    ) {
      const session =
        event.data.object as Stripe.Checkout.Session;

      const metadata = session.metadata || {};

      let serviceDays: string[] = [];

      try {
        const parsed = JSON.parse(
          metadata.service_days || "[]"
        );

        serviceDays = Array.isArray(parsed)
          ? parsed.filter(Boolean)
          : [];
      } catch {
        serviceDays = [];
      }

      if (
        serviceDays.length === 0 &&
        metadata.service_day
      ) {
        serviceDays = [metadata.service_day];
      }

      const primaryServiceDay =
        serviceDays[0] ||
        metadata.service_day ||
        "";

      const subscriptionId =
        getSubscriptionId(session.subscription);

      const stripeCustomerId =
        getCustomerId(session.customer);

      let subscription:
        | Stripe.Subscription
        | null = null;

      if (subscriptionId) {
        subscription =
          await stripe.subscriptions.retrieve(
            subscriptionId
          );
      }

      const geocode = await geocodeAddress({
        address: metadata.address || "",
        city: metadata.city || "",
        state: metadata.state || "CO",
        zip: metadata.zip || "",
      });

      const monthlyAmount = subscription
        ? getMonthlySubscriptionAmount(
            subscription
          )
        : Number(metadata.monthly_total || 0);

      const subscriptionStatus =
        subscription?.status || "active";

      const customerData = {
        first_name:
          metadata.first_name || "",
        last_name:
          metadata.last_name || "",
        phone: metadata.phone || "",
        email:
          metadata.email ||
          session.customer_details?.email ||
          session.customer_email ||
          "",

        address: metadata.address || "",
        city: metadata.city || "",
        state: metadata.state || "CO",
        zip: metadata.zip || "",

        lat: geocode.lat,
        lng: geocode.lng,

        service_plan:
          metadata.plan_name || "",
        service_frequency:
          metadata.service_frequency || "",

        service_day: primaryServiceDay,
        service_days: serviceDays,

        zone: metadata.zone || "",

        status: getCustomerOperationalStatus(
          subscriptionStatus
        ),

        source: "stripe",
        signup_source: "website",

        stripe_customer_id:
          stripeCustomerId,

        stripe_subscription_id:
          subscriptionId,

        subscription_status:
          subscriptionStatus,

        monthly_amount: monthlyAmount,

        next_billing_date: subscription
          ? getNextBillingDate(subscription)
          : null,

        lifetime_revenue: 0,

        notes: `Stripe signup. Zone: ${
          metadata.zone || ""
        }`,
      };

      const { error } = await supabase
        .from("customers")
        .upsert(customerData, {
          onConflict:
            "stripe_subscription_id",
        });

      if (error) {
        throw error;
      }

      console.log(
        "Customer created or updated from Stripe checkout."
      );
    }

    if (event.type === "invoice.paid") {
      const invoice =
        event.data.object as Stripe.Invoice;

      const subscriptionId =
        getSubscriptionId(
          invoice.subscription
        );

      if (subscriptionId) {
        const { data: customer, error } =
          await supabase
            .from("customers")
            .select(
              "id, lifetime_revenue"
            )
            .eq(
              "stripe_subscription_id",
              subscriptionId
            )
            .maybeSingle();

        if (error) {
          throw error;
        }

        if (!customer) {
          console.warn(
            `Invoice paid before customer existed for subscription ${subscriptionId}.`
          );
        } else {
          const currentRevenue = Number(
            customer.lifetime_revenue || 0
          );

          const invoiceAmount =
            Number(invoice.amount_paid || 0) /
            100;

          await updateCustomerBySubscription(
            subscriptionId,
            {
              subscription_status:
                "active",
              status: "Active",
              lifetime_revenue:
                currentRevenue +
                invoiceAmount,
            }
          );
        }
      }
    }

    if (
      event.type ===
      "invoice.payment_failed"
    ) {
      const invoice =
        event.data.object as Stripe.Invoice;

      const subscriptionId =
        getSubscriptionId(
          invoice.subscription
        );

      if (subscriptionId) {
        await updateCustomerBySubscription(
          subscriptionId,
          {
            subscription_status:
              "past_due",
            status: "Payment Failed",
          }
        );
      }
    }

    if (
      event.type ===
      "customer.subscription.updated"
    ) {
      const subscription =
        event.data.object as Stripe.Subscription;

      await updateCustomerBySubscription(
        subscription.id,
        {
          stripe_customer_id:
            getCustomerId(
              subscription.customer
            ),

          subscription_status:
            subscription.status,

          monthly_amount:
            getMonthlySubscriptionAmount(
              subscription
            ),

          next_billing_date:
            getNextBillingDate(
              subscription
            ),

          status:
            getCustomerOperationalStatus(
              subscription.status
            ),
        }
      );
    }

    if (
      event.type ===
      "customer.subscription.deleted"
    ) {
      const subscription =
        event.data.object as Stripe.Subscription;

      await updateCustomerBySubscription(
        subscription.id,
        {
          subscription_status:
            "canceled",
          status: "Cancelled",
          next_billing_date: null,
        }
      );
    }

    await markEventProcessed(
      event.id,
      event.type
    );

    return new Response(
      JSON.stringify({
        received: true,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "Webhook processing error:",
      error
    );

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : String(error),
      }),
      {
        status: 500,
        headers: {
          "Content-Type":
            "application/json",
        },
      }
    );
  }
});