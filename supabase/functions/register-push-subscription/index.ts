import { createClient } from "npm:@supabase/supabase-js@2.108.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-crm-access-code",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
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

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return Response.json(body, {
    status,
    headers: corsHeaders,
  });
}

function isAuthorized(req: Request): boolean {
  const expectedCode =
    Deno.env.get("CRM_ACCESS_CODE") ?? "";

  const suppliedCode =
    req.headers.get("x-crm-access-code") ?? "";

  return (
    expectedCode.length > 0 &&
    suppliedCode === expectedCode
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    /*
      The public VAPID key is safe to expose, but we still
      require the CRM code so this endpoint is not needlessly
      public.
    */
    if (!isAuthorized(req)) {
      return jsonResponse(
        {
          success: false,
          error: "Unauthorized",
        },
        401,
      );
    }

    const supabaseUrl =
      getRequiredEnv("SUPABASE_URL");

    const serviceRoleKey =
      getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

    const vapidPublicKey =
      getRequiredEnv("VAPID_PUBLIC_KEY");

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
      GET returns only the public VAPID key.
    */
    if (req.method === "GET") {
      return jsonResponse({
        success: true,
        vapid_public_key: vapidPublicKey,
      });
    }

    /*
      POST creates or refreshes a device subscription.
    */
    if (req.method === "POST") {
      const body = await req.json();

      const subscription =
        body?.subscription ?? null;

      const endpoint = String(
        subscription?.endpoint ?? "",
      ).trim();

      const p256dh = String(
        subscription?.keys?.p256dh ?? "",
      ).trim();

      const auth = String(
        subscription?.keys?.auth ?? "",
      ).trim();

      const deviceName = String(
        body?.device_name ?? "Backyard Relief device",
      ).trim();

      const userAgent = String(
        body?.user_agent ??
          req.headers.get("user-agent") ??
          "",
      ).trim();

      if (!endpoint) {
        return jsonResponse(
          {
            success: false,
            error:
              "Push subscription endpoint is missing.",
          },
          400,
        );
      }

      if (!p256dh || !auth) {
        return jsonResponse(
          {
            success: false,
            error:
              "Push subscription encryption keys are missing.",
          },
          400,
        );
      }

      const now = new Date().toISOString();

      const {
        data,
        error,
      } = await supabase
        .from("push_subscriptions")
        .upsert(
          {
            endpoint,
            p256dh,
            auth,
            device_name: deviceName,
            user_agent: userAgent || null,
            is_active: true,
            updated_at: now,
            last_used_at: now,
          },
          {
            onConflict: "endpoint",
          },
        )
        .select(
          `
            id,
            device_name,
            is_active,
            created_at,
            updated_at
          `,
        )
        .single();

      if (error) {
        throw new Error(
          `Could not save push subscription: ${error.message}`,
        );
      }

      console.log(
        "Push subscription registered:",
        {
          id: data.id,
          deviceName: data.device_name,
        },
      );

      return jsonResponse({
        success: true,
        subscription: data,
      });
    }

    /*
      DELETE disables the current device subscription.
    */
    if (req.method === "DELETE") {
      const body = await req.json();

      const endpoint = String(
        body?.endpoint ?? "",
      ).trim();

      if (!endpoint) {
        return jsonResponse(
          {
            success: false,
            error:
              "Push subscription endpoint is missing.",
          },
          400,
        );
      }

      const {
        error,
      } = await supabase
        .from("push_subscriptions")
        .update({
          is_active: false,
          updated_at:
            new Date().toISOString(),
        })
        .eq("endpoint", endpoint);

      if (error) {
        throw new Error(
          `Could not disable push subscription: ${error.message}`,
        );
      }

      return jsonResponse({
        success: true,
      });
    }

    return jsonResponse(
      {
        success: false,
        error: "Method not allowed",
      },
      405,
    );
  } catch (error) {
    console.error(
      "Push subscription function failed:",
      error,
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown push subscription error",
      },
      500,
    );
  }
});