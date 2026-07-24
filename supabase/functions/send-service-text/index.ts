import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log(
  "SEND SERVICE TEXT — HISTORY + DUPLICATE PROTECTION + PERSONALIZATION DEPLOYED",
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

type MessageType = "on_the_way" | "completed";

type CustomerRecord = {
  id: string;
  first_name: string | null;
  phone: string | null;
  dog_names: string | null;
  sms_consent: boolean | null;
  last_gate_photo_url: string | null;
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizePhoneNumber(
  phone: string,
): string | null {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (
    digits.length === 11 &&
    digits.startsWith("1")
  ) {
    return `+${digits}`;
  }

  return null;
}

function formatDogNames(
  dogNamesValue: unknown,
): string {
  const rawDogNames = cleanText(
    dogNamesValue,
  );

  if (!rawDogNames) {
    return "";
  }

  const dogNames = rawDogNames
    .split(/,|&|\band\b/gi)
    .map((name) => name.trim())
    .filter(Boolean);

  const uniqueDogNames = [
    ...new Set(dogNames),
  ];

  if (uniqueDogNames.length === 0) {
    return "";
  }

  if (uniqueDogNames.length === 1) {
    return uniqueDogNames[0];
  }

  if (uniqueDogNames.length === 2) {
    return `${uniqueDogNames[0]} and ${uniqueDogNames[1]}`;
  }

  const finalDogName =
    uniqueDogNames[
      uniqueDogNames.length - 1
    ];

  return `${uniqueDogNames
    .slice(0, -1)
    .join(", ")}, and ${finalDogName}`;
}

function buildMessage(
  customer: CustomerRecord,
  type: MessageType,
): string {
  const firstName =
    cleanText(customer.first_name) ||
    "there";

  const dogNames = formatDogNames(
    customer.dog_names,
  );

  if (type === "on_the_way") {
    if (dogNames) {
      return (
        `Hi ${firstName}! Backyard Relief is on the way to service your yard. ` +
        `Please make sure we can safely access the yard. ` +
        `We’ll have it ready for ${dogNames} soon! 🐾`
      );
    }

    return (
      `Hi ${firstName}! Backyard Relief is on the way to service your yard. ` +
      `Please make sure we can safely access the yard. See you soon! 🐾`
    );
  }

  let message = dogNames
    ? (
      `Hi ${firstName}! Your yard has officially been relieved! ` +
      `We hope you and ${dogNames} have a great day enjoying a clean yard. ` +
      `Your gate has been checked and securely closed. ` +
      `Thanks for choosing Backyard Relief! 🐾`
    )
    : (
      `Hi ${firstName}! Your yard has officially been relieved! ` +
      `We hope you have a great day enjoying a clean yard. ` +
      `Your gate has been checked and securely closed. ` +
      `Thanks for choosing Backyard Relief! 🐾`
    );

  if (customer.last_gate_photo_url) {
    message +=
      ` Gate photo: ${customer.last_gate_photo_url}`;
  }

  return message;
}

function getDuplicateWindowStart(
  type: MessageType,
): string {
  const now = Date.now();

  const duplicateWindowMilliseconds =
    type === "on_the_way"
      ? 30 * 60 * 1000
      : 12 * 60 * 60 * 1000;

  return new Date(
    now - duplicateWindowMilliseconds,
  ).toISOString();
}

async function saveSmsHistory(
  supabase: ReturnType<
    typeof createClient
  >,
  history: {
    customer_id: string;
    message_type: MessageType;
    recipient_phone: string | null;
    message_body: string;
    twilio_message_sid?: string | null;
    twilio_status?: string | null;
    error_code?: string | null;
    error_message?: string | null;
    skipped?: boolean;
    skip_reason?: string | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from("sms_history")
    .insert({
      customer_id: history.customer_id,
      message_type: history.message_type,
      recipient_phone:
        history.recipient_phone,
      message_body: history.message_body,
      twilio_message_sid:
        history.twilio_message_sid ||
        null,
      twilio_status:
        history.twilio_status || null,
      error_code:
        history.error_code || null,
      error_message:
        history.error_message || null,
      skipped:
        history.skipped === true,
      skip_reason:
        history.skip_reason || null,
    });

  if (error) {
    console.error(
      "Unable to save SMS history:",
      error,
    );
  }
}

async function findRecentDuplicate(
  supabase: ReturnType<
    typeof createClient
  >,
  customerId: string,
  type: MessageType,
) {
  const duplicateWindowStart =
    getDuplicateWindowStart(type);

  const { data, error } = await supabase
    .from("sms_history")
    .select(
      `
        id,
        created_at,
        twilio_message_sid,
        twilio_status
      `,
    )
    .eq("customer_id", customerId)
    .eq("message_type", type)
    .eq("skipped", false)
    .not(
      "twilio_message_sid",
      "is",
      null,
    )
    .gte(
      "created_at",
      duplicateWindowStart,
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "Duplicate SMS lookup failed:",
      error,
    );

    return null;
  }

  return data || null;
}

serve(async (req) => {
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
    const requestBody = await req.json();

    const customerId = cleanText(
      requestBody.customer_id,
    );

    const type = cleanText(
      requestBody.type,
    ) as MessageType;

    if (!customerId || !type) {
      return jsonResponse(
        {
          error:
            "Missing customer_id or type",
        },
        400,
      );
    }

    if (
      type !== "on_the_way" &&
      type !== "completed"
    ) {
      return jsonResponse(
        {
          error: "Invalid text type",
        },
        400,
      );
    }

    const supabaseUrl = Deno.env.get(
      "SUPABASE_URL",
    );

    const serviceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

    const accountSid = Deno.env.get(
      "TWILIO_ACCOUNT_SID",
    );

    const authToken = Deno.env.get(
      "TWILIO_AUTH_TOKEN",
    );

    const messagingServiceSid =
      Deno.env.get(
        "TWILIO_MESSAGING_SERVICE_SID",
      );

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      console.error(
        "Missing Supabase environment variables.",
      );

      return jsonResponse(
        {
          error:
            "Supabase server configuration is incomplete",
        },
        500,
      );
    }

    if (
      !accountSid ||
      !authToken ||
      !messagingServiceSid
    ) {
      console.error(
        "Missing Twilio environment variables.",
        {
          hasAccountSid:
            Boolean(accountSid),
          hasAuthToken:
            Boolean(authToken),
          hasMessagingServiceSid:
            Boolean(
              messagingServiceSid,
            ),
        },
      );

      return jsonResponse(
        {
          error:
            "Twilio server configuration is incomplete",
        },
        500,
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
    );

    const {
      data: customer,
      error: customerError,
    } = await supabase
      .from("customers")
      .select(
        `
          id,
          first_name,
          phone,
          dog_names,
          sms_consent,
          last_gate_photo_url
        `,
      )
      .eq("id", customerId)
      .single();

    if (customerError || !customer) {
      console.error(
        "Customer lookup failed:",
        customerError,
      );

      return jsonResponse(
        {
          error: "Customer not found",
        },
        404,
      );
    }

    const typedCustomer =
      customer as CustomerRecord;

    const message = buildMessage(
      typedCustomer,
      type,
    );

    if (
      typedCustomer.sms_consent !== true
    ) {
      console.log(
        "SMS skipped because customer has not consented:",
        {
          customerId,
          type,
        },
      );

      await saveSmsHistory(
        supabase,
        {
          customer_id: customerId,
          message_type: type,
          recipient_phone:
            typedCustomer.phone || null,
          message_body: message,
          skipped: true,
          skip_reason:
            "No SMS consent",
          twilio_status: "skipped",
        },
      );

      return jsonResponse({
        success: true,
        sent: false,
        skipped: true,
        duplicate: false,
        reason: "No SMS consent",
        type,
      });
    }

    if (!typedCustomer.phone) {
      await saveSmsHistory(
        supabase,
        {
          customer_id: customerId,
          message_type: type,
          recipient_phone: null,
          message_body: message,
          skipped: true,
          skip_reason:
            "Customer has no phone number",
          twilio_status: "skipped",
        },
      );

      return jsonResponse(
        {
          error:
            "Customer has no phone number",
        },
        400,
      );
    }

    const normalizedPhone =
      normalizePhoneNumber(
        typedCustomer.phone,
      );

    if (!normalizedPhone) {
      await saveSmsHistory(
        supabase,
        {
          customer_id: customerId,
          message_type: type,
          recipient_phone:
            typedCustomer.phone,
          message_body: message,
          skipped: true,
          skip_reason:
            "Invalid phone number",
          twilio_status: "skipped",
        },
      );

      return jsonResponse(
        {
          error:
            "Customer phone number must be a valid 10-digit US number",
        },
        400,
      );
    }

    const recentDuplicate =
      await findRecentDuplicate(
        supabase,
        customerId,
        type,
      );

    if (recentDuplicate) {
      const duplicateReason =
        type === "on_the_way"
          ? "An on-the-way text was already sent within the last 30 minutes"
          : "A completion text was already sent recently for this service";

      console.log(
        "Duplicate SMS prevented:",
        {
          customerId,
          type,
          previousMessageSid:
            recentDuplicate
              .twilio_message_sid,
          previousCreatedAt:
            recentDuplicate.created_at,
        },
      );

      await saveSmsHistory(
        supabase,
        {
          customer_id: customerId,
          message_type: type,
          recipient_phone:
            normalizedPhone,
          message_body: message,
          skipped: true,
          skip_reason:
            duplicateReason,
          twilio_status:
            "duplicate_prevented",
        },
      );

      return jsonResponse({
        success: true,
        sent: false,
        skipped: true,
        duplicate: true,
        reason: duplicateReason,
        previous_message_sid:
          recentDuplicate
            .twilio_message_sid,
        previous_sent_at:
          recentDuplicate.created_at,
        type,
      });
    }

    const twilioUrl =
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const twilioBody =
      new URLSearchParams({
        To: normalizedPhone,
        MessagingServiceSid:
          messagingServiceSid,
        Body: message,
      });

    const twilioResponse = await fetch(
      twilioUrl,
      {
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
      },
    );

    const twilioData =
      await twilioResponse.json();

    if (!twilioResponse.ok) {
      const twilioErrorCode =
        twilioData?.code
          ? String(twilioData.code)
          : null;

      const twilioErrorMessage =
        cleanText(twilioData?.message) ||
        "Unknown Twilio error";

      console.error(
        "Twilio message failed:",
        {
          customerId,
          type,
          status:
            twilioResponse.status,
          code: twilioErrorCode,
          message:
            twilioErrorMessage,
        },
      );

      await saveSmsHistory(
        supabase,
        {
          customer_id: customerId,
          message_type: type,
          recipient_phone:
            normalizedPhone,
          message_body: message,
          twilio_status: "failed",
          error_code:
            twilioErrorCode,
          error_message:
            twilioErrorMessage,
        },
      );

      return jsonResponse(
        {
          error:
            "Text failed to send",
          twilio_code:
            twilioErrorCode,
          details:
            twilioErrorMessage,
        },
        502,
      );
    }

    const sentAt =
      new Date().toISOString();

    const messageSid =
      cleanText(twilioData.sid);

    const messageStatus =
      cleanText(twilioData.status) ||
      "queued";

    await saveSmsHistory(
      supabase,
      {
        customer_id: customerId,
        message_type: type,
        recipient_phone:
          normalizedPhone,
        message_body: message,
        twilio_message_sid:
          messageSid,
        twilio_status:
          messageStatus,
        skipped: false,
      },
    );

    const customerTimestampUpdate =
      type === "on_the_way"
        ? {
            last_on_the_way_text_sent_at:
              sentAt,
          }
        : {
            last_completed_text_sent_at:
              sentAt,
          };

    const {
      error: timestampUpdateError,
    } = await supabase
      .from("customers")
      .update(
        customerTimestampUpdate,
      )
      .eq("id", customerId);

    if (timestampUpdateError) {
      console.error(
        "Text sent, but customer SMS timestamp failed to update:",
        timestampUpdateError,
      );
    }

    console.log(
      "Service text accepted by Twilio:",
      {
        customerId,
        type,
        messageSid,
        messageStatus,
        recipient:
          normalizedPhone,
      },
    );

    return jsonResponse({
      success: true,
      sent: true,
      skipped: false,
      duplicate: false,
      message_sid: messageSid,
      status: messageStatus,
      sent_to: normalizedPhone,
      sent_at: sentAt,
      type,
    });
  } catch (error) {
    console.error(
      "SEND SERVICE TEXT SERVER ERROR:",
      error,
    );

    return jsonResponse(
      {
        error: "Server error",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      500,
    );
  }
});