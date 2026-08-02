import { createClient } from "npm:@supabase/supabase-js@2.108.2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-push-secret",
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
  const expectedSecret =
    Deno.env.get("PUSH_NOTIFICATION_SECRET") ?? "";

  const suppliedSecret =
    req.headers.get("x-push-secret") ?? "";

  return (
    expectedSecret.length > 0 &&
    suppliedSecret === expectedSecret
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        error: "Method not allowed",
      },
      405,
    );
  }

  try {
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

    const vapidPrivateKey =
      getRequiredEnv("VAPID_PRIVATE_KEY");

    const vapidSubject =
      getRequiredEnv("VAPID_SUBJECT");

    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey,
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

    const requestBody = await req.json();

    const title = String(
      requestBody?.title ??
        "Backyard Relief",
    ).trim();

    const messageBody = String(
      requestBody?.body ??
        "You have a new notification.",
    ).trim();

    const url = String(
      requestBody?.url ??
        "/messages",
    ).trim();

    const tag = String(
      requestBody?.tag ??
        `backyard-relief-${Date.now()}`,
    ).trim();

    const customerId = requestBody?.customer_id
      ? String(requestBody.customer_id)
      : null;

    const fromPhone = requestBody?.from_phone
      ? String(requestBody.from_phone)
      : null;

    const payload = JSON.stringify({
      title,
      body: messageBody,
      url,
      tag,
      icon: "/pwa/icon-192.png",
      badge: "/pwa/icon-192.png",
      data: {
        customer_id: customerId,
        from_phone: fromPhone,
      },
    });

    const {
      data: subscriptions,
      error: subscriptionError,
    } = await supabase
      .from("push_subscriptions")
      .select(
        `
          id,
          endpoint,
          p256dh,
          auth,
          device_name
        `,
      )
      .eq("is_active", true);

    if (subscriptionError) {
      throw new Error(
        `Could not load push subscriptions: ${subscriptionError.message}`,
      );
    }

    if (!subscriptions?.length) {
      return jsonResponse({
        success: true,
        sent: 0,
        failed: 0,
        message:
          "No active push subscriptions were found.",
      });
    }

    let sent = 0;
    let failed = 0;

    const results = await Promise.allSettled(
      subscriptions.map(
        async (subscription) => {
          try {
            await webpush.sendNotification(
              {
                endpoint:
                  subscription.endpoint,
                keys: {
                  p256dh:
                    subscription.p256dh,
                  auth:
                    subscription.auth,
                },
              },
              payload,
              {
                TTL: 60 * 60,
                urgency: "high",
              },
            );

            sent += 1;

            await supabase
              .from("push_subscriptions")
              .update({
                last_used_at:
                  new Date().toISOString(),
                updated_at:
                  new Date().toISOString(),
              })
              .eq("id", subscription.id);

            return {
              id: subscription.id,
              success: true,
            };
          } catch (error) {
            failed += 1;

            const statusCode =
              typeof error === "object" &&
              error !== null &&
              "statusCode" in error
                ? Number(
                    (
                      error as {
                        statusCode?: number;
                      }
                    ).statusCode,
                  )
                : null;

            console.error(
              "Push delivery failed:",
              {
                subscriptionId:
                  subscription.id,
                deviceName:
                  subscription.device_name,
                statusCode,
                error,
              },
            );

            // 404 and 410 mean the browser push
            // subscription is no longer valid.
            if (
              statusCode === 404 ||
              statusCode === 410
            ) {
              await supabase
                .from("push_subscriptions")
                .update({
                  is_active: false,
                  updated_at:
                    new Date().toISOString(),
                })
                .eq("id", subscription.id);
            }

            throw error;
          }
        },
      ),
    );

    console.log(
      "Push notification delivery complete:",
      {
        total: subscriptions.length,
        sent,
        failed,
      },
    );

    return jsonResponse({
      success: true,
      total: subscriptions.length,
      sent,
      failed,
      results: results.map((result) =>
        result.status === "fulfilled"
          ? result.value
          : {
              success: false,
            }
      ),
    });
  } catch (error) {
    console.error(
      "Push notification function failed:",
      error,
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown push notification error",
      },
      500,
    );
  }
});