import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (
    digits.length === 11 &&
    digits.startsWith("1")
  ) {
    return digits.slice(1);
  }

  return digits;
}

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return Response.json(
      {
        success: false,
        error: "Method not allowed",
      },
      {
        status: 405,
        headers: corsHeaders,
      },
    );
  }

  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Twilio sends inbound messaging webhooks as
    // application/x-www-form-urlencoded.
    const formData = await req.formData();

    const messageSid = String(formData.get("MessageSid") ?? "").trim();
    const accountSid = String(formData.get("AccountSid") ?? "").trim();
    const fromPhone = String(formData.get("From") ?? "").trim();
    const toPhone = String(formData.get("To") ?? "").trim();
    const body = String(formData.get("Body") ?? "").trim();
    const numMedia = Number(formData.get("NumMedia") ?? 0);

    if (!messageSid) {
      throw new Error("Twilio MessageSid is missing.");
    }

    if (!fromPhone) {
      throw new Error("Sender phone number is missing.");
    }

    if (!toPhone) {
      throw new Error("Recipient phone number is missing.");
    }

    const normalizedFrom = normalizePhone(fromPhone);

    let customerId: string | null = null;

    const { data: customers, error: customerSearchError } = await supabase
      .from("customers")
      .select("id, phone")
      .not("phone", "is", null);

    if (customerSearchError) {
      throw new Error(
        `Could not search customers: ${customerSearchError.message}`,
      );
    }

    const matchedCustomer = customers?.find((customer) => {
      return normalizePhone(String(customer.phone ?? "")) === normalizedFrom;
    });

    if (matchedCustomer) {
      customerId = matchedCustomer.id;
    }

    const mediaUrls: Array<{
      url: string;
      contentType: string;
    }> = [];

    for (let index = 0; index < numMedia; index += 1) {
      const mediaUrl = String(
        formData.get(`MediaUrl${index}`) ?? "",
      ).trim();

      const mediaContentType = String(
        formData.get(`MediaContentType${index}`) ?? "",
      ).trim();

      if (mediaUrl) {
        mediaUrls.push({
          url: mediaUrl,
          contentType: mediaContentType,
        });
      }
    }

    const { error: insertError } = await supabase
      .from("sms_messages")
      .upsert(
        {
          customer_id: customerId,
          direction: "inbound",
          from_phone: fromPhone,
          to_phone: toPhone,
          body,
          twilio_message_sid: messageSid,
          twilio_account_sid: accountSid || null,
          status: "received",
          media_count: mediaUrls.length,
          media_urls: mediaUrls,
          is_read: false,
        },
        {
          onConflict: "twilio_message_sid",
          ignoreDuplicates: true,
        },
      );

    if (insertError) {
      throw new Error(
        `Could not save incoming SMS: ${insertError.message}`,
      );
    }

    console.log("Incoming SMS saved", {
      messageSid,
      fromPhone,
      toPhone,
      customerId,
      mediaCount: mediaUrls.length,
    });

    // Twilio expects valid TwiML. An empty Response means:
    // accept the message and send no automatic reply.
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`;

    return new Response(twiml, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/xml; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Incoming SMS webhook failed:", error);

    // Return valid TwiML even on failure so Twilio does not send
    // an unintended reply to the customer.
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`;

    return new Response(twiml, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/xml; charset=utf-8",
        "X-Webhook-Error":
          error instanceof Error
            ? error.message
            : "Unknown incoming SMS error",
      },
    });
  }
});