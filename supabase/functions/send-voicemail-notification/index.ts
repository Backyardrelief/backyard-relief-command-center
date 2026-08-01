const TWILIO_API_BASE = "https://api.twilio.com/2010-04-01";

type VoicemailPayload = {
  secret?: string;
  caller?: string;
  recordingUrl?: string;
  duration?: string | number;
  callSid?: string;
  recordingSid?: string;
};

function requiredSecret(name: string): string {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`Missing required secret: ${name}`);
  }

  return value;
}

function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return phone || "Unknown caller";
}

function formatDuration(value: string | number | undefined): string {
  const totalSeconds = Number(value ?? 0);

  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "Unknown";
  }

  if (totalSeconds < 60) {
    return `${Math.round(totalSeconds)} seconds`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);

  return seconds > 0
    ? `${minutes} min ${seconds} sec`
    : `${minutes} min`;
}

async function sendTwilioSms(params: {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
  body: string;
}): Promise<string> {
  const requestBody = new URLSearchParams({
    From: params.from,
    To: params.to,
    Body: params.body,
  });

  const basicAuth = btoa(
    `${params.accountSid}:${params.authToken}`,
  );

  const response = await fetch(
    `${TWILIO_API_BASE}/Accounts/${params.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: requestBody,
    },
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Twilio SMS error:", data);

    throw new Error(
      data?.message || "Twilio could not send the voicemail notification.",
    );
  }

  return String(data.sid ?? "");
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return Response.json(
      {
        success: false,
        error: "Method not allowed.",
      },
      { status: 405 },
    );
  }

  try {
    const payload = (await request.json()) as VoicemailPayload;

    const expectedSecret = requiredSecret(
      "VOICEMAIL_WEBHOOK_SECRET",
    );

    if (!payload.secret || payload.secret !== expectedSecret) {
      return Response.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 },
      );
    }

    const accountSid = requiredSecret("TWILIO_ACCOUNT_SID");
    const authToken = requiredSecret("TWILIO_AUTH_TOKEN");
    const twilioNumber = requiredSecret("TWILIO_PHONE_NUMBER");
    const ownerPhone = requiredSecret("OWNER_PHONE_NUMBER");

    const caller = String(payload.caller ?? "").trim();
    const recordingUrl = String(
      payload.recordingUrl ?? "",
    ).trim();

    if (!caller) {
      throw new Error("Caller phone number is missing.");
    }

    if (!recordingUrl) {
      throw new Error("Recording URL is missing.");
    }

    const formattedCaller = formatPhoneNumber(caller);
    const formattedDuration = formatDuration(payload.duration);

    const message = [
      "🐾 Backyard Relief Voicemail",
      `New voicemail from ${formattedCaller}`,
      `Duration: ${formattedDuration}`,
      `Listen: ${recordingUrl}`,
    ].join("\n");

    const messageSid = await sendTwilioSms({
      accountSid,
      authToken,
      from: twilioNumber,
      to: ownerPhone,
      body: message,
    });

    console.log("Voicemail notification sent:", {
      caller,
      callSid: payload.callSid,
      recordingSid: payload.recordingSid,
      messageSid,
    });

    return Response.json({
      success: true,
      messageSid,
    });
  } catch (error) {
    console.error("Voicemail notification failure:", error);

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected voicemail notification error.",
      },
      { status: 500 },
    );
  }
});