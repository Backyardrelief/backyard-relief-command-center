import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://crm.backyardrelief.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

type SendCrmMessageRequest = {
  to_phone?: string;
  body?: string;
  customer_id?: string | null;
};

function getCorsHeaders(origin: string | null) {
  const allowedOrigin =
    origin && allowedOrigins.has(origin)
      ? origin
      : "https://crm.backyardrelief.com";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-crm-access-code",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    Vary: "Origin",
  };
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizePhoneNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  return null;
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        error: "Method not allowed.",
      },
      405,
      corsHeaders,
    );
  }

  try {
    const suppliedAccessCode = cleanText(
      req.headers.get("x-crm-access-code"),
    );

    const expectedAccessCode = cleanText(
      Deno.env.get("CRM_ACCESS_CODE"),
    );

    if (
      !expectedAccessCode ||
      suppliedAccessCode !== expectedAccessCode
    ) {
      return jsonResponse(
        {
          success: false,
          error: "Unauthorized.",
        },
        401,
        corsHeaders,
      );
    }

    const requestBody =
      (await req.json()) as SendCrmMessageRequest;

    const toPhone = normalizePhoneNumber(
      cleanText(requestBody.to_phone),
    );

    const messageBody = cleanText(requestBody.body);

    const customerId =
      cleanText(requestBody.customer_id) || null;

    if (!toPhone) {
      return jsonResponse(
        {
          success: false,
          error:
            "Recipient must be a valid 10-digit United States phone number.",
        },
        400,
        corsHeaders,
      );
    }

    if (!messageBody) {
      return jsonResponse(
        {
          success: false,
          error: "Message cannot be empty.",
        },
        400,
        corsHeaders,
      );
    }

    if (messageBody.length > 1600) {
      return jsonResponse(
        {
          success: false,
          error:
            "Message is too long. Maximum length is 1,600 characters.",
        },
        400,
        corsHeaders,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

    const accountSid = Deno.env.get(
      "TWILIO_ACCOUNT_SID",
    );

    const authToken = Deno.env.get(
      "TWILIO_AUTH_TOKEN",
    );

    const messagingServiceSid = Deno.env.get(
      "TWILIO_MESSAGING_SERVICE_SID",
    );

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "Supabase server configuration is incomplete.",
      );
    }

    if (
      !accountSid ||
      !authToken ||
      !messagingServiceSid
    ) {
      throw new Error(
        "Twilio server configuration is incomplete.",
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    let verifiedCustomerId: string | null = null;

    if (customerId) {
      const {
        data: customer,
        error: customerError,
      } = await supabase
        .from("customers")
        .select("id, phone")
        .eq("id", customerId)
        .maybeSingle();

      if (customerError) {
        throw new Error(
          `Customer lookup failed: ${customerError.message}`,
        );
      }

      if (customer) {
        const customerPhone = normalizePhoneNumber(
          cleanText(customer.phone),
        );

        if (
          customerPhone &&
          customerPhone === toPhone
        ) {
          verifiedCustomerId = customer.id;
        }
      }
    }

    const twilioUrl =
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const smsStatusWebhookSecret =
  Deno.env.get("SMS_STATUS_WEBHOOK_SECRET");

if (!smsStatusWebhookSecret) {
  throw new Error(
    "SMS status webhook configuration is incomplete.",
  );
}

const statusCallbackUrl =
  "https://ugtqsmrgwnyxzuwrolcz.supabase.co" +
  "/functions/v1/update-sms-status" +
  `?secret=${encodeURIComponent(
    smsStatusWebhookSecret,
  )}`;

const twilioBody = new URLSearchParams({
  To: toPhone,
  MessagingServiceSid: messagingServiceSid,
  Body: messageBody,
  StatusCallback: statusCallbackUrl,
});

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization:
          `Basic ${btoa(
            `${accountSid}:${authToken}`,
          )}`,
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: twilioBody,
    });

    const twilioData =
      await twilioResponse.json();

    if (!twilioResponse.ok) {
      const errorCode = twilioData?.code
        ? String(twilioData.code)
        : null;

      const errorMessage =
        cleanText(twilioData?.message) ||
        "Twilio could not send the message.";

      console.error("CRM message failed:", {
        toPhone,
        customerId: verifiedCustomerId,
        errorCode,
        errorMessage,
      });

      return jsonResponse(
        {
          success: false,
          error: "Message failed to send.",
          twilio_code: errorCode,
          details: errorMessage,
        },
        502,
        corsHeaders,
      );
    }

    const messageSid = cleanText(
      twilioData.sid,
    );

    const messageStatus =
      cleanText(twilioData.status) || "queued";

    const sentAt = new Date().toISOString();

    const {
      data: savedMessage,
      error: saveError,
    } = await supabase
      .from("sms_messages")
      .insert({
        customer_id: verifiedCustomerId,
        direction: "outbound",
        from_phone: "+17206059964",
        to_phone: toPhone,
        body: messageBody,
        twilio_message_sid: messageSid,
        twilio_account_sid: accountSid,
        status: messageStatus,
        media_count: 0,
        media_urls: [],
        is_read: true,
        created_at: sentAt,
      })
      .select()
      .single();

    if (saveError) {
      console.error(
        "Twilio sent the message, but CRM history could not be saved:",
        saveError,
      );

      return jsonResponse(
        {
          success: true,
          sent: true,
          history_saved: false,
          warning:
            "Message sent, but conversation history could not be saved.",
          message_sid: messageSid,
          status: messageStatus,
          sent_to: toPhone,
          sent_at: sentAt,
        },
        200,
        corsHeaders,
      );
    }

    console.log("CRM message sent:", {
      messageSid,
      status: messageStatus,
      toPhone,
      customerId: verifiedCustomerId,
    });

    return jsonResponse(
      {
        success: true,
        sent: true,
        history_saved: true,
        message_sid: messageSid,
        status: messageStatus,
        sent_to: toPhone,
        sent_at: sentAt,
        message: savedMessage,
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    console.error(
      "SEND CRM MESSAGE SERVER ERROR:",
      error,
    );

    return jsonResponse(
      {
        success: false,
        error: "Server error.",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      500,
      corsHeaders,
    );
  }
});