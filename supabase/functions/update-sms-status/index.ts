import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}`,
    );
  }

  return value;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
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
    const requestUrl = new URL(req.url);

    const suppliedSecret =
      requestUrl.searchParams.get("secret") || "";

    const expectedSecret = getRequiredEnv(
      "SMS_STATUS_WEBHOOK_SECRET",
    );

    if (suppliedSecret !== expectedSecret) {
      return Response.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
          headers: corsHeaders,
        },
      );
    }

    const supabaseUrl =
      getRequiredEnv("SUPABASE_URL");

    const serviceRoleKey = getRequiredEnv(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

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

    /*
      Twilio sends Messaging status callbacks as
      application/x-www-form-urlencoded.
    */
    const formData = await req.formData();

    const messageSid = String(
      formData.get("MessageSid") ?? "",
    ).trim();

    const messageStatus = String(
      formData.get("MessageStatus") ?? "",
    )
      .trim()
      .toLowerCase();

    const errorCode = String(
      formData.get("ErrorCode") ?? "",
    ).trim();

    const errorMessage = String(
      formData.get("ErrorMessage") ?? "",
    ).trim();

    if (!messageSid) {
      throw new Error(
        "Twilio MessageSid is missing.",
      );
    }

    if (!messageStatus) {
      throw new Error(
        "Twilio MessageStatus is missing.",
      );
    }

    const updates: Record<string, unknown> = {
      status: messageStatus,
      updated_at: new Date().toISOString(),
    };

    if (
      messageStatus === "failed" ||
      messageStatus === "undelivered"
    ) {
      updates.error_code =
        errorCode || null;

      updates.error_message =
        errorMessage || null;
    } else {
      updates.error_code = null;
      updates.error_message = null;
    }

    if (messageStatus === "delivered") {
      updates.delivered_at =
        new Date().toISOString();
    }

    const {
      data: updatedMessage,
      error: updateError,
    } = await supabase
      .from("sms_messages")
      .update(updates)
      .eq("twilio_message_sid", messageSid)
      .select(
        `
          id,
          twilio_message_sid,
          status,
          error_code,
          error_message,
          delivered_at,
          updated_at
        `,
      )
      .maybeSingle();

    if (updateError) {
      throw new Error(
        `Could not update SMS status: ${updateError.message}`,
      );
    }

    if (!updatedMessage) {
      console.warn(
        "No CRM message matched Twilio SID:",
        messageSid,
      );
    } else {
      console.log("SMS status updated:", {
        messageSid,
        messageStatus,
        errorCode: errorCode || null,
      });
    }

    return Response.json(
      {
        success: true,
        matched: Boolean(updatedMessage),
        message_sid: messageSid,
        status: messageStatus,
      },
      {
        status: 200,
        headers: corsHeaders,
      },
    );
  } catch (error) {
    console.error(
      "SMS status callback failed:",
      error,
    );

    /*
      Return 200 so Twilio does not repeatedly retry
      a callback because of an internal CRM error.
    */
    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown callback error",
      },
      {
        status: 200,
        headers: corsHeaders,
      },
    );
  }
});