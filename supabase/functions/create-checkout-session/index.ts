import Stripe from "npm:stripe@18.5.0";

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
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

// -----------------------------------------------------------------------------
// PRODUCTION ZIP → ZONE → AUTOMATIC SERVICE DAY
// -----------------------------------------------------------------------------

const ZIP_ZONE_MAP: Record<
  string,
  {
    zone: string;
    service_day: string;
  }
> = {
  // Zone A — Monday
  "80123": {
    zone: "Zone A",
    service_day: "Monday",
  },
  "80236": {
    zone: "Zone A",
    service_day: "Monday",
  },

  // Zone B — Tuesday
  "80127": {
    zone: "Zone B",
    service_day: "Tuesday",
  },
  "80128": {
    zone: "Zone B",
    service_day: "Tuesday",
  },

  // Zone C — Wednesday
  "80120": {
    zone: "Zone C",
    service_day: "Wednesday",
  },
  "80121": {
    zone: "Zone C",
    service_day: "Wednesday",
  },

  // Zone D — Thursday
  "80122": {
    zone: "Zone D",
    service_day: "Thursday",
  },
  "80129": {
    zone: "Zone D",
    service_day: "Thursday",
  },

  // Zone E — Friday
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

// Premium and Elite customers may select Saturday.
// No ZIP code is automatically assigned to Saturday.
const PRIORITY_SIGNUP_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

type PrioritySignupDay = (typeof PRIORITY_SIGNUP_DAYS)[number];

type CheckoutRequestBody = {
  customer?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    sms_consent?: boolean;
    sms_consent_source?: string;
    sms_consent_timestamp?: string;
  };

  plan?: {
    key?: string;
    name?: string;
    frequency?: string;
    stripePriceId?: string;
  };

  selected_add_ons?: Array<{
    key?: string;
    label?: string;
    stripePriceId?: string;
    price?: number;
  }>;

  service_schedule?: {
    frequency?: string;
    days?: string[];
    week_offset?: number;
    priority_scheduling?: boolean;
  };

  monthly_total?: number;
};

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function cleanZipCode(zip: unknown): string {
  return String(zip || "")
    .replace(/\D/g, "")
    .slice(0, 5);
}

function normalizePlanKey(planKey: unknown): string {
  return String(planKey || "")
    .trim()
    .toLowerCase();
}

function getServiceAssignment(zip: unknown) {
  const cleanZip = cleanZipCode(zip);
  const assignment = ZIP_ZONE_MAP[cleanZip];

  if (!assignment) {
    throw new Error(
      `Sorry, ZIP code ${
        cleanZip || "provided"
      } is outside our current service area.`
    );
  }

  return {
    ...assignment,
    zip: cleanZip,
  };
}

function isPrioritySignupDay(day: unknown): day is PrioritySignupDay {
  return PRIORITY_SIGNUP_DAYS.includes(
    String(day) as PrioritySignupDay
  );
}

function sanitizeSelectedDays(days: unknown): PrioritySignupDay[] {
  if (!Array.isArray(days)) {
    return [];
  }

  const validDays = days.filter(isPrioritySignupDay);

  return [...new Set(validDays)];
}

function getValidatedServiceSchedule({
  planKey,
  frontendDays,
  frontendFrequency,
  automaticServiceDay,
  planFrequency,
}: {
  planKey: string;
  frontendDays: unknown;
  frontendFrequency: unknown;
  automaticServiceDay: string;
  planFrequency: unknown;
}) {
  const normalizedPlanKey = normalizePlanKey(planKey);
  const selectedDays = sanitizeSelectedDays(frontendDays);

  if (normalizedPlanKey === "premium") {
    if (selectedDays.length !== 1) {
      throw new Error(
        "Premium customers must select exactly one service day."
      );
    }

    return {
      days: selectedDays,
      primaryServiceDay: selectedDays[0],
      frequency: "weekly",
      priorityScheduling: true,
    };
  }

  if (normalizedPlanKey === "elite") {
    if (selectedDays.length !== 2) {
      throw new Error(
        "Elite customers must select exactly two different service days."
      );
    }

    return {
      days: selectedDays,
      primaryServiceDay: selectedDays[0],
      frequency: "twice_weekly",
      priorityScheduling: true,
    };
  }

  if (normalizedPlanKey === "basic") {
    return {
      days: [automaticServiceDay],
      primaryServiceDay: automaticServiceDay,
      frequency: "biweekly",
      priorityScheduling: false,
    };
  }

  // Standard and Relief Plus are automatically assigned by ZIP.
  return {
    days: [automaticServiceDay],
    primaryServiceDay: automaticServiceDay,
    frequency:
      String(frontendFrequency || planFrequency || "weekly") ===
      "biweekly"
        ? "weekly"
        : "weekly",
    priorityScheduling: false,
  };
}

// -----------------------------------------------------------------------------
// EDGE FUNCTION
// -----------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Method not allowed.",
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    const body = (await req.json()) as CheckoutRequestBody;

    console.log("REQUEST BODY:", body);

    const {
      customer,
      plan,
      selected_add_ons = [],
      service_schedule,
      monthly_total,
    } = body;

    if (!customer?.first_name?.trim()) {
      throw new Error("Customer first name is required.");
    }

    if (!customer?.last_name?.trim()) {
      throw new Error("Customer last name is required.");
    }

    if (!customer?.email?.trim()) {
      throw new Error("Customer email is required.");
    }

    if (!customer?.phone?.trim()) {
      throw new Error("Customer phone number is required.");
    }

    if (!customer?.zip) {
      throw new Error("Customer ZIP code is required.");
    }

    if (!plan?.key) {
      throw new Error("Selected plan is required.");
    }

    if (!plan?.stripePriceId) {
      throw new Error(
        "Missing Stripe price ID for the selected plan."
      );
    }

    if (!customer.sms_consent) {
      throw new Error(
        "SMS consent is required to continue signup."
      );
    }

    const assignment = getServiceAssignment(customer.zip);

    const validatedSchedule = getValidatedServiceSchedule({
      planKey: plan.key,
      frontendDays: service_schedule?.days,
      frontendFrequency: service_schedule?.frequency,
      automaticServiceDay: assignment.service_day,
      planFrequency: plan.frequency,
    });

    const invalidAddOn = selected_add_ons.find(
      (item) => !item?.stripePriceId
    );

    if (invalidAddOn) {
      throw new Error(
        `Missing Stripe price ID for add-on: ${
          invalidAddOn.label ||
          invalidAddOn.key ||
          "Unknown add-on"
        }.`
      );
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price: plan.stripePriceId,
        quantity: 1,
      },
      ...selected_add_ons.map((item) => ({
        price: item.stripePriceId!,
        quantity: 1,
      })),
    ];

    console.log("LINE ITEMS:", lineItems);
    console.log("ASSIGNMENT:", assignment);
    console.log("VALIDATED SCHEDULE:", validatedSchedule);

    const appUrl =
      Deno.env.get("APP_URL") || "http://localhost:5173";

    const serviceDaysJson = JSON.stringify(
      validatedSchedule.days
    );

    const selectedAddOnKeys = selected_add_ons
      .map((item) => item.key || "")
      .filter(Boolean)
      .join(",");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",

      customer_email: customer.email.trim(),

      line_items: lineItems,

      success_url:
        `${appUrl}/signup-success` +
        "?session_id={CHECKOUT_SESSION_ID}",

      cancel_url: `${appUrl}/signup`,

      metadata: {
        first_name: customer.first_name.trim(),
        last_name: customer.last_name.trim(),
        phone: customer.phone.trim(),
        email: customer.email.trim(),

        address: customer.address?.trim() || "",
        city: customer.city?.trim() || "",
        state: customer.state?.trim() || "CO",
        zip: assignment.zip,

        plan_key: plan.key || "",
        plan_name: plan.name || "",

        zone: assignment.zone,

        // For Premium, this is the selected day.
        // For Elite, this is the first selected day.
        // For all other plans, this is the automatic ZIP day.
        service_day: validatedSchedule.primaryServiceDay,

        service_days: serviceDaysJson,

        service_frequency: validatedSchedule.frequency,

        priority_scheduling: String(
          validatedSchedule.priorityScheduling
        ),

        selected_add_ons: selectedAddOnKeys,

        monthly_total: String(monthly_total || 0),

        sms_consent: String(Boolean(customer.sms_consent)),

        sms_consent_source:
          customer.sms_consent_source || "website_signup",

        sms_consent_timestamp:
          customer.sms_consent_timestamp ||
          new Date().toISOString(),
      },

      subscription_data: {
        metadata: {
          plan_key: plan.key || "",
          plan_name: plan.name || "",

          zone: assignment.zone,

          service_day:
            validatedSchedule.primaryServiceDay,

          service_days: serviceDaysJson,

          service_frequency:
            validatedSchedule.frequency,

          priority_scheduling: String(
            validatedSchedule.priorityScheduling
          ),

          selected_add_ons: selectedAddOnKeys,

          monthly_total: String(monthly_total || 0),
        },
      },
    });

    console.log(
      "CHECKOUT SESSION CREATED:",
      session.id
    );

    return new Response(
      JSON.stringify({
        url: session.url,
        zone: assignment.zone,
        service_day:
          validatedSchedule.primaryServiceDay,
        service_days: validatedSchedule.days,
        service_frequency:
          validatedSchedule.frequency,
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
        error:
          error instanceof Error
            ? error.message
            : String(error),
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