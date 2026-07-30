const ZOHO_ACCOUNTS_URL = "https://accounts.zoho.com";
const ZOHO_MAIL_API_URL = "https://mail.zoho.com/api";
const FROM_EMAIL = "info@backyardrelief.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type WelcomeEmailRequest = {
  to?: string;
  firstName?: string;
  planName?: string;
  serviceDay?: string;
  monthlyAmount?: string | number;
  addOns?: string[];
};

function requiredSecret(name: string): string {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`Missing required secret: ${name}`);
  }

  return value;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function getZohoAccessToken(): Promise<string> {
  const clientId = requiredSecret("ZOHO_CLIENT_ID");
  const clientSecret = requiredSecret("ZOHO_CLIENT_SECRET");
  const refreshToken = requiredSecret("ZOHO_REFRESH_TOKEN");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const response = await fetch(
    `${ZOHO_ACCOUNTS_URL}/oauth/v2/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    console.error("Zoho token error:", data);
    throw new Error(
      `Unable to obtain Zoho access token: ${
        data.error ?? response.statusText
      }`,
    );
  }

  return data.access_token;
}

async function getZohoAccountId(
  accessToken: string,
): Promise<string> {
  const response = await fetch(`${ZOHO_MAIL_API_URL}/accounts`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Zoho-oauthtoken ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok || !Array.isArray(data.data)) {
    console.error("Zoho accounts error:", data);
    throw new Error("Unable to retrieve Zoho Mail accounts.");
  }

  const account = data.data.find(
    (item: Record<string, unknown>) => {
      const primaryEmail = String(
        item.primaryEmailAddress ?? "",
      ).toLowerCase();

      const mailboxAddress = String(
        item.mailboxAddress ?? "",
      ).toLowerCase();

      return (
        primaryEmail === FROM_EMAIL ||
        mailboxAddress === FROM_EMAIL
      );
    },
  );

  if (!account?.accountId) {
    console.error("Available Zoho accounts:", data.data);
    throw new Error(
      `No Zoho Mail account was found for ${FROM_EMAIL}.`,
    );
  }

  return String(account.accountId);
}

function buildWelcomeEmail(input: WelcomeEmailRequest): string {
  const firstName = escapeHtml(input.firstName || "there");
  const planName = escapeHtml(input.planName || "Relief Club Membership");
  const serviceDay = escapeHtml(input.serviceDay || "To be confirmed");

  const amount =
    input.monthlyAmount !== undefined &&
      input.monthlyAmount !== null &&
      String(input.monthlyAmount).trim() !== ""
      ? `$${escapeHtml(input.monthlyAmount)}/month`
      : "Confirmed";

  const addOns = Array.isArray(input.addOns)
    ? input.addOns.filter(Boolean)
    : [];

  const addOnsHtml = addOns.length
    ? `
      <tr>
        <td style="padding:0 0 14px;color:#64748b;font-size:14px;">
          Add-ons
        </td>
        <td style="padding:0 0 14px;text-align:right;color:#163c2b;font-size:14px;font-weight:700;">
          ${addOns.map(escapeHtml).join("<br>")}
        </td>
      </tr>
    `
    : "";

  return `
<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f7f5;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f7f5;">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(22,60,43,0.12);">
            <tr>
              <td align="center" style="background:#163c2b;padding:34px 24px;">
                <div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#cde8d7;font-weight:700;">
                  Backyard Relief
                </div>

                <h1 style="margin:12px 0 8px;color:#ffffff;font-size:30px;line-height:1.2;">
                  Welcome to The Relief Club!
                </h1>

                <p style="margin:0;color:#dcefe3;font-size:16px;line-height:1.6;">
                  Relieved Pets • Clean Yards • Happy Humans
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:34px 28px 18px;">
                <p style="margin:0 0 18px;font-size:18px;line-height:1.6;">
                  Hi ${firstName},
                </p>

                <p style="margin:0 0 22px;font-size:16px;line-height:1.7;color:#475569;">
                  Your Backyard Relief membership is officially active.
                  We’re excited to take the dirty work off your hands so
                  you can spend more time enjoying your yard.
                </p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f8f5;border:1px solid #dcebe1;border-radius:14px;padding:20px;">
                  <tr>
                    <td style="padding:0 0 14px;color:#64748b;font-size:14px;">
                      Membership
                    </td>
                    <td style="padding:0 0 14px;text-align:right;color:#163c2b;font-size:14px;font-weight:700;">
                      ${planName}
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 0 14px;color:#64748b;font-size:14px;">
                      Service day
                    </td>
                    <td style="padding:0 0 14px;text-align:right;color:#163c2b;font-size:14px;font-weight:700;">
                      ${serviceDay}
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 0 14px;color:#64748b;font-size:14px;">
                      Monthly membership
                    </td>
                    <td style="padding:0 0 14px;text-align:right;color:#163c2b;font-size:14px;font-weight:700;">
                      ${amount}
                    </td>
                  </tr>

                  ${addOnsHtml}
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:8px 28px 28px;">
                <h2 style="margin:0 0 14px;color:#163c2b;font-size:21px;">
                  What happens next
                </h2>

                <p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#475569;">
                  ✓ We’ll prepare your account and service route.
                </p>

                <p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#475569;">
                  ✓ We’ll communicate important scheduling and service updates.
                </p>

                <p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#475569;">
                  ✓ After each visit, we’ll confirm your yard was serviced and your gate was secured.
                </p>
              </td>
            </tr>

            <tr>
              <td align="center" style="background:#eef5f0;padding:24px;">
                <p style="margin:0 0 8px;color:#163c2b;font-size:15px;font-weight:700;">
                  Backyard Relief – Pet Waste Solutions
                </p>

                <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">
                  Questions? Reply directly to this email.<br>
                  info@backyardrelief.com
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}

async function sendZohoEmail(
  accessToken: string,
  accountId: string,
  input: WelcomeEmailRequest,
): Promise<void> {
  const recipient = input.to?.trim();

  if (!recipient) {
    throw new Error("A recipient email address is required.");
  }

  const response = await fetch(
    `${ZOHO_MAIL_API_URL}/accounts/${accountId}/messages`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
      body: JSON.stringify({
        fromAddress: FROM_EMAIL,
        toAddress: recipient,
        subject: "Welcome to The Relief Club! 🎉",
        content: buildWelcomeEmail(input),
        mailFormat: "html",
      }),
    },
  );

  const data = await response.json();

  if (!response.ok || data?.status?.code >= 400) {
    console.error("Zoho send-email error:", data);
    throw new Error(
      data?.status?.description ||
        data?.data?.errorCode ||
        "Zoho could not send the email.",
    );
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Method not allowed.",
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }

  try {
    const input = await request.json() as WelcomeEmailRequest;

    const accessToken = await getZohoAccessToken();
    const accountId = await getZohoAccountId(accessToken);

    await sendZohoEmail(accessToken, accountId, input);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Welcome email sent successfully.",
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("send-welcome-email failure:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error
          ? error.message
          : "Unexpected email error.",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});