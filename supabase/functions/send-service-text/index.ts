import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { customer_id, type } = await req.json();

    if (!customer_id || !type) {
      return new Response(
        JSON.stringify({ error: "Missing customer_id or type" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customer_id)
      .single();

    if (customerError || !customer) {
      return new Response(
        JSON.stringify({ error: "Customer not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    if (!customer.phone) {
      return new Response(
        JSON.stringify({ error: "Customer has no phone number" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const businessName = "Backyard Relief";

    let message = "";

    if (type === "on_the_way") {
      message = `Hi ${customer.first_name}, Backyard Relief is on the way to service your yard today.`;
    }

    if (type === "completed") {
      message = `Hi ${customer.first_name}, Backyard Relief has completed your yard service. Your gate has been checked and secured.`;

      if (customer.last_gate_photo_url) {
        message += ` Gate photo: ${customer.last_gate_photo_url}`;
      }
    }

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Invalid text type" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const fromPhone = Deno.env.get("TWILIO_PHONE_NUMBER")!;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const body = new URLSearchParams({
      To: customer.phone,
      From: fromPhone,
      Body: message,
    });

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + btoa(`${accountSid}:${authToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error("Twilio error:", twilioData);

      return new Response(
        JSON.stringify({
          error: "Text failed to send",
          details: twilioData,
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    const updateFields =
      type === "on_the_way"
        ? {
            last_on_the_way_text_sent_at: new Date().toISOString(),
          }
        : {
            last_completed_text_sent_at: new Date().toISOString(),
          };

    await supabase
      .from("customers")
      .update(updateFields)
      .eq("id", customer_id);

    return new Response(
      JSON.stringify({
        success: true,
        message_sid: twilioData.sid,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error(error);

    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});