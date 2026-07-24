import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

console.log(
  "STRIPE WEBHOOK — BILLING + CUSTOMER + SMS CONSENT VERSION DEPLOYED",
);

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY",
);

if (
  !stripeSecretKey ||
  !webhookSecret ||
  !supabaseUrl ||
  !serviceRoleKey
) {
  throw new Error(
    "Missing one or more required Stripe or Supabase environment variables.",
  );
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-06-30.basil",
});

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey,
);

const jsonHeaders = {
  "Content-Type": "application/json",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  return cleanText(value).toLowerCase() === "true";
}

function parseNullableNumber(
  value: unknown,
): number | null {
  const cleanedValue = cleanText(value);

  if (!cleanedValue) {
    return null;
  }

  const parsedValue = Number(cleanedValue);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : null;
}

function parseNullableDate(
  value: unknown,
): string | null {
  const cleanedValue = cleanText(value);

  if (!cleanedValue) {
    return null;
  }

  const parsedDate = new Date(cleanedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    console.warn(
      "Invalid date received in Stripe metadata:",
      cleanedValue,
    );

    return null;
  }

  return parsedDate.toISOString();
}

function getSubscriptionId(
  value:
    | string
    | Stripe.Subscription
    | null
    | undefined,
): string {
  if (typeof value === "string") {
    return value;
  }

  return value?.id || "";
}

function getStripeCustomerId(
  value:
    | string
    | Stripe.Customer
    | Stripe.DeletedCustomer
    | null
    | undefined,
): string {
  if (typeof value === "string") {
    return value;
  }

  return value?.id || "";
}

function parseServiceDays(
  metadata: Record<string, string>,
): string[] {
  let serviceDays: string[] = [];

  try {
    const parsed = JSON.parse(
      metadata.service_days || "[]",
    );

    if (Array.isArray(parsed)) {
      serviceDays = parsed
        .map((day) => cleanText(day))
        .filter(Boolean);
    }
  } catch (error) {
    console.warn(
      "Unable to parse service_days metadata:",
      error,
    );
  }

  if (
    serviceDays.length === 0 &&
    metadata.service_day
  ) {
    serviceDays = [
      cleanText(metadata.service_day),
    ].filter(Boolean);
  }

  return [...new Set(serviceDays)];
}

function getMonthlySubscriptionAmount(
  subscription: Stripe.Subscription,
): number {
  return subscription.items.data.reduce(
    (total, item) => {
      const unitAmount =
        Number(item.price.unit_amount || 0) /
        100;

      const quantity = Number(
        item.quantity || 1,
      );

      return total + unitAmount * quantity;
    },
    0,
  );
}

function getNextBillingDate(
  subscription: Stripe.Subscription,
): string | null {
  const periodEnd = Number(
    subscription.current_period_end || 0,
  );

  if (!periodEnd) {
    return null;
  }

  return new Date(
    periodEnd * 1000,
  ).toISOString();
}

function getCustomerOperationalStatus(
  subscriptionStatus:
    Stripe.Subscription.Status,
): string {
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

async function hasProcessedEvent(
  eventId: string,
): Promise<boolean> {
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
  eventType: string,
): Promise<void> {
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
  updates: Record<string, unknown>,
): Promise<void> {
  const { data, error } = await supabase
    .from("customers")
    .update(updates)
    .eq(
      "stripe_subscription_id",
      subscriptionId,
    )
    .select("id");

  if (error) {
    throw error;
  }

  if (!data?.length) {
    console.warn(
      `No customer found for Stripe subscription ${subscriptionId}.`,
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
}): Promise<{
  lat: number | null;
  lng: number | null;
}> {
  const apiKey = Deno.env.get(
    "GOOGLE_MAPS_API_KEY",
  );

  if (!apiKey) {
    console.warn(
      "GOOGLE_MAPS_API_KEY is missing. Customer will be created without geocoded coordinates.",
    );

    return {
      lat: null,
      lng: null,
    };
  }

  const fullAddress = [
    address,
    city,
    state,
    zip,
  ]
    .filter(Boolean)
    .join(", ");

  if (!fullAddress) {
    return {
      lat: null,
      lng: null,
    };
  }

  const geocodeUrl =
    "https://maps.googleapis.com/maps/api/geocode/json" +
    `?address=${encodeURIComponent(fullAddress)}` +
    `&key=${apiKey}`;

  const response = await fetch(geocodeUrl);

  if (!response.ok) {
    console.error(
      `Google geocoding failed with HTTP status ${response.status}.`,
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
      data.status,
    );

    return {
      lat: null,
      lng: null,
    };
  }

  return {
    lat:
      data.results[0].geometry.location.lat,

    lng:
      data.results[0].geometry.location.lng,
  };
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const subscriptionId =
    getSubscriptionId(
      session.subscription,
    );

  const stripeCustomerId =
    getStripeCustomerId(session.customer);

  let subscription:
    | Stripe.Subscription
    | null = null;

  if (subscriptionId) {
    subscription =
      await stripe.subscriptions.retrieve(
        subscriptionId,
      );
  }

  /*
   * Metadata is saved on both the Checkout
   * Session and subscription. Session values
   * take priority.
   */
  const metadata: Record<string, string> = {
    ...(subscription?.metadata || {}),
    ...(session.metadata || {}),
  };

  const serviceDays =
    parseServiceDays(metadata);

  const primaryServiceDay =
    serviceDays[0] ||
    cleanText(metadata.service_day);

  const secondServiceDay =
    serviceDays[1] || null;

  /*
   * Prefer coordinates collected by Google
   * Places during signup.
   */
  let lat = parseNullableNumber(
    metadata.lat,
  );

  let lng = parseNullableNumber(
    metadata.lng,
  );

  /*
   * Fall back to server-side geocoding when
   * signup coordinates are unavailable.
   */
  if (lat === null || lng === null) {
    const geocode = await geocodeAddress({
      address: cleanText(
        metadata.address,
      ),

      city: cleanText(metadata.city),

      state:
        cleanText(metadata.state) || "CO",

      zip: cleanText(metadata.zip),
    });

    lat = geocode.lat;
    lng = geocode.lng;
  }

  const monthlyAmount = subscription
    ? getMonthlySubscriptionAmount(
        subscription,
      )
    : Number(
        metadata.monthly_total || 0,
      );

  const subscriptionStatus =
    subscription?.status || "active";

  const smsConsent = parseBoolean(
    metadata.sms_consent,
  );

  const smsConsentAt = smsConsent
    ? parseNullableDate(
        metadata.sms_consent_at,
      ) || new Date().toISOString()
    : null;

  const smsConsentSource = smsConsent
    ? cleanText(
        metadata.sms_consent_source,
      ) || "website_signup"
    : null;

  const customerData = {
    first_name: cleanText(
      metadata.first_name,
    ),

    last_name: cleanText(
      metadata.last_name,
    ),

    phone: cleanText(metadata.phone),

    email:
      cleanText(metadata.email) ||
      cleanText(
        session.customer_details?.email,
      ) ||
      cleanText(session.customer_email),

    address: cleanText(metadata.address),

    city: cleanText(metadata.city),

    state:
      cleanText(metadata.state) || "CO",

    zip: cleanText(metadata.zip),

    lat,
    lng,

    service_plan:
      cleanText(metadata.plan_name) ||
      cleanText(metadata.plan_key),

    service_frequency: cleanText(
      metadata.service_frequency,
    ),

    service_day: primaryServiceDay,

    second_service_day:
      secondServiceDay,

    service_days: serviceDays,

    zone: cleanText(metadata.zone),

    status:
      getCustomerOperationalStatus(
        subscriptionStatus,
      ),

    source: "stripe",

    signup_source: "website",

    stripe_customer_id:
      stripeCustomerId,

    stripe_subscription_id:
      subscriptionId,

    subscription_status:
      subscriptionStatus,

    monthly_amount:
      Number.isFinite(monthlyAmount)
        ? monthlyAmount
        : 0,

    next_billing_date: subscription
      ? getNextBillingDate(subscription)
      : null,

    lifetime_revenue: 0,

    sms_consent: smsConsent,

    sms_consent_at: smsConsentAt,

    sms_consent_source:
      smsConsentSource,

    notes: `Stripe signup. Zone: ${cleanText(
      metadata.zone,
    )}`,
  };

  const { data, error } = await supabase
    .from("customers")
    .upsert(customerData, {
      onConflict:
        "stripe_subscription_id",
    })
    .select(
      "id, email, service_days, sms_consent",
    )
    .single();

  if (error) {
    throw error;
  }

  console.log(
    "Customer created or updated from Stripe checkout:",
    {
      customerId: data?.id,
      email: data?.email,
      serviceDays:
        data?.service_days || serviceDays,
      smsConsent:
        data?.sms_consent === true,
    },
  );
}

async function handleInvoicePaid(
  invoice: Stripe.Invoice,
): Promise<void> {
  const subscriptionId =
    getSubscriptionId(
      invoice.subscription,
    );

  if (!subscriptionId) {
    return;
  }

  const { data: customer, error } =
    await supabase
      .from("customers")
      .select(
        "id, lifetime_revenue",
      )
      .eq(
        "stripe_subscription_id",
        subscriptionId,
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (!customer) {
    console.warn(
      `Invoice paid before customer existed for subscription ${subscriptionId}.`,
    );

    return;
  }

  const currentRevenue = Number(
    customer.lifetime_revenue || 0,
  );

  const invoiceAmount =
    Number(invoice.amount_paid || 0) /
    100;

  await updateCustomerBySubscription(
    subscriptionId,
    {
      subscription_status: "active",

      status: "Active",

      lifetime_revenue:
        currentRevenue + invoiceAmount,
    },
  );
}

async function handlePaymentFailed(
  invoice: Stripe.Invoice,
): Promise<void> {
  const subscriptionId =
    getSubscriptionId(
      invoice.subscription,
    );

  if (!subscriptionId) {
    return;
  }

  await updateCustomerBySubscription(
    subscriptionId,
    {
      subscription_status:
        "past_due",

      status: "Payment Failed",
    },
  );
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
): Promise<void> {
  await updateCustomerBySubscription(
    subscription.id,
    {
      stripe_customer_id:
        getStripeCustomerId(
          subscription.customer,
        ),

      subscription_status:
        subscription.status,

      monthly_amount:
        getMonthlySubscriptionAmount(
          subscription,
        ),

      next_billing_date:
        getNextBillingDate(
          subscription,
        ),

      status:
        getCustomerOperationalStatus(
          subscription.status,
        ),
    },
  );
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<void> {
  await updateCustomerBySubscription(
    subscription.id,
    {
      subscription_status:
        "canceled",

      status: "Cancelled",

      next_billing_date: null,
    },
  );
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(
      "Method not allowed",
      {
        status: 405,
      },
    );
  }

  const signature = req.headers.get(
    "stripe-signature",
  );

  if (!signature) {
    return new Response(
      "Missing Stripe signature",
      {
        status: 400,
      },
    );
  }

  const rawBody = await req.text();

  let event: Stripe.Event;

  try {
    event =
      await stripe.webhooks
        .constructEventAsync(
          rawBody,
          signature,
          webhookSecret,
        );
  } catch (error) {
    console.error(
      "Webhook signature verification failed:",
      error,
    );

    return new Response(
      "Invalid signature",
      {
        status: 400,
      },
    );
  }

  try {
    if (
      await hasProcessedEvent(event.id)
    ) {
      console.log(
        `Stripe event ${event.id} was already processed.`,
      );

      return jsonResponse({
        received: true,
        duplicate: true,
      });
    }

    console.log(
      "Processing Stripe webhook:",
      {
        eventId: event.id,
        eventType: event.type,
      },
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session =
          event.data
            .object as Stripe.Checkout.Session;

        await handleCheckoutCompleted(
          session,
        );

        break;
      }

      case "invoice.paid": {
        const invoice =
          event.data
            .object as Stripe.Invoice;

        await handleInvoicePaid(invoice);

        break;
      }

      case "invoice.payment_failed": {
        const invoice =
          event.data
            .object as Stripe.Invoice;

        await handlePaymentFailed(
          invoice,
        );

        break;
      }

      case "customer.subscription.updated": {
        const subscription =
          event.data
            .object as Stripe.Subscription;

        await handleSubscriptionUpdated(
          subscription,
        );

        break;
      }

      case "customer.subscription.deleted": {
        const subscription =
          event.data
            .object as Stripe.Subscription;

        await handleSubscriptionDeleted(
          subscription,
        );

        break;
      }

      default: {
        console.log(
          `Stripe event type ${event.type} does not require CRM action.`,
        );
      }
    }

    await markEventProcessed(
      event.id,
      event.type,
    );

    return jsonResponse({
      received: true,
      event_type: event.type,
    });
  } catch (error) {
    console.error(
      "Webhook processing error:",
      error,
    );

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      500,
    );
  }
});