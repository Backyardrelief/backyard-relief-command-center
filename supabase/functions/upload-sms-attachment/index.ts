import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "sms-attachments";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const allowedOrigins = new Set([
  "https://crm.backyardrelief.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

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
    Vary: "Origin",
  };
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string>,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function safeExtension(file: File) {
  switch (file.type) {
    case "image/jpeg":
      return "jpg";

    case "image/png":
      return "png";

    case "image/gif":
      return "gif";

    case "image/webp":
      return "webp";

    default:
      return "";
  }
}

Deno.serve(async (req: Request) => {
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

    const supabaseUrl = Deno.env.get(
      "SUPABASE_URL",
    );

    const serviceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "Supabase server configuration is incomplete.",
      );
    }

    const formData = await req.formData();

    const file = formData.get("file");

    const customerId =
      cleanText(formData.get("customer_id")) ||
      "unknown";

    if (!(file instanceof File)) {
      return jsonResponse(
        {
          success: false,
          error: "No image was provided.",
        },
        400,
        corsHeaders,
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return jsonResponse(
        {
          success: false,
          error:
            "Unsupported image type. Use JPEG, PNG, GIF, or WebP.",
        },
        400,
        corsHeaders,
      );
    }

    if (file.size <= 0) {
      return jsonResponse(
        {
          success: false,
          error: "The selected image is empty.",
        },
        400,
        corsHeaders,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return jsonResponse(
        {
          success: false,
          error:
            "Image is too large. Maximum size is 5 MB.",
        },
        400,
        corsHeaders,
      );
    }

    const extension = safeExtension(file);

    if (!extension) {
      return jsonResponse(
        {
          success: false,
          error: "Unsupported image type.",
        },
        400,
        corsHeaders,
      );
    }

    const safeCustomerId = customerId.replace(
      /[^a-zA-Z0-9_-]/g,
      "",
    );

    const objectPath =
      `${safeCustomerId || "unknown"}/` +
      `${Date.now()}-${crypto.randomUUID()}.${extension}`;

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

    const fileBuffer =
      await file.arrayBuffer();

    const {
      error: uploadError,
    } = await supabase.storage
      .from(BUCKET)
      .upload(
        objectPath,
        fileBuffer,
        {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        },
      );

    if (uploadError) {
      throw new Error(
        `Attachment upload failed: ${uploadError.message}`,
      );
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

      throw new Error(
        "Could not create the attachment URL.",
      );
    }

    console.log(
      "SMS attachment uploaded:",
      {
        objectPath,
        customerId:
          safeCustomerId || null,
        contentType: file.type,
        size: file.size,
      },
    );

    return jsonResponse(
      {
        success: true,
        attachment: {
          url: publicUrl,
          path: objectPath,
          contentType: file.type,
          size: file.size,
          originalName: file.name,
        },
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    console.error(
      "UPLOAD SMS ATTACHMENT ERROR:",
      error,
    );

    return jsonResponse(
      {
        success: false,
        error: "Upload failed.",
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

