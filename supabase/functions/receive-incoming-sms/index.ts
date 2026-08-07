import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "sms-attachments";
const MAX_MEDIA_SIZE = 5 * 1024 * 1024;

const ALLOWED_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function normalizePhone(value: string): string {
  const digits = String(value).replace(/\D/g, "");

  // Normalize U.S. numbers so +13034825293
  // matches a customer stored as 3034825293.
  if (
    digits.length === 11 &&
    digits.startsWith("1")
  ) {
    return digits.slice(1);
  }

  return digits;
}

function formatPhone(value: string): string {
  const digits = normalizePhone(value);

  if (digits.length !== 10) {
    return value;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(
    3,
    6,
  )}-${digits.slice(6)}`;
}

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}`,
    );
  }

  return value;
}

function createMessagePreview(
  body: string,
  mediaCount: number,
): string {
  const cleanBody = body.replace(/\s+/g, " ").trim();

  if (cleanBody) {
    return cleanBody.length > 140
      ? `${cleanBody.slice(0, 137)}...`
      : cleanBody;
  }

  if (mediaCount > 0) {
    return mediaCount === 1
      ? "Sent a photo"
      : `Sent ${mediaCount} attachments`;
  }

  return "Sent a new message";
}

function getFileExtension(
  contentType: string,
): string | null {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";

    case "image/png":
      return "png";

    case "image/gif":
      return "gif";

    case "image/webp":
      return "webp";

    default:
      return null;
  }
}

function safeFolderName(value: string): string {
  return (
    value.replace(/[^a-zA-Z0-9_-]/g, "") ||
    "unknown"
  );
}

async function downloadAndStoreTwilioMedia({
  supabase,
  mediaUrl,
  requestedContentType,
  accountSid,
  authToken,
  customerId,
  fromPhone,
  messageSid,
  mediaIndex,
}: {
  supabase: ReturnType<typeof createClient>;
  mediaUrl: string;
  requestedContentType: string;
  accountSid: string;
  authToken: string;
  customerId: string | null;
  fromPhone: string;
  messageSid: string;
  mediaIndex: number;
}): Promise<{
  url: string;
  contentType: string;
  path: string;
} | null> {
  try {
    const response = await fetch(mediaUrl, {
      method: "GET",
      headers: {
        Authorization:
          `Basic ${btoa(
            `${accountSid}:${authToken}`,
          )}`,
      },
      redirect: "follow",
    });

    if (!response.ok) {
      console.error(
        "Could not download Twilio media:",
        {
          mediaIndex,
          status: response.status,
          statusText: response.statusText,
        },
      );

      return null;
    }

    const responseContentType = String(
      response.headers
        .get("content-type") ?? "",
    )
      .split(";")[0]
      .trim()
      .toLowerCase();

    const contentType =
      responseContentType ||
      requestedContentType
        .split(";")[0]
        .trim()
        .toLowerCase();

    if (!ALLOWED_MEDIA_TYPES.has(contentType)) {
      console.error(
        "Unsupported incoming MMS media type:",
        {
          mediaIndex,
          contentType,
        },
      );

      return null;
    }

    const extension =
      getFileExtension(contentType);

    if (!extension) {
      return null;
    }

    const buffer =
      await response.arrayBuffer();

    if (
      buffer.byteLength <= 0 ||
      buffer.byteLength > MAX_MEDIA_SIZE
    ) {
      console.error(
        "Incoming MMS media size rejected:",
        {
          mediaIndex,
          size: buffer.byteLength,
          maxSize: MAX_MEDIA_SIZE,
        },
      );

      return null;
    }

    const folder = safeFolderName(
      customerId || normalizePhone(fromPhone),
    );

    const safeMessageSid =
      safeFolderName(messageSid);

    const objectPath =
      `${folder}/incoming/` +
      `${safeMessageSid}-${mediaIndex}-` +
      `${crypto.randomUUID()}.${extension}`;

    const {
      error: uploadError,
    } = await supabase.storage
      .from(BUCKET)
      .upload(
        objectPath,
        buffer,
        {
          contentType,
          cacheControl: "3600",
          upsert: false,
        },
      );

    if (uploadError) {
      console.error(
        "Could not upload incoming MMS media:",
        {
          mediaIndex,
          message: uploadError.message,
        },
      );

      return null;
    }

    const {
      data: publicUrlData,
    } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(objectPath);

    const publicUrl =
      publicUrlData?.publicUrl;

    if (!publicUrl) {
      await supabase.storage
        .from(BUCKET)
        .remove([objectPath]);

      console.error(
        "Could not create public MMS URL:",
        {
          mediaIndex,
          objectPath,
        },
      );

      return null;
    }

    return {
      url: publicUrl,
      contentType,
      path: objectPath,
    };
  } catch (error) {
    console.error(
      "Incoming MMS processing failed:",
      {
        mediaIndex,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
    );

    return null;
  }
}

async function sendPushNotification({
  supabaseUrl,
  pushSecret,
  title,
  body,
  customerId,
  fromPhone,
  messageSid,
}: {
  supabaseUrl: string;
  pushSecret: string;
  title: string;
  body: string;
  customerId: string | null;
  fromPhone: string;
  messageSid: string;
}) {
  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/send-push-notification`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          "x-push-secret": pushSecret,
        },
        body: JSON.stringify({
          title,
          body,
          url: customerId
            ? `/messages?customer=${encodeURIComponent(
                customerId,
              )}`
            : `/messages?phone=${encodeURIComponent(
                fromPhone,
              )}`,
          tag: `sms-${messageSid}`,
          customer_id: customerId,
          from_phone: fromPhone,
        }),
      },
    );

    const result = await response.json();

    if (!response.ok || !result?.success) {
      console.error(
        "Push notification request failed:",
        result,
      );

      return;
    }

    console.log(
      "Push notification sent:",
      {
        sent: result.sent,
        failed: result.failed,
        customerId,
        fromPhone,
      },
    );
  } catch (error) {
    console.error(
      "Push notification call failed:",
      error,
    );
  }
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
    const supabaseUrl =
      getRequiredEnv("SUPABASE_URL");

    const serviceRoleKey =
      getRequiredEnv(
        "SUPABASE_SERVICE_ROLE_KEY",
      );

    const pushSecret =
      getRequiredEnv(
        "PUSH_NOTIFICATION_SECRET",
      );

    const twilioAuthToken =
      getRequiredEnv(
        "TWILIO_AUTH_TOKEN",
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

    const formData =
      await req.formData();

    const messageSid = String(
      formData.get("MessageSid") ?? "",
    ).trim();

    const accountSid = String(
      formData.get("AccountSid") ?? "",
    ).trim();

    const fromPhone = String(
      formData.get("From") ?? "",
    ).trim();

    const toPhone = String(
      formData.get("To") ?? "",
    ).trim();

    const body = String(
      formData.get("Body") ?? "",
    ).trim();

    const parsedNumMedia = Number(
      formData.get("NumMedia") ?? 0,
    );

    const numMedia =
      Number.isFinite(parsedNumMedia) &&
      parsedNumMedia > 0
        ? Math.min(
            Math.floor(parsedNumMedia),
            10,
          )
        : 0;

    if (!messageSid) {
      throw new Error(
        "Twilio MessageSid is missing.",
      );
    }

    if (!accountSid) {
      throw new Error(
        "Twilio AccountSid is missing.",
      );
    }

    if (!fromPhone) {
      throw new Error(
        "Sender phone number is missing.",
      );
    }

    if (!toPhone) {
      throw new Error(
        "Recipient phone number is missing.",
      );
    }

    const normalizedFrom =
      normalizePhone(fromPhone);

    let customerId:
      | string
      | null = null;

    let customerName:
      | string
      | null = null;

    const {
      data: customers,
      error: customerSearchError,
    } = await supabase
      .from("customers")
      .select(
        "id, first_name, last_name, phone",
      )
      .not("phone", "is", null);

    if (customerSearchError) {
      throw new Error(
        `Could not search customers: ${customerSearchError.message}`,
      );
    }

    const matchedCustomer =
      customers?.find((customer) => {
        return (
          normalizePhone(
            String(
              customer.phone ?? "",
            ),
          ) === normalizedFrom
        );
      });

    if (matchedCustomer) {
      customerId =
        matchedCustomer.id;

      customerName = [
        matchedCustomer.first_name,
        matchedCustomer.last_name,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
    }

    const mediaPromises: Array<
      Promise<{
        url: string;
        contentType: string;
        path: string;
      } | null>
    > = [];

    for (
      let index = 0;
      index < numMedia;
      index += 1
    ) {
      const mediaUrl = String(
        formData.get(
          `MediaUrl${index}`,
        ) ?? "",
      ).trim();

      const mediaContentType = String(
        formData.get(
          `MediaContentType${index}`,
        ) ?? "",
      ).trim();

      if (!mediaUrl) {
        continue;
      }

      mediaPromises.push(
        downloadAndStoreTwilioMedia({
          supabase,
          mediaUrl,
          requestedContentType:
            mediaContentType,
          accountSid,
          authToken:
            twilioAuthToken,
          customerId,
          fromPhone,
          messageSid,
          mediaIndex: index,
        }),
      );
    }

    const processedMedia =
      await Promise.all(
        mediaPromises,
      );

    const mediaUrls =
      processedMedia
        .filter(
          (
            item,
          ): item is {
            url: string;
            contentType: string;
            path: string;
          } => Boolean(item),
        )
        .map((item) => ({
          url: item.url,
          contentType:
            item.contentType,
        }));

    const {
      error: insertError,
    } = await supabase
      .from("sms_messages")
      .upsert(
        {
          customer_id: customerId,
          direction: "inbound",
          from_phone: fromPhone,
          to_phone: toPhone,
          body,
          twilio_message_sid:
            messageSid,
          twilio_account_sid:
            accountSid,
          status: "received",
          media_count:
            mediaUrls.length,
          media_urls: mediaUrls,
          is_read: false,
        },
        {
          onConflict:
            "twilio_message_sid",
          ignoreDuplicates: true,
        },
      );

    if (insertError) {
      throw new Error(
        `Could not save incoming message: ${insertError.message}`,
      );
    }

    console.log(
      "Incoming message saved",
      {
        messageSid,
        fromPhone,
        toPhone,
        customerId,
        reportedMediaCount:
          numMedia,
        storedMediaCount:
          mediaUrls.length,
      },
    );

    const notificationTitle =
      customerName ||
      `New lead • ${formatPhone(
        fromPhone,
      )}`;

    const notificationBody =
      createMessagePreview(
        body,
        mediaUrls.length,
      );

    await sendPushNotification({
      supabaseUrl,
      pushSecret,
      title:
        notificationTitle,
      body: notificationBody,
      customerId,
      fromPhone,
      messageSid,
    });

    const twiml =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<Response></Response>`;

    return new Response(twiml, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type":
          "text/xml; charset=utf-8",
      },
    });
  } catch (error) {
    console.error(
      "Incoming message webhook failed:",
      error,
    );

    const twiml =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<Response></Response>`;

    return new Response(twiml, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type":
          "text/xml; charset=utf-8",
        "X-Webhook-Error":
          error instanceof Error
            ? error.message
            : "Unknown incoming message error",
      },
    });
  }
});
