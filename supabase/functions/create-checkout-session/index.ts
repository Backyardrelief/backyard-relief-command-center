import Stripe from "npm:stripe@18.5.0";

console.log(
  "CREATE CHECKOUT SESSION — CUSTOMER METADATA + SMS CONSENT VERSION DEPLOYED",
);

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY.");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-06-30.basil",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

const ZIP_ZONE_MAP: Record<
  string,
  {
    zone: string;
    service_day: string;
  }
> = {
  "80123": {
    zone: "Zone A",
    service_day: "Monday",
  },
  "80236": {
    zone: "Zone A",
    service_day: "Monday",
  },

  "80127": {
    zone: "Zone B",
    service_day: "Tuesday",
  },
  "80128": {
    zone: "Zone B",
    service_day: "Tuesday",
  },

  "80120": {
    zone: "Zone C",
    service_day: "Wednesday",
  },
  "80121": {
    zone: "Zone C",
    service_day: "Wednesday",
  },

  "80122": {
    zone: "Zone D",
    service_day: "Thursday",
  },
  "80129": {
    zone: "Zone D",
    service_day: "Thursday",
  },

  "80125": {
    zone: "Zone E",
    service_day: "Friday",
  },
  "80126": {
    zone: "Zone E",
    service_day: "Friday",
  },
  "80130": {
    zone: "Zone E",
    service_day: "Friday",
  },
};

const PRIORITY_SIGNUP_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type CheckoutCustomer = {
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  lat?: number | null;
  lng?: number | null;
  sms_consent?: boolean;
  sms_consent_source?: string;
  sms_consent_at?: string;
  sms_consent_timestamp?: string;
};

type CheckoutPlan = {
  key?: string;
  name?: string;
  price?: number;
  stripePriceId?: string;
};

type CheckoutAddOn = {
  key?: string;
  label?: string;
  price?: number;
  stripePriceId?: string;
};

type ServiceSchedule = {
  days?: unknown[];
  frequency?: string;
};

type CheckoutRequest = {
  customer?: CheckoutCustomer;
  plan?: CheckoutPlan;
  selected_add_ons?: CheckoutAddOn[];
  service_schedule?: ServiceSchedule;
  monthly_total?: number;
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

function cleanZip(zip: unknown): string {
  return String(zip || "")
    .replace(/\D/g, "")
    .slice(0, 5);
}

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

function sanitizeDays(days: unknown[]): string[] {
  if (!Array.isArray(days)) {
    return [];
  }

  return [
    ...new Set(
      days
        .map((day) => cleanText(day))
        .filter((day) =>
          PRIORITY_SIGNUP_DAYS.includes(day)
        ),
    ),
  ];
}

function getAssignment(zip: unknown) {
  const cleanedZip = cleanZip(zip);
  const assignment = ZIP_ZONE_MAP[cleanedZip];

  if (!assignment) {
    throw new Error(
      "This ZIP code is outside the Backyard Relief service area.",
    );
  }

  return {
    ...assignment,
    zip: cleanedZip,
  };
}

function getSchedule(
  planKey: string,
  requestedDays: unknown[],
  fallbackDay: string,
) {
  const normalizedPlan = planKey.toLowerCase();
  const selectedDays = sanitizeDays(requestedDays);

  if (normalizedPlan === "premium") {
    if (selectedDays.length !== 1) {
      throw new Error(
        "Premium memberships require exactly one service day.",
      );
    }

    return {
      days: selectedDays,
      primary: selectedDays[0],
      frequency: "weekly",
    };
  }

  if (normalizedPlan === "elite") {
    if (selectedDays.length !== 2) {
      throw new Error(
        "Elite memberships require exactly two service days.",
      );
    }

    return {
      days: selectedDays,
      primary: selectedDays[0],
      frequency: "twice_weekly",
    };
  }

  if (normalizedPlan === "basic") {
    return {
      days: [fallbackDay],
      primary: fallbackDay,
      frequency: "biweekly",
    };
  }

  return {
    days: [fallbackDay],
    primary: fallbackDay,
    frequency: "weekly",
  };
}

function getSmsConsentAt(
  customer: CheckoutCustomer,
  smsConsent: boolean,
): string {
  if (!smsConsent) {
    return "";
  }

  return cleanText(
    customer.sms_consent_at ||
      customer.sms_consent_timestamp ||
      new Date().toISOString(),
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        error: "Method not allowed",
      },
      405,
    );
  }

  try {
    const body =
      (await req.json()) as CheckoutRequest;

    console.log("CHECKOUT REQUEST RECEIVED", {
      hasCustomer: Boolean(body.customer),
      planKey: body.plan?.key || null,
      selectedAddOnCount:
        body.selected_add_ons?.length || 0,
      monthlyTotal: body.monthly_total || 0,
    });

    const customer = body.customer;
    const plan = body.plan;
    const selectedAddOns =
      body.selected_add_ons || [];
    const serviceSchedule =
      body.service_schedule;

    if (!customer) {
      throw new Error(
        "Missing customer information.",
      );
    }

    if (!cleanText(customer.first_name)) {
      throw new Error("Missing first name.");
    }

    if (!cleanText(customer.last_name)) {
      throw new Error("Missing last name.");
    }

    if (!cleanText(customer.phone)) {
      throw new Error("Missing phone number.");
    }

    if (!cleanText(customer.email)) {
      throw new Error("Missing email.");
    }

    if (!cleanText(customer.address)) {
      throw new Error("Missing address.");
    }

    if (!cleanText(customer.city)) {
      throw new Error("Missing city.");
    }

    if (!cleanZip(customer.zip)) {
      throw new Error("Missing ZIP code.");
    }

    if (!plan?.stripePriceId) {
      throw new Error(
        "Missing Stripe price for selected plan.",
      );
    }

    if (!plan.key) {
      throw new Error(
        "Missing selected plan key.",
      );
    }

    const assignment = getAssignment(
      customer.zip,
    );

    const schedule = getSchedule(
      plan.key,
      serviceSchedule?.days || [],
      assignment.service_day,
    );

    const smsConsent =
      customer.sms_consent === true;

    const smsConsentSource = smsConsent
      ? cleanText(
          customer.sms_consent_source ||
            "website_signup",
        )
      : "";

    const smsConsentAt = getSmsConsentAt(
      customer,
      smsConsent,
    );

    const validAddOns = selectedAddOns.filter(
      (
        addOn,
      ): addOn is CheckoutAddOn & {
        stripePriceId: string;
      } => Boolean(addOn.stripePriceId),
    );

    if (
      validAddOns.length !==
      selectedAddOns.length
    ) {
      throw new Error(
        "One or more selected add-ons are missing a Stripe price.",
      );
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },

        ...validAddOns.map((addOn) => ({
          price: addOn.stripePriceId,
          quantity: 1,
        })),
      ];

    console.log("CHECKOUT LINE ITEMS", {
      count: lineItems.length,
      plan: plan.key,
      addOns: validAddOns.map(
        (addOn) => addOn.key,
      ),
    });

    const metadata: Record<string, string> = {
      first_name: cleanText(
        customer.first_name,
      ),

      last_name: cleanText(
        customer.last_name,
      ),

      phone: cleanText(customer.phone),

      email: cleanText(customer.email),

      address: cleanText(customer.address),

      city: cleanText(customer.city),

      state:
        cleanText(customer.state) || "CO",

      zip: assignment.zip,

      lat:
        customer.lat === null ||
        customer.lat === undefined
          ? ""
          : String(customer.lat),

      lng:
        customer.lng === null ||
        customer.lng === undefined
          ? ""
          : String(customer.lng),

      plan_key: cleanText(plan.key),

      plan_name:
        cleanText(plan.name) ||
        cleanText(plan.key),

      service_frequency:
        schedule.frequency,

      zone: assignment.zone,

      service_day: schedule.primary,

      service_days: JSON.stringify(
        schedule.days,
      ),

      monthly_total: String(
        Number(body.monthly_total || 0),
      ),

      selected_add_ons: JSON.stringify(
        validAddOns.map((addOn) => ({
          key: addOn.key || "",
          label: addOn.label || "",
          price: Number(addOn.price || 0),
        })),
      ),

      sms_consent: String(smsConsent),

      sms_consent_source:
        smsConsentSource,

      sms_consent_at: smsConsentAt,
    };

    const session =
      await stripe.checkout.sessions.create({
        mode: "subscription",

        customer_email: cleanText(
          customer.email,
        ),

        line_items: lineItems,

        success_url:
          "https://signup.backyardrelief.com/signup-success?session_id={CHECKOUT_SESSION_ID}",

        cancel_url:
          "https://signup.backyardrelief.com/signup",

        metadata,

        subscription_data: {
          metadata,
        },
      });

    console.log(
      "STRIPE CHECKOUT SESSION CREATED",
      {
        sessionId: session.id,
        serviceDays: schedule.days,
        smsConsent,
      },
    );

    return jsonResponse({
      success: true,
      url: session.url,
      session_id: session.id,
    });
  } catch (error) {
    console.error(
      "CREATE CHECKOUT SESSION ERROR:",
      error,
    );

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      400,
    );
  }
});