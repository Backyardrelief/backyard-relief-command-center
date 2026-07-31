const ZOHO_ACCOUNTS_URL = "https://accounts.zoho.com";
const ZOHO_MAIL_API_URL = "https://mail.zoho.com/api";

const FROM_EMAIL = "info@backyardrelief.com";
const WEBSITE_URL = "https://www.backyardrelief.com";
const EMAIL_ASSET_BASE = "https://signup.backyardrelief.com/email";

const LOGO_URL = `${EMAIL_ASSET_BASE}/backyard-relief-logo.png`;
const ROCKY_WELCOME_URL = `${EMAIL_ASSET_BASE}/rocky-welcome.png`;
const ROCKY_FULL_BODY_URL = `${EMAIL_ASSET_BASE}/rocky-full-body.png`;

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
  serviceFrequency?: string;
  serviceDay?: string;
  secondServiceDay?: string;
  monthlyAmount?: string | number;
  dogs?: string | number;
  addOns?: string[];
  smsConsent?: boolean | string;
  foundingMember?: boolean;
};

function requiredSecret(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required secret: ${name}`);
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

function titleCase(value: string): string {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function normalizeBoolean(value: boolean | string | undefined): boolean {
  return value === true || value === "true";
}

function formatMoney(value: string | number | undefined): string {
  if (value === undefined || value === null || String(value).trim() === "") {
    return "Confirmed";
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return `$${escapeHtml(value)}/month`;
  }

  return (
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: Number.isInteger(numericValue) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(numericValue) + "/month"
  );
}

function formatServiceDays(
  serviceDay?: string,
  secondServiceDay?: string,
): string {
  const first = serviceDay?.trim() ? titleCase(serviceDay.trim()) : "";
  const second = secondServiceDay?.trim()
    ? titleCase(secondServiceDay.trim())
    : "";

  if (first && second) return `${first} & ${second}`;
  return first || "To be confirmed";
}

function formatDogCount(dogs?: string | number): string {
  if (dogs === undefined || dogs === null || String(dogs).trim() === "") {
    return "Included";
  }

  const count = Number(dogs);

  if (!Number.isNaN(count)) {
    return `${count} ${count === 1 ? "Dog" : "Dogs"}`;
  }

  return escapeHtml(dogs);
}

function renderAddOns(addOns: string[]): string {
  if (!addOns.length) {
    return `
      <span class="addon-pill" style="display:inline-block;margin:4px 4px 0 0;padding:8px 12px;border-radius:999px;background:#edf7ef;border:1px solid #cce4d2;color:#315f3e;font-size:13px;line-height:18px;font-weight:700;">
        Membership essentials included
      </span>
    `;
  }

  return addOns
    .map(
      (item) => `
        <span class="addon-pill" style="display:inline-block;margin:4px 4px 0 0;padding:8px 12px;border-radius:999px;background:#edf7ef;border:1px solid #cce4d2;color:#315f3e;font-size:13px;line-height:18px;font-weight:700;">
          ✓ ${escapeHtml(titleCase(item))}
        </span>
      `,
    )
    .join("");
}

function benefitCell(icon: string, title: string): string {
  return `
    <td class="benefit-cell" width="33.33%" align="center" valign="top" style="padding:15px 8px;">
      <div style="font-size:27px;line-height:32px;margin-bottom:8px;">${icon}</div>
      <div style="color:#173e27;font-size:12px;line-height:17px;font-weight:800;">${title}</div>
    </td>
  `;
}

function timelineCell(
  number: number,
  icon: string,
  title: string,
  description: string,
): string {
  return `
    <td class="timeline-cell" width="25%" align="center" valign="top" style="padding:13px 6px;">
      <div style="width:48px;height:48px;line-height:48px;margin:0 auto 8px;border-radius:50%;background:#e8f4eb;border:1px solid #c8e1cf;font-size:22px;text-align:center;">${icon}</div>
      <div style="width:22px;height:22px;line-height:22px;margin:0 auto 7px;border-radius:50%;background:#27683a;color:#ffffff;font-size:11px;font-weight:800;text-align:center;">${number}</div>
      <div style="color:#173e27;font-size:12px;line-height:16px;font-weight:800;">${title}</div>
      <div style="margin-top:5px;color:#64748b;font-size:10px;line-height:15px;">${description}</div>
    </td>
  `;
}

async function getZohoAccessToken(): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: requiredSecret("ZOHO_CLIENT_ID"),
    client_secret: requiredSecret("ZOHO_CLIENT_SECRET"),
    refresh_token: requiredSecret("ZOHO_REFRESH_TOKEN"),
  });

  const response = await fetch(`${ZOHO_ACCOUNTS_URL}/oauth/v2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    console.error("Zoho token error:", data);
    throw new Error(
      `Unable to obtain Zoho access token: ${data.error ?? response.statusText}`,
    );
  }

  return data.access_token;
}

async function getZohoAccountId(accessToken: string): Promise<string> {
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

  const account = data.data.find((item: Record<string, unknown>) => {
    const addresses = [
      item.primaryEmailAddress,
      item.mailboxAddress,
      item.emailAddress,
    ].map((value) => String(value ?? "").toLowerCase());

    return addresses.includes(FROM_EMAIL);
  });

  if (!account?.accountId) {
    console.error("Available Zoho accounts:", data.data);
    throw new Error(`No Zoho Mail account was found for ${FROM_EMAIL}.`);
  }

  return String(account.accountId);
}

function buildWelcomeEmail(input: WelcomeEmailRequest): string {
  const firstName = escapeHtml(input.firstName?.trim() || "there");
  const planName = escapeHtml(
    input.planName?.trim() || "Relief Club Membership",
  );
  const serviceFrequency = escapeHtml(
    input.serviceFrequency?.trim()
      ? titleCase(input.serviceFrequency.trim())
      : "Recurring Service",
  );
  const serviceDays = escapeHtml(
    formatServiceDays(input.serviceDay, input.secondServiceDay),
  );
  const monthlyAmount = formatMoney(input.monthlyAmount);
  const dogCount = formatDogCount(input.dogs);
  const smsConsentEnabled = normalizeBoolean(input.smsConsent);
  const showFoundingMember = input.foundingMember !== false;

  const addOns = Array.isArray(input.addOns)
    ? input.addOns
        .filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        )
        .map((item) => item.trim())
    : [];

  const notificationIcon = smsConsentEnabled ? "📱" : "📅";

  const notificationTitle = smsConsentEnabled
    ? "Text Arrival Notification"
    : "No SMS Notifications";

  const notificationDescription = smsConsentEnabled
    ? "We’ll text when we’re on the way."
    : "Your service will proceed on your scheduled day without text messages.";

  const gateConfirmationText = smsConsentEnabled
    ? "After each visit, you’ll receive a completion text and closed-gate confirmation."
    : "After each visit, we’ll complete our closed-gate security check. No text message will be sent.";

  const communicationBenefitIcon = smsConsentEnabled ? "📱" : "✉️";
  const communicationBenefitTitle = smsConsentEnabled
    ? "Text Service Notifications"
    : "Email Account Support";

  const foundingMemberHtml = showFoundingMember
    ? `
      <div style="margin-top:16px;padding:13px 15px;border-radius:12px;background:#fff8e8;border:1px solid #ead39a;color:#6f581f;font-size:13px;line-height:20px;">
        <strong style="color:#9a6c15;">🏅 A Thank YOU for being a Founding Member!:</strong>
        You joined Backyard Relief at the beginning, and we’re sincerely grateful! To celebrate this moment we have locked in your price for the duration of your membership!
      </div>
    `
    : "";

  return `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <title>Welcome to The Relief Club</title>

  <style>
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background: #eef3ef !important;
      font-family: Arial, Helvetica, sans-serif !important;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }

    table {
      border-collapse: separate;
      border-spacing: 0;
    }

    img {
      border: 0;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
    }

    a {
      color: inherit;
    }

    @media only screen and (max-width: 620px) {
      .outer-pad {
        padding: 0 !important;
      }

      .email-shell {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 0 !important;
        box-shadow: none !important;
      }

      .mobile-pad {
        padding-left: 18px !important;
        padding-right: 18px !important;
      }

      .hero-copy,
      .hero-image {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        text-align: center !important;
      }

      .hero-copy {
        padding: 24px 20px 4px !important;
      }

      .hero-logo {
        width: 165px !important;
        margin: 0 auto 18px !important;
      }

      .hero-title {
        font-size: 34px !important;
        line-height: 38px !important;
      }

      .hero-image {
        padding: 0 0 0 !important;
      }

      .hero-rocky {
        width: 215px !important;
        margin: 0 auto !important;
      }

      .membership-stat {
        display: inline-block !important;
        width: 50% !important;
        box-sizing: border-box !important;
        border-right: 0 !important;
        border-bottom: 1px solid rgba(255,255,255,.15) !important;
      }

      .timeline-cell {
        display: inline-block !important;
        width: 50% !important;
        box-sizing: border-box !important;
      }

      .benefit-cell {
        display: inline-block !important;
        width: 50% !important;
        box-sizing: border-box !important;
      }

      .founder-image,
      .founder-copy {
        display: block !important;
        width: 100% !important;
        text-align: center !important;
      }

      .founder-image {
        padding: 22px 20px 4px !important;
      }

      .founder-copy {
        padding: 8px 24px 24px !important;
        text-align: left !important;
      }

      .founder-rocky {
        width: 145px !important;
      }

      .founder-title {
        font-size: 23px !important;
        line-height: 29px !important;
        text-align: center !important;
      }

      .addon-pill {
        font-size: 12px !important;
      }

      .footer-note {
        padding-left: 18px !important;
        padding-right: 18px !important;
      }
    }

    @media only screen and (max-width: 390px) {
      .hero-title {
        font-size: 31px !important;
        line-height: 36px !important;
      }

      .membership-stat,
      .timeline-cell,
      .benefit-cell {
        width: 100% !important;
      }

      .mobile-pad {
        padding-left: 14px !important;
        padding-right: 14px !important;
      }
    }
  </style>
</head>

<body style="margin:0;padding:0;background:#eef3ef;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;">
    Your Backyard Relief membership is officially active. Welcome to The Relief Club!
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#eef3ef;">
    <tr>
      <td class="outer-pad" align="center" style="padding:24px 10px;">
        <table class="email-shell" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:680px;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 12px 36px rgba(18,61,39,.14);">

          <!-- HERO -->
          <tr>
            <td style="background:linear-gradient(135deg,#103d2b 0%,#17563a 58%,#2c7a44 100%);padding:0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="hero-copy" valign="top" style="padding:28px 10px 30px 30px;">
                    <img class="hero-logo" src="${LOGO_URL}" width="185" alt="Backyard Relief Pet Waste Solutions" style="display:block;width:185px;max-width:100%;height:auto;margin:0 0 22px;">
                    <div style="margin-bottom:8px;color:#d7efdc;font-size:12px;line-height:18px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">You’re officially in</div>
                    <h1 class="hero-title" style="margin:0 0 12px;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:39px;line-height:43px;font-weight:800;">
                      Welcome to<br>The Relief Club! 🎉
                    </h1>
                    <p style="margin:0;color:#e2f2e6;font-size:15px;line-height:23px;font-weight:600;">
                      Relieved Pets • Clean Yards<br>Happy Humans
                    </p>
                  </td>

                  <td class="hero-image" width="235" align="right" valign="bottom" style="width:235px;padding:16px 8px 0 0;">
                    <img class="hero-rocky" src="${ROCKY_WELCOME_URL}" width="225" alt="Rocky welcomes you to Backyard Relief" style="display:block;width:225px;max-width:100%;height:auto;margin:0 0 0 auto;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- YOU'RE IN -->
          <tr>
            <td class="mobile-pad" style="padding:24px 28px 4px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#edf7ef;border:1px solid #cfe5d4;border-radius:15px;">
                <tr>
                  <td align="center" style="padding:18px;">
                    <div style="color:#1d6a36;font-size:13px;font-weight:900;letter-spacing:1.6px;text-transform:uppercase;">You’re all set</div>
                    <div style="margin-top:6px;color:#173e27;font-family:Georgia,'Times New Roman',serif;font-size:23px;line-height:30px;font-weight:800;">
                      Your relief starts now!
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- WELCOME -->
          <tr>
            <td class="mobile-pad" style="padding:24px 28px 14px;">
              <h2 style="margin:0 0 13px;color:#173e27;font-family:Georgia,'Times New Roman',serif;font-size:27px;line-height:34px;">
                Great choice, ${firstName}!
              </h2>

              <p style="margin:0;color:#475569;font-size:15px;line-height:24px;">
                Everything is set. From here forward, we’ll handle the dirty work so you can spend more time enjoying your yard with the people and pets you love.
              </p>

              ${foundingMemberHtml}
            </td>
          </tr>

          <!-- MEMBERSHIP CARD -->
          <tr>
            <td class="mobile-pad" style="padding:16px 28px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:linear-gradient(145deg,#0f412c,#185d38);border-radius:18px;box-shadow:0 9px 22px rgba(15,65,44,.22);">
                <tr>
                  <td align="center" style="padding:24px 20px 10px;">
                    <div style="color:#e4bc5b;font-size:12px;line-height:18px;font-weight:900;letter-spacing:1.8px;text-transform:uppercase;">Your Relief Club Membership</div>
                    <div style="margin-top:8px;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:31px;line-height:38px;font-weight:800;">${planName} ⭐</div>
                    <div style="margin-top:5px;color:#dceee1;font-size:14px;line-height:20px;">${serviceFrequency}</div>
                    ${
                      showFoundingMember
                        ? `<div style="display:inline-block;margin-top:12px;padding:7px 12px;border-radius:999px;background:#e4bc5b;color:#143d29;font-size:11px;line-height:16px;font-weight:900;letter-spacing:.7px;">🏅 FOUNDING MEMBER</div>`
                        : ""
                    }
                  </td>
                </tr>

                <tr>
                  <td style="padding:10px 15px 18px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid rgba(228,188,91,.45);border-radius:14px;">
                      <tr>
                        <td class="membership-stat" width="25%" align="center" valign="top" style="padding:16px 7px;border-right:1px solid rgba(255,255,255,.15);">
                          <div style="color:#e4bc5b;font-size:20px;">📅</div>
                          <div style="margin:7px 0 5px;color:#e4bc5b;font-size:10px;font-weight:900;text-transform:uppercase;">Service Day</div>
                          <div style="color:#ffffff;font-size:12px;line-height:17px;font-weight:800;">${serviceDays}</div>
                        </td>

                        <td class="membership-stat" width="25%" align="center" valign="top" style="padding:16px 7px;border-right:1px solid rgba(255,255,255,.15);">
                          <div style="color:#e4bc5b;font-size:20px;">💳</div>
                          <div style="margin:7px 0 5px;color:#e4bc5b;font-size:10px;font-weight:900;text-transform:uppercase;">Membership</div>
                          <div style="color:#ffffff;font-size:12px;line-height:17px;font-weight:800;">${monthlyAmount}</div>
                        </td>

                        <td class="membership-stat" width="25%" align="center" valign="top" style="padding:16px 7px;border-right:1px solid rgba(255,255,255,.15);">
                          <div style="color:#e4bc5b;font-size:20px;">🐾</div>
                          <div style="margin:7px 0 5px;color:#e4bc5b;font-size:10px;font-weight:900;text-transform:uppercase;">Pets</div>
                          <div style="color:#ffffff;font-size:12px;line-height:17px;font-weight:800;">${dogCount}</div>
                        </td>

                        <td class="membership-stat" width="25%" align="center" valign="top" style="padding:16px 7px;">
                          <div style="color:#e4bc5b;font-size:20px;">✓</div>
                          <div style="margin:7px 0 5px;color:#e4bc5b;font-size:10px;font-weight:900;text-transform:uppercase;">Status</div>
                          <div style="color:#ffffff;font-size:12px;line-height:17px;font-weight:800;">Active</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 18px 18px;">
                    <div style="margin-bottom:8px;color:#dceee1;font-size:11px;line-height:16px;font-weight:800;letter-spacing:1px;text-transform:uppercase;">Included Add-ons</div>
                    ${renderAddOns(addOns)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- WHAT HAPPENS NEXT -->
          <tr>
            <td class="mobile-pad" style="padding:4px 20px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border:1px solid #dfe9e2;border-radius:17px;">
                <tr>
                  <td align="center" style="padding:22px 15px 5px;">
                    <div style="color:#173e27;font-size:18px;line-height:25px;font-weight:900;letter-spacing:.4px;">WHAT HAPPENS NEXT</div>
                    <div style="width:54px;height:3px;margin:10px auto 0;border-radius:4px;background:#78ad4c;"></div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:5px 8px 2px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        ${timelineCell(1, "✓", "Signup Complete", "Your membership is confirmed.")}
                        ${timelineCell(2, "🛡️", "Membership Activated", "Your account is active.")}
                        ${timelineCell(3, "📍", "Route Scheduled", "We add you to our service route.")}
                        ${timelineCell(4, notificationIcon, notificationTitle, notificationDescription)}
                      </tr>
                      <tr>
                        ${timelineCell(5, "🌿", "Professional Yard Cleaning", "We take care of the dirty work.")}
                        ${timelineCell(6, "📸", "Service Confirmation", "We confirm completion and gate security.")}
                        ${timelineCell(7, "🏡", "Enjoy Your Clean Yard", "Relax and enjoy your free time.")}
                        <td class="timeline-cell" width="25%" style="padding:12px 5px;"></td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:10px 18px 22px;">
                    <div style="padding:13px 15px;border-radius:12px;background:#edf7ef;color:#315f3e;font-size:12px;line-height:18px;text-align:center;">
                      ${gateConfirmationText}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BENEFITS -->
          <tr>
            <td class="mobile-pad" style="padding:0 20px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f8f4;border:1px solid #d7e7da;border-radius:17px;">
                <tr>
                  <td colspan="3" align="center" style="padding:20px 14px 6px;">
                    <div style="color:#173e27;font-size:17px;line-height:23px;font-weight:900;">WHY FAMILIES CHOOSE BACKYARD RELIEF</div>
                  </td>
                </tr>

                <tr>
                  ${benefitCell("🤝", "No Long-Term Contracts")}
                  ${benefitCell(communicationBenefitIcon, communicationBenefitTitle)}
                  ${benefitCell("📸", "Closed-Gate Security Check")}
                </tr>

                <tr>
                  ${benefitCell("⭐", "First-Class Service")}
                  ${benefitCell("🛡️", "Satisfaction Guarantee")}
                  ${benefitCell("🌱", "Cleaner, Healthier Yards")}
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOUNDER -->
          <tr>
            <td class="mobile-pad" style="padding:0 20px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border:1px solid #dfe7e1;border-radius:17px;">
                <tr>
                  <td class="founder-image" width="190" align="center" valign="middle" style="padding:24px 8px 24px 20px;">
                    <img class="founder-rocky" src="${ROCKY_FULL_BODY_URL}" width="155" alt="Rocky, Backyard Relief mascot" style="display:block;width:155px;max-width:100%;height:auto;margin:0 auto;">
                  </td>

                  <td class="founder-copy" valign="top" style="padding:25px 24px 24px 10px;">
                    <div class="founder-title" style="margin-bottom:14px;color:#173e27;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:28px;font-style:italic;font-weight:700;">
                      A Personal Note From Our Founder
                    </div>

                    <p style="margin:0 0 10px;color:#475569;font-size:14px;line-height:22px;">Hi ${firstName},</p>

                    <p style="margin:0 0 10px;color:#475569;font-size:14px;line-height:22px;">
                      Thank you for choosing Backyard Relief!
                    </p>

                    <p style="margin:0 0 10px;color:#475569;font-size:14px;line-height:22px;">
                      Backyard Relief was built with one simple goal: to make life a little easier for our neighbors. We all have our own reasons for wanting a little more relief in our lives, and I'm truly grateful you've trusted us to care for your yard.
                    </p>

                    <p style="margin:0;color:#173e27;font-size:14px;line-height:22px;">
                      We'll work hard to make sure every visit leaves your yard cleaner, your pets happier, and your day just a little brighter!
                      <br><br><strong>— Dean Baer</strong><br>Founder, Backyard Relief
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- HELP -->
          <tr>
            <td class="mobile-pad" style="padding:0 20px 25px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fffaf0;border:1px solid #ead49e;border-radius:17px;">
                <tr>
                  <td align="center" style="padding:23px 20px;">
                    <div style="margin-bottom:8px;color:#173e27;font-size:18px;line-height:24px;font-weight:900;">Need anything? 🐾</div>

                    <p style="margin:0 0 15px;color:#64748b;font-size:13px;line-height:20px;">
                      Simply reply to this email. We’re always happy to help.
                    </p>

                    <a href="mailto:${FROM_EMAIL}" style="display:inline-block;padding:13px 23px;border-radius:10px;background:#145133;color:#ffffff;font-size:13px;line-height:18px;font-weight:900;text-decoration:none;">
                      REPLY TO THIS EMAIL
                    </a>

                    <div style="margin-top:16px;color:#475569;font-size:12px;line-height:19px;">
                      ${FROM_EMAIL}<br>
                      <a href="${WEBSITE_URL}" style="color:#23733b;font-weight:800;text-decoration:none;">backyardrelief.com</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" style="background:#103d2b;padding:25px 20px;">
              <img src="${LOGO_URL}" width="155" alt="Backyard Relief" style="display:block;width:155px;max-width:100%;height:auto;margin:0 auto 14px;">

              <div style="margin-bottom:7px;color:#d9eddf;font-size:12px;line-height:18px;font-weight:700;">
                We’re excited to serve you.
              </div>
              <div style="color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:22px;">
                Relieved Pets • Clean Yards • Happy Humans
              </div>

              <div style="margin-top:10px;color:#bcd7c5;font-size:11px;line-height:17px;">
                Backyard Relief – Pet Waste Solutions<br>
                Locally owned and operated in Littleton, Colorado
              </div>
            </td>
          </tr>
        </table>

        <div class="footer-note" style="max-width:620px;margin:15px auto 0;padding:0 10px;color:#7b8b82;font-size:10px;line-height:15px;text-align:center;">
          You received this email because a Backyard Relief membership was created using this email address.
        </div>
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

  if (!response.ok || Number(data?.status?.code ?? 200) >= 400) {
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
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
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
    const input = (await request.json()) as WelcomeEmailRequest;
    const accessToken = await getZohoAccessToken();
    const accountId = await getZohoAccountId(accessToken);

    await sendZohoEmail(accessToken, accountId, input);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Premium welcome email sent successfully.",
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
        error:
          error instanceof Error
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
