import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import heroImage from "../assets/hero.png";
import logoImage from "../assets/backyard-relief-logo.png";
import rockyWelcomeImage from "../assets/rocky-welcome.png";
import rockyFullBodyImage from "../assets/rocky-full-body.png";
import { supabase } from "../lib/supabase";

const BRAND = {
  forest: "#164E2A",
  green: "#2E7D32",
  grass: "#54A83C",
  lightGreen: "#EAF6E8",
  paleGreen: "#F5FBF3",
  navy: "#17324D",
  gold: "#F4B942",
  sky: "#8FD3FF",
  white: "#FFFFFF",
};

const PREVIEW_DATA = {
  customer: {
    first_name: "Dean",
    last_name: "Baer",
    full_name: "Dean Baer",
    email: "dean@example.com",
    phone: "(720) 555-0123",
    address: "1234 Your Street",
    city: "Littleton",
    state: "CO",
    zip: "80123",
  },
  membership: {
    plan_key: "plus",
    plan_name: "Relief Plus",
    monthly_total: 159,
    service_day: "Monday",
    service_days: ["Monday"],
    service_frequency: "Weekly",
    zone: "Zone A",
    priority_scheduling: false,
    selected_add_ons: [
      "yard_deodorizing_monthly",
      "offsite_disposal",
    ],
  },
  sms_consent: true,
};

const CONFETTI = Array.from({ length: 120 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 100}%`,
  delay: `${(index % 10) * 0.1}s`,
  duration: `${3.8 + (index % 8) * 0.14}s`,
  rotate: `${(index * 41) % 360}deg`,
  size: 7 + (index % 8),
  shape: index % 3,
  color:
    index % 6 === 0
      ? BRAND.gold
      : index % 6 === 1
        ? BRAND.grass
        : index % 6 === 2
          ? BRAND.navy
          : index % 6 === 3
            ? BRAND.white
            : index % 6 === 4
              ? BRAND.sky
              : "#8BC34A",
}));

const FLOATING_PAWS = Array.from({ length: 10 }, (_, index) => ({
  id: index,
  left: `${6 + ((index * 17) % 86)}%`,
  top: `${10 + ((index * 19) % 74)}%`,
  size: 18 + (index % 4) * 7,
  delay: `${index * 0.35}s`,
  duration: `${5.5 + (index % 3)}s`,
  rotate: `${-28 + (index % 6) * 12}deg`,
}));

const SPARKLES = [
  { left: "36%", top: "31%", delay: "0s", size: 12 },
  { left: "66%", top: "24%", delay: "0.6s", size: 10 },
  { left: "67%", top: "43%", delay: "1.1s", size: 8 },
  { left: "31%", top: "49%", delay: "1.6s", size: 9 },
];

const ADD_ON_LABELS = {
  offsite_disposal: "Off-Site Disposal",
  off_site_disposal: "Off-Site Disposal",
  yard_deodorizing_monthly:
    "WYSIWASH® Yard Sanitizing & Deodorizing",
  yard_deodorizing_weekly:
    "WYSIWASH® Yard Sanitizing & Deodorizing",
  yard_deodorizing_biweekly:
    "WYSIWASH® Yard Sanitizing & Deodorizing",
  deodorizer: "WYSIWASH® Yard Sanitizing & Deodorizing",
  wysiwash: "WYSIWASH® Yard Sanitizing & Deodorizing",
  additional_dog: "Additional Dog",
  extra_dog: "Additional Dog",
};

const NEXT_STEPS = [
  {
    icon: "✅",
    title: "Membership Activated",
    description:
      "Your payment was received and your Backyard Relief membership is officially active.",
  },
  {
    icon: "🗓️",
    title: "First Service Scheduled",
    description:
      "Your address and service schedule are being added to the correct neighborhood route.",
  },
  {
    icon: "📲",
    title: "We’ll Text Before We Arrive",
    description:
      "You’ll receive a helpful notification before each Relief visit.",
  },
  {
    icon: "📸",
    title: "Closed-Gate Photo Confirmation",
    description:
      "After every completed visit, we’ll securely close your gate and send a confirmation photo for added peace of mind.",
  },
  {
    icon: "🌿",
    title: "Enjoy Your Clean Yard",
    description:
      "We’ll handle the dirty work so you can spend more time enjoying your outdoor space.",
  },
];

const TRUST_ITEMS = [
  {
    icon: "🛡️",
    title: "Satisfaction Guaranteed",
    text: "We’re not happy unless you’re happy.",
  },
  {
    icon: "📋",
    title: "No Long-Term Contract",
    text: "Reliable service without a long-term commitment.",
  },
  {
    icon: "🏔️",
    title: "Colorado Owned",
    text: "Locally owned and operated in Littleton, Colorado.",
  },
];

const FOUNDING_BENEFITS = [
  {
    icon: "⭐",
    title: "Lifetime Pricing",
    text: "Your current membership rate stays locked in for life.",
  },
  {
    icon: "🏆",
    title: "Founding Member Status",
    text: "Permanent recognition as one of Backyard Relief’s earliest members.",
  },
  {
    icon: "🎁",
    title: "Early Access",
    text: "Be among the first to hear about future services and member perks.",
  },
];

function formatMoney(value) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(amount) ? amount : 0);
}

function titleCase(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getAddOnLabel(key) {
  return ADD_ON_LABELS[key] || titleCase(key);
}

function DetailItem({ icon, label, value, highlight = false }) {
  return (
    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
      <Box
        sx={{
          width: 42,
          height: 42,
          flexShrink: 0,
          borderRadius: 2.5,
          bgcolor: BRAND.lightGreen,
          display: "grid",
          placeItems: "center",
          fontSize: 21,
        }}
      >
        {icon}
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={800}
          sx={{
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </Typography>

        <Typography
          color={highlight ? BRAND.green : BRAND.navy}
          fontWeight={900}
          sx={{
            mt: 0.25,
            fontSize: highlight ? "1.18rem" : "1rem",
            overflowWrap: "anywhere",
          }}
        >
          {value || "Not available"}
        </Typography>
      </Box>
    </Box>
  );
}

export default function SignupSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [showConfetti, setShowConfetti] = useState(true);
  const [loading, setLoading] = useState(Boolean(sessionId));
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(
    sessionId ? null : PREVIEW_DATA
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowConfetti(false);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!sessionId) {
      return undefined;
    }

    let active = true;

    async function loadCheckoutSession() {
      setLoading(true);
      setError("");

      try {
        const { data, error: functionError } =
          await supabase.functions.invoke(
            "get-checkout-session",
            {
              body: {
                session_id: sessionId,
              },
            }
          );

        if (functionError) {
          throw functionError;
        }

        if (!data?.success) {
          throw new Error(
            data?.error ||
              "Unable to load your signup confirmation."
          );
        }

        if (active) {
          setConfirmation(data);
        }
      } catch (loadError) {
        console.error(
          "CHECKOUT CONFIRMATION ERROR:",
          loadError
        );

        if (active) {
          setError(
            loadError?.message ||
              "Your payment was successful, but we could not load all of the confirmation details."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadCheckoutSession();

    return () => {
      active = false;
    };
  }, [sessionId]);

  const customer = confirmation?.customer || {};
  const membership = confirmation?.membership || {};

  const firstName =
    customer.first_name ||
    customer.full_name?.split(" ")[0] ||
    "";

  const fullName =
    customer.full_name ||
    `${customer.first_name || ""} ${
      customer.last_name || ""
    }`.trim() ||
    "New Relief Club Member";

  const fullAddress = useMemo(() => {
    const cityLine = [
      customer.city,
      customer.state,
      customer.zip,
    ]
      .filter(Boolean)
      .join(" ");

    return [customer.address, cityLine]
      .filter(Boolean)
      .join(", ");
  }, [
    customer.address,
    customer.city,
    customer.state,
    customer.zip,
  ]);

  const serviceDays = useMemo(() => {
    if (
      Array.isArray(membership.service_days) &&
      membership.service_days.length > 0
    ) {
      return membership.service_days;
    }

    return membership.service_day
      ? [membership.service_day]
      : [];
  }, [membership.service_day, membership.service_days]);

  const addOns = useMemo(() => {
    if (!Array.isArray(membership.selected_add_ons)) {
      return [];
    }

    return membership.selected_add_ons.map(getAddOnLabel);
  }, [membership.selected_add_ons]);

  const serviceDayText =
    serviceDays.length > 0
      ? serviceDays.join(" & ")
      : "Being confirmed";

  const routeText =
    [
      serviceDays.length > 0
        ? `${serviceDayText} Route`
        : null,
      membership.zone,
    ]
      .filter(Boolean)
      .join(" • ") || "Route being confirmed";

  const memberSince = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
      }).format(new Date()),
    []
  );

  const memberNumber =
    membership.member_number ||
    customer.member_number ||
    customer.customer_number ||
    "";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#F3F7F2",
        overflow: "hidden",
        position: "relative",

        "@keyframes confettiFall": {
          "0%": {
            transform:
              "translate3d(0, -15vh, 0) rotate(0deg)",
            opacity: 1,
          },
          "78%": { opacity: 1 },
          "100%": {
            transform:
              "translate3d(28px, 112vh, 0) rotate(720deg)",
            opacity: 0,
          },
        },

        "@keyframes successPop": {
          "0%": {
            opacity: 0,
            transform: "scale(0.5)",
          },
          "65%": {
            opacity: 1,
            transform: "scale(1.1)",
          },
          "100%": {
            opacity: 1,
            transform: "scale(1)",
          },
        },

        "@keyframes riseIn": {
          "0%": {
            opacity: 0,
            transform: "translateY(26px)",
          },
          "100%": {
            opacity: 1,
            transform: "translateY(0)",
          },
        },

        "@keyframes fadeIn": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },

        "@keyframes gentleFloat": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-7px)" },
        },

        "@keyframes pawDrift": {
          "0%, 100%": {
            transform:
              "translate3d(0, 0, 0) rotate(var(--paw-rotate))",
            opacity: 0.08,
          },
          "50%": {
            transform:
              "translate3d(0, -14px, 0) rotate(var(--paw-rotate))",
            opacity: 0.16,
          },
        },

        "@keyframes sparklePulse": {
          "0%, 100%": {
            transform: "scale(0.72) rotate(0deg)",
            opacity: 0.35,
          },
          "50%": {
            transform: "scale(1.25) rotate(45deg)",
            opacity: 1,
          },
        },

        "@keyframes checkGlow": {
          "0%, 100%": {
            boxShadow:
              "0 18px 45px rgba(0,0,0,0.25), 0 0 0 0 rgba(200,244,185,0.28)",
          },
          "50%": {
            boxShadow:
              "0 22px 55px rgba(0,0,0,0.28), 0 0 0 18px rgba(200,244,185,0)",
          },
        },

        "@keyframes rockyPeek": {
          "0%": {
            opacity: 0,
            transform: "translateY(80px) rotate(8deg)",
          },
          "70%": {
            opacity: 1,
            transform: "translateY(-8px) rotate(-2deg)",
          },
          "100%": {
            opacity: 1,
            transform: "translateY(0) rotate(0deg)",
          },
        },

        "@media (prefers-reduced-motion: reduce)": {
          "& *": {
            animationDuration: "0.01ms !important",
            animationIterationCount: "1 !important",
          },
        },
      }}
    >
      {showConfetti && (
        <Box
          aria-hidden="true"
          sx={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            overflow: "hidden",
            zIndex: 20,
          }}
        >
          {CONFETTI.map((piece) => (
            <Box
              key={piece.id}
              sx={{
                position: "absolute",
                top: "-30px",
                left: piece.left,
                width: piece.size,
                height:
                  piece.shape === 0
                    ? piece.size
                    : piece.size * 1.65,
                borderRadius:
                  piece.shape === 2 ? "50%" : "2px",
                bgcolor: piece.color,
                transform: `rotate(${piece.rotate})`,
                animation:
                  `confettiFall ${piece.duration} linear ${piece.delay} forwards`,
              }}
            />
          ))}
        </Box>
        
      )}

      <Box
        sx={{
          position: "relative",
          minHeight: {
            xs: 575,
            sm: 650,
            md: 735,
          },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          color: BRAND.white,
          px: 2,
          py: {
            xs: 5.5,
            sm: 7,
            md: 9,
          },
          backgroundImage: `
            linear-gradient(
              180deg,
              rgba(10, 43, 25, 0.70) 0%,
              rgba(18, 78, 42, 0.86) 58%,
              rgba(18, 78, 42, 0.98) 100%
            ),
            url(${heroImage})
          `,
          backgroundSize: "cover",
          backgroundPosition: "center",
          overflow: "hidden",
        }}
      >
        <Box
          component="img"
          src={logoImage}
          alt="Backyard Relief Pet Waste Solutions"
          sx={{
            position: "absolute",
            top: {
  xs: 18,
  sm: 24,
  md: 30,
},

left: {
  xs: 18,
  sm: 24,
  md: 30,
},
            width: {
  xs: 105,
  sm: 130,
  md: 170,
  lg: 195,
},
            height: "auto",
            objectFit: "contain",
            borderRadius: {
              xs: 1.5,
              sm: 2,
            },
            zIndex: 5,
            filter: "drop-shadow(0 7px 16px rgba(0,0,0,0.23))",
          }}
        />

        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 50% 25%, rgba(255,255,255,0.27), transparent 40%)",
          }}
        />

        <Box
          aria-hidden="true"
          sx={{
            position: "absolute",
            left: "50%",
            top: "31%",
            width: {
              xs: 300,
              md: 470,
            },
            height: {
              xs: 300,
              md: 470,
            },
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,255,255,0.17) 0%, rgba(143,211,255,0.08) 30%, transparent 68%)",
            filter: "blur(2px)",
          }}
        />

        {FLOATING_PAWS.map((paw) => (
          <Box
            key={paw.id}
            aria-hidden="true"
            sx={{
              "--paw-rotate": paw.rotate,
              position: "absolute",
              left: paw.left,
              top: paw.top,
              fontSize: paw.size,
              color: BRAND.white,
              opacity: 0.1,
              animation:
                `pawDrift ${paw.duration} ease-in-out ${paw.delay} infinite`,
            }}
          >
            🐾
          </Box>
        ))}

        {SPARKLES.map((sparkle, index) => (
          <Box
            key={`${sparkle.left}-${sparkle.top}`}
            aria-hidden="true"
            sx={{
              position: "absolute",
              left: sparkle.left,
              top: sparkle.top,
              width: sparkle.size,
              height: sparkle.size,
              bgcolor:
                index % 2 === 0 ? BRAND.gold : BRAND.white,
              clipPath:
                "polygon(50% 0%, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0% 50%, 39% 39%)",
              animation:
                `sparklePulse 2.2s ease-in-out ${sparkle.delay} infinite`,
            }}
          />
        ))}

        <Stack
          spacing={2.15}
          alignItems="center"
          sx={{
            position: "relative",
            zIndex: 3,
            width: "100%",
            maxWidth: 960,
          }}
        >
          <Chip
            label="🐾 WELCOME TO THE RELIEF CLUB"
            sx={{
              minWidth: {
                xs: 278,
                sm: 340,
              },
              bgcolor: "rgba(255,255,255,0.96)",
              color: BRAND.forest,
              fontWeight: 1000,
              letterSpacing: {
                xs: "0.035em",
                sm: "0.08em",
              },
              px: 1.5,
              boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
              animation: "fadeIn 0.55s ease-out 0.05s both",
            }}
          />

          <Box
            sx={{
              position: "relative",
              width: {
                xs: 122,
                sm: 150,
              },
              height: {
                xs: 122,
                sm: 150,
              },
              borderRadius: "50%",
              background:
                "linear-gradient(145deg, #FFFFFF 0%, #F3FFF0 100%)",
              display: "grid",
              placeItems: "center",
              border: "8px solid rgba(255,255,255,0.25)",
              animation:
                "successPop 0.75s ease-out 0.2s both, gentleFloat 3s ease-in-out 1.2s infinite, checkGlow 2.8s ease-in-out 1.2s infinite",
            }}
          >
            <Typography
              component="span"
              sx={{
                background:
                  "linear-gradient(180deg, #54A83C 0%, #1F7A36 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontSize: {
                  xs: 74,
                  sm: 90,
                },
                fontWeight: 1000,
                lineHeight: 1,
              }}
            >
              ✓
            </Typography>

            <Box
              aria-hidden="true"
              sx={{
                position: "absolute",
                right: -40,
                top: 9,
                fontSize: 21,
                animation: "sparklePulse 2s ease-in-out infinite",
              }}
            >
              ✨
            </Box>
          </Box>

          <Typography
            component="h1"
            sx={{
              fontSize: {
                xs: "2.15rem",
                sm: "3.25rem",
                md: "3.95rem",
              },
              fontWeight: 1000,
              letterSpacing: "-0.035em",
              lineHeight: 1.06,
              textShadow: "0 5px 22px rgba(0,0,0,0.28)",
              animation: "riseIn 0.7s ease-out 0.45s both",
            }}
          >
            {loading ? (
              "Preparing your celebration..."
            ) : (
              <>
                🎉 Congratulations, {firstName || "Friend"}!

                <Box
                  component="span"
                  sx={{
                    display: "block",
                    mt: 2,
                    color: BRAND.white,
                    fontSize: {
                      xs: "1.55rem",
                      sm: "2.1rem",
                      md: "2.35rem",
                    },
                    letterSpacing: "-0.02em",
                  }}
                >
                  Thank You for Joining
                </Box>

                <Box
                  component="span"
                  sx={{
                    display: "block",
                    color: "#C8F4B9",
                    fontSize: {
                      xs: "2.5rem",
                      sm: "4.15rem",
                      md: "5.25rem",
                    },
                    lineHeight: 1,
                    mt: 1.25,
                    animation: "riseIn 0.7s ease-out 0.75s both",
                  }}
                >
                  The Relief Club!
                </Box>
              </>
            )}
          </Typography>

          <Typography
            sx={{
              maxWidth: 760,
              fontSize: {
                xs: "1.25rem",
                sm: "1.5rem",
              },
              fontWeight: 800,
              animation: "riseIn 0.7s ease-out 0.95s both",
            }}
          >
            You&apos;re officially a Backyard Relief member!
          </Typography>

        

          <Typography
            sx={{
              maxWidth: 760,
              fontSize: {
                xs: "1.15rem",
                sm: "1.35rem",
              },
              fontWeight: 750,
              animation: "riseIn 0.7s ease-out 1.1s both",
            }}
          >
            ✨ Your yard just got a whole lot cleaner ✨
          </Typography>

          <Typography
            sx={{
              maxWidth: 720,
              color: "rgba(255,255,255,0.92)",
              fontSize: {
                xs: "1rem",
                sm: "1.12rem",
              },
              lineHeight: 1.8,
              animation: "riseIn 0.7s ease-out 1.3s both",
            }}
          >
            Your membership has been activated! Life is busy—so
            relax, we&apos;ll take it from here.
          </Typography>

          <Paper
            elevation={0}
            sx={{
              mt: 0.5,
              width: "fit-content",
              maxWidth: {
                xs: 330,
                sm: 650,
              },
              px: {
                xs: 2,
                sm: 3,
              },
              py: 1.15,
              borderRadius: {
                xs: 4,
                sm: 999,
              },
              color: BRAND.white,
              bgcolor: "rgba(244,185,66,0.18)",
              border: "1px solid rgba(255,226,156,0.45)",
              backdropFilter: "blur(10px)",
              animation: "riseIn 0.7s ease-out 1.42s both",
            }}
          >
            <Typography
              textAlign="center"
              fontWeight={900}
              sx={{
                fontSize: {
                  xs: "0.78rem",
                  sm: "0.92rem",
                },
                lineHeight: 1.45,
              }}
            >
              ⭐ FOUNDING MEMBER BENEFIT
              <Box
                component="span"
                sx={{
                  display: "block",
                  mt: 0.35,
                  fontSize: {
                    xs: "0.92rem",
                    sm: "1.02rem",
                  },
                  fontWeight: 1000,
                }}
              >
                Your membership rate is LOCKED IN FOR LIFE!
              </Box>
              <Box
                component="span"
                sx={{
                  display: "block",
                  mt: 0.25,
                  fontWeight: 800,
                }}
              >
                Thank you for helping us build Backyard Relief from the ground up 🎉
              </Box>
            </Typography>
          </Paper>

          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
            justifyContent="center"
            sx={{
              pt: 0.5,
              maxWidth: 720,
              animation: "riseIn 0.7s ease-out 1.55s both",
            }}
          >
            {[
              "✓ Membership Activated",
              "✓ Payment Received",
              "✓ Service Activated",
            ].map((label) => (
              <Chip
                key={label}
                label={label}
                sx={{
                  bgcolor: "rgba(84,168,60,0.26)",
                  color: BRAND.white,
                  fontWeight: 900,
                  border: "1px solid rgba(200,244,185,0.45)",
                  backdropFilter: "blur(10px)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
                }}
              />
            ))}
          </Stack>
        </Stack>

        <Box
          aria-label="Rocky welcoming new members"
          sx={{
            position: "absolute",
            right: {
  xs: -10,
  sm: -4,
  md: -14,
  lg: -10,
},

bottom: {
  xs: 6,
  sm: 2,
  md: -10,
  lg: -8,
},
            zIndex: 4,
            display: "block",
            pointerEvents: "none",
            animation: "rockyPeek 0.9s ease-out 1.65s both",
          }}
        >
          <Box
            component="img"
            src={rockyWelcomeImage}
            alt="Rocky welcoming new Relief Club members"
            sx={{
              width: {
  xs: 175,
  sm: 220,
  md: 290,
  lg: 340,
},
              maxWidth: "34vw",
              height: "auto",
              objectFit: "contain",
              display: "block",
              borderRadius: {
                xs: 2.5,
                md: 3,
              },
              filter: "drop-shadow(0 14px 24px rgba(0,0,0,0.25))",
            }}
          />
        </Box>


        <Box
          aria-hidden="true"
          sx={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 28,
            height: {
              xs: 90,
              md: 120,
            },
            opacity: 0.08,
            background:
              "linear-gradient(145deg, transparent 0 15%, #D8F2D2 15% 17%, transparent 17% 27%, #D8F2D2 27% 29%, transparent 29% 42%, #D8F2D2 42% 44%, transparent 44% 100%)",
            clipPath:
              "polygon(0 78%, 11% 42%, 22% 67%, 34% 25%, 47% 64%, 58% 34%, 70% 69%, 83% 22%, 100% 67%, 100% 100%, 0 100%)",
          }}
        />

        <Box
          sx={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: -1,
            height: {
              xs: 42,
              md: 70,
            },
            bgcolor: "#F3F7F2",
            clipPath:
              "polygon(0 68%, 12% 48%, 27% 62%, 43% 36%, 61% 55%, 79% 28%, 100% 50%, 100% 100%, 0 100%)",
          }}
        />
      </Box>

      <Box
        sx={{
          width: "100%",
          maxWidth: 1150,
          mx: "auto",
          px: {
            xs: 2,
            sm: 3,
          },
          pb: 8,
          position: "relative",
          zIndex: 2,
        }}
      >
        {loading && (
          <Paper
            elevation={0}
            sx={{
              mt: 1,
              p: 5,
              borderRadius: 5,
              textAlign: "center",
              border: "1px solid rgba(22,78,42,0.1)",
            }}
          >
            <CircularProgress color="success" />

            <Typography
              color={BRAND.forest}
              fontWeight={900}
              sx={{ mt: 2 }}
            >
              Preparing your membership celebration…
            </Typography>
          </Paper>
        )}

        {error && (
          <Alert
            severity="warning"
            sx={{
              mt: 2,
              borderRadius: 3,
            }}
          >
            {error} Your membership is still confirmed if Stripe
            displayed a successful payment.
          </Alert>
        )}

        {!loading && confirmation && (
          <>
            <Card
              sx={{
                mt: {
                  xs: -1,
                  md: -2,
                },
                borderRadius: 5,
                overflow: "hidden",
                border: "1px solid rgba(22,78,42,0.1)",
                boxShadow: "0 24px 65px rgba(30,70,42,0.14)",
                animation: "riseIn 0.75s ease-out 1.05s both",
              }}
            >
              <Box
                sx={{
                  height: 8,
                  background:
                    "linear-gradient(90deg, #164E2A, #54A83C, #F4B942, #54A83C, #164E2A)",
                }}
              />

              <CardContent
                sx={{
                  p: {
                    xs: 3,
                    sm: 5,
                  },
                }}
              >
                <Stack
                  direction={{
                    xs: "column",
                    md: "row",
                  }}
                  justifyContent="space-between"
                  alignItems={{
                    xs: "flex-start",
                    md: "center",
                  }}
                  spacing={2}
                >
                  <Box>
                    <Typography
                      variant="overline"
                      color={BRAND.green}
                      fontWeight={1000}
                      letterSpacing="0.12em"
                    >
                      Official Relief Club Member
                    </Typography>

                    <Typography
                      color={BRAND.forest}
                      fontWeight={1000}
                      sx={{
                        fontSize: {
                          xs: "1.8rem",
                          sm: "2.35rem",
                        },
                        lineHeight: 1.15,
                      }}
                    >
                      {fullName}
                    </Typography>

                    <Stack
                      direction="row"
                      spacing={1.5}
                      flexWrap="wrap"
                      useFlexGap
                      sx={{ mt: 0.8 }}
                    >
                      <Typography
                        color="text.secondary"
                        fontWeight={750}
                      >
                        Member Since {memberSince}
                      </Typography>

                      {memberNumber && (
                        <Typography
                          color="text.secondary"
                          fontWeight={750}
                        >
                          • Member #{memberNumber}
                        </Typography>
                      )}
                    </Stack>
                  </Box>

                  <Stack
                    direction={{
                      xs: "column",
                      sm: "row",
                    }}
                    spacing={1}
                    alignItems={{
                      xs: "flex-start",
                      sm: "center",
                    }}
                  >
                    <Chip
                      label="⭐ FOUNDING MEMBER"
                      sx={{
                        bgcolor: "#FFF4D6",
                        color: "#7B5610",
                        fontWeight: 1000,
                        border: "1px solid rgba(244,185,66,0.45)",
                      }}
                    />

                    <Chip
                      label="🟢 SERVICE ACTIVATED"
                      sx={{
                        bgcolor: BRAND.lightGreen,
                        color: BRAND.forest,
                        fontWeight: 1000,
                        letterSpacing: "0.04em",
                      }}
                    />

                    <Box
                      aria-label="Official Relief Club seal"
                      sx={{
                        width: 66,
                        height: 66,
                        borderRadius: "50%",
                        display: {
                          xs: "none",
                          md: "grid",
                        },
                        placeItems: "center",
                        textAlign: "center",
                        color: "#7B5610",
                        bgcolor: "#FFF4D6",
                        border: "3px double rgba(180,126,21,0.55)",
                        boxShadow:
                          "0 8px 20px rgba(123,86,16,0.13), inset 0 0 0 4px rgba(255,255,255,0.7)",
                      }}
                    >
                      <Typography
                        fontWeight={1000}
                        sx={{
                          fontSize: "0.6rem",
                          lineHeight: 1.05,
                          letterSpacing: "0.04em",
                        }}
                      >
                        RELIEF
                        <br />
                        CLUB
                        <br />
                        ✓
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>

                <Divider sx={{ my: 3 }} />

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, 1fr)",
                      lg: "repeat(4, 1fr)",
                    },
                    gap: 3,
                  }}
                >
                  <DetailItem
                    icon="🐾"
                    label="Membership"
                    value={
                      membership.plan_name ||
                      "Relief Club Membership"
                    }
                    highlight
                  />

                  <DetailItem
                    icon="📅"
                    label={
                      serviceDays.length > 1
                        ? "Service Days"
                        : "Service Day"
                    }
                    value={serviceDayText}
                    highlight
                  />

                  <DetailItem
                    icon="💳"
                    label="Monthly Membership"
                    value={`${formatMoney(
                      membership.monthly_total
                    )}/month`}
                    highlight
                  />

                  <DetailItem
                    icon="📍"
                    label="Route"
                    value={routeText}
                  />
                </Box>

                <Divider sx={{ my: 3 }} />

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      md: "1.2fr 0.8fr",
                    },
                    gap: 3,
                  }}
                >
                  <DetailItem
                    icon="🏡"
                    label="Service Address"
                    value={
                      fullAddress ||
                      "Address received during signup"
                    }
                  />

                  <DetailItem
                    icon="🔁"
                    label="Service Frequency"
                    value={
                      titleCase(
                        membership.service_frequency
                      ) || "Recurring Service"
                    }
                  />
                </Box>

                <Box
                  sx={{
                    mt: 3,
                    borderRadius: 4,
                    bgcolor: BRAND.paleGreen,
                    border: "1px solid rgba(46,125,50,0.15)",
                    p: {
                      xs: 2.5,
                      sm: 3,
                    },
                  }}
                >
                  <Typography
                    color={BRAND.forest}
                    fontWeight={1000}
                    sx={{ mb: 1.5 }}
                  >
                    Membership Add-Ons
                  </Typography>

                  {addOns.length > 0 ? (
                    <Stack
                      direction="row"
                      spacing={1}
                      flexWrap="wrap"
                      useFlexGap
                    >
                      {addOns.map((addOn) => (
                        <Chip
                          key={addOn}
                          label={`✓ ${addOn}`}
                          sx={{
                            bgcolor: BRAND.white,
                            color: BRAND.forest,
                            fontWeight: 800,
                            border:
                              "1px solid rgba(46,125,50,0.18)",
                          }}
                        />
                      ))}
                    </Stack>
                  ) : (
                    <Typography color="text.secondary">
                      Your selected membership does not include
                      separate paid add-ons.
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>

            {/* FOUNDING MEMBER BENEFITS */}
            <Box sx={{ mt: 7 }}>
              <Typography
                component="h2"
                textAlign="center"
                color={BRAND.navy}
                fontWeight={1000}
                sx={{
                  fontSize: {
                    xs: "2rem",
                    sm: "2.6rem",
                  },
                }}
              >
                Your Founding Member Benefits
              </Typography>

              <Typography
                textAlign="center"
                color="text.secondary"
                sx={{
                  mt: 1,
                  maxWidth: 700,
                  mx: "auto",
                  fontSize: "1.05rem",
                }}
              >
                A special thank-you for joining Backyard Relief from the beginning.
              </Typography>

              <Box
                sx={{
                  mt: 4,
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(3, 1fr)",
                  },
                  gap: 2.5,
                  position: "relative",

                  "&::before": {
                    content: '""',
                    display: {
                      xs: "none",
                      lg: "block",
                    },
                    position: "absolute",
                    top: 28,
                    left: "12.5%",
                    right: "12.5%",
                    height: 3,
                    bgcolor: "rgba(46,125,50,0.2)",
                  },
                }}
              >
                {FOUNDING_BENEFITS.map((benefit) => (
                  <Paper
                    key={benefit.title}
                    elevation={0}
                    sx={{
                      borderRadius: 4,
                      p: 3,
                      bgcolor: BRAND.white,
                      border: "1px solid rgba(244,185,66,0.3)",
                      boxShadow:
                        "0 12px 32px rgba(123,86,16,0.08)",
                      transition:
                        "transform 180ms ease, box-shadow 180ms ease",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow:
                          "0 18px 38px rgba(123,86,16,0.13)",
                      },
                    }}
                  >
                    <Typography sx={{ fontSize: 38 }}>
                      {benefit.icon}
                    </Typography>
                    <Typography
                      color={BRAND.forest}
                      fontWeight={1000}
                      sx={{ mt: 1.5, fontSize: "1.15rem" }}
                    >
                      {benefit.title}
                    </Typography>
                    <Typography
                      color="text.secondary"
                      sx={{ mt: 0.8, lineHeight: 1.65 }}
                    >
                      {benefit.text}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </Box>

            <Box
              sx={{
                mt: 7,
                animation: "riseIn 0.75s ease-out 1.45s both",
              }}
            >
              <Typography
                component="h2"
                textAlign="center"
                color={BRAND.navy}
                fontWeight={1000}
                sx={{
                  fontSize: {
                    xs: "2rem",
                    sm: "2.6rem",
                  },
                }}
              >
                Your Membership Journey
              </Typography>

              <Typography
                textAlign="center"
                color="text.secondary"
                sx={{
                  mt: 1,
                  maxWidth: 680,
                  mx: "auto",
                  fontSize: "1.05rem",
                }}
              >
                Your payment is complete. Here’s what happens between now and every completed Relief Visit.
              </Typography>

              <Box
                sx={{
                  mt: 4,
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, 1fr)",
                    lg: "repeat(5, 1fr)",
                  },
                  gap: 2.5,
                }}
              >
                {NEXT_STEPS.map((step, index) => (
                  <Paper
                    key={step.title}
                    elevation={0}
                    sx={{
                      borderRadius: 4,
                      p: 3,
                      bgcolor: BRAND.white,
                      border: "1px solid rgba(22,78,42,0.1)",
                      boxShadow:
                        "0 12px 32px rgba(25,70,42,0.08)",
                      position: "relative",
                      zIndex: 1,
                      mx: {
                        lg: 1.2,
                      },
                      transition:
                        "transform 180ms ease, box-shadow 180ms ease",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow:
                          "0 18px 38px rgba(25,70,42,0.12)",
                      },
                      animation:
                        `riseIn 0.65s ease-out ${
                          1.55 + index * 0.13
                        }s both`,
                    }}
                  >
                    <Box
                      sx={{
                        width: 52,
                        height: 52,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        bgcolor: BRAND.lightGreen,
                        fontSize: "1.45rem",
                      }}
                    >
                      {step.icon}
                    </Box>

                    <Typography
                      color={BRAND.forest}
                      fontWeight={900}
                      sx={{
                        mt: 2,
                        fontSize: "1.15rem",
                      }}
                    >
                      {step.title}
                    </Typography>

                    <Typography
                      color="text.secondary"
                      sx={{
                        mt: 1,
                        lineHeight: 1.65,
                      }}
                    >
                      {step.description}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </Box>

            <Paper
              elevation={0}
              sx={{
                mt: 7,
                borderRadius: 5,
                overflow: "hidden",
                border: "1px solid rgba(23,50,77,0.1)",
                boxShadow:
                  "0 18px 45px rgba(23,50,77,0.09)",
                animation: "riseIn 0.75s ease-out 1.95s both",
              }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "0.8fr 1.2fr",
                  },
                }}
              >
                <Box
                  sx={{
                    bgcolor: BRAND.navy,
                    color: BRAND.white,
                    p: {
                      xs: 3,
                      sm: 4,
                    },
                  }}
                >
                  <Typography sx={{ fontSize: 48 }}>
                    📲
                  </Typography>

                  <Typography
                    fontWeight={1000}
                    sx={{
                      mt: 1,
                      fontSize: "1.9rem",
                    }}
                  >
                    We’ll keep you informed
                  </Typography>

                  <Typography
                    sx={{
                      mt: 1.5,
                      color: "rgba(255,255,255,0.82)",
                      lineHeight: 1.7,
                    }}
                  >
                    {confirmation.sms_consent
                      ? "You selected service-related text notifications during signup."
                      : "Important service information will be provided using the contact details submitted during signup."}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    p: {
                      xs: 3,
                      sm: 4,
                    },
                    bgcolor: BRAND.white,
                  }}
                >
                  <Stack spacing={1.5}>
                    {[
                      "Arrival notifications",
                      "Service completion notifications",
                      "Closed-gate photo confirmations",
                      "Scheduling and account updates",
                    ].map((item) => (
                      <Box
                        key={item}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                        }}
                      >
                        <Box
                          sx={{
                            width: 30,
                            height: 30,
                            borderRadius: "50%",
                            display: "grid",
                            placeItems: "center",
                            bgcolor: BRAND.lightGreen,
                            color: BRAND.green,
                            fontWeight: 1000,
                          }}
                        >
                          ✓
                        </Box>

                        <Typography
                          color={BRAND.navy}
                          fontWeight={750}
                        >
                          {item}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </Box>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                mt: 7,
                borderRadius: 5,
                overflow: "hidden",
                border: "1px solid rgba(46,125,50,0.12)",
                boxShadow:
                  "0 18px 45px rgba(22,78,42,0.1)",
                animation: "riseIn 0.75s ease-out 2.15s both",
              }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "0.34fr 0.66fr",
                  },
                  alignItems: "stretch",
                }}
              >
                <Box
                  sx={{
                    background:
                      "linear-gradient(160deg, #EAF6E8 0%, #D8F2D2 100%)",
                    display: "grid",
                    placeItems: "center",
                    p: {
                      xs: 2.5,
                      sm: 3,
                      md: 4,
                    },
                    minHeight: {
                      xs: 190,
                      sm: 220,
                      md: 270,
                    },
                  }}
                >
                  <Box
                    component="img"
                    src={rockyFullBodyImage}
                    alt="Rocky, the Backyard Relief mascot"
                    sx={{
                      width: {
                        xs: 205,
                        sm: 245,
                        md: 300,
                        lg: 325,
                      },
                      maxWidth: "100%",
                      maxHeight: {
                        xs: 270,
                        sm: 310,
                        md: 370,
                      },
                      height: "auto",
                      objectFit: "contain",
                      display: "block",
                      borderRadius: {
                        xs: 2.5,
                        md: 3,
                      },
                      filter:
                        "drop-shadow(0 16px 26px rgba(22,78,42,0.18))",
                    }}
                  />
                </Box>

                <Box
                  sx={{
                    p: {
                      xs: 3.5,
                      sm: 5,
                    },
                    bgcolor: BRAND.white,
                  }}
                >
                  <Chip
                    label="MEET ROCKY"
                    sx={{
                      bgcolor: BRAND.lightGreen,
                      color: BRAND.forest,
                      fontWeight: 1000,
                      letterSpacing: "0.08em",
                    }}
                  />

                  <Typography
                    color={BRAND.forest}
                    fontWeight={1000}
                    sx={{
                      mt: 2,
                      fontSize: {
                        xs: "2rem",
                        sm: "2.55rem",
                      },
                    }}
                  >
                    Hi, I&apos;m Rocky! 🐶
                  </Typography>

                  <Typography
                    color={BRAND.navy}
                    fontWeight={800}
                    sx={{
                      mt: 1.5,
                      fontSize: "1.15rem",
                      lineHeight: 1.6,
                    }}
                  >
                    Thanks for joining The Relief Club—we&apos;re so happy
                    you&apos;re here!
                  </Typography>

                  <Typography
                    color="text.secondary"
                    sx={{
                      mt: 1.5,
                      lineHeight: 1.8,
                      fontSize: "1.02rem",
                    }}
                  >
                    Life is busy, and everyone could use a little more relief.
                    That&apos;s why Backyard Relief exists—to take one chore
                    off your list so you can spend more time enjoying your yard
                    with the people and pets you love.
                    <br />
                    <br />
                    Whether you&apos;re spending time with family, playing
                    fetch with your pup, or simply relaxing outside, I hope
                    Backyard Relief helps make your days just a little easier.
                  </Typography>

                  <Paper
                    elevation={0}
                    sx={{
                      mt: 3,
                      p: {
                        xs: 2.5,
                        sm: 3,
                      },
                      borderRadius: 3,
                      bgcolor: BRAND.paleGreen,
                      border: "1px solid rgba(46,125,50,0.15)",
                    }}
                  >
                    <Typography
                      color={BRAND.forest}
                      fontWeight={1000}
                      sx={{
                        mb: 1.5,
                        fontSize: "1.12rem",
                      }}
                    >
                      🐾 Rocky&apos;s Promise
                    </Typography>

                    <Typography
                      color="text.secondary"
                      sx={{
                        lineHeight: 1.8,
                        fontStyle: "italic",
                        fontSize: "1rem",
                      }}
                    >
                      &ldquo;At Backyard Relief, we believe every customer
                      deserves dependable service, every pet deserves a clean
                      place to play, and every yard deserves our very best.
                      Thank you for trusting us—we&apos;ll work hard to earn
                      that trust every single visit.&rdquo;
                    </Typography>

                    <Typography
                      color={BRAND.navy}
                      fontWeight={800}
                      sx={{
                        mt: 2.5,
                        lineHeight: 1.7,
                      }}
                    >
                      From all of us at Backyard Relief...
                      <br />
                      Welcome to The Relief Club! We&apos;re excited to have
                      you with us, and we can&apos;t wait to help keep your
                      backyard clean, healthy, and ready to enjoy. 🐾
                    </Typography>

                    <Divider
                      sx={{
                        my: 2.5,
                        borderColor: "rgba(46,125,50,0.16)",
                      }}
                    />

                    <Typography
                      sx={{
                        textAlign: "center",
                        color: BRAND.green,
                        fontWeight: 800,
                        fontStyle: "italic",
                        lineHeight: 1.65,
                      }}
                    >
                      P.S. I leave the dirty work to the humans... I&apos;m much
                      better at tail wags. 🐶
                    </Typography>
                  </Paper>
                </Box>
              </Box>
            </Paper>

            <Box
              sx={{
                mt: 7,
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(3, 1fr)",
                },
                gap: 2.5,
              }}
            >
              {TRUST_ITEMS.map((item) => (
                <Paper
                  key={item.title}
                  elevation={0}
                  sx={{
                    borderRadius: 4,
                    p: 3,
                    textAlign: "center",
                    bgcolor: BRAND.white,
                    border: "1px solid rgba(22,78,42,0.1)",
                  }}
                >
                  <Typography sx={{ fontSize: 42 }}>
                    {item.icon}
                  </Typography>

                  <Typography
                    color={BRAND.forest}
                    fontWeight={900}
                    sx={{ mt: 1 }}
                  >
                    {item.title}
                  </Typography>

                  <Typography
                    color="text.secondary"
                    sx={{ mt: 0.75 }}
                  >
                    {item.text}
                  </Typography>
                </Paper>
              ))}
            </Box>

            <Paper
              elevation={0}
              sx={{
                mt: 7,
                borderRadius: 5,
                p: {
                  xs: 3,
                  sm: 4,
                },
                bgcolor: "#FFFDF7",
                border: "1px solid rgba(244,185,66,0.32)",
                boxShadow:
                  "0 14px 36px rgba(123,86,16,0.08)",
                textAlign: "center",
              }}
            >
              <Typography
                color={BRAND.navy}
                sx={{
                  fontSize: {
                    xs: "1.25rem",
                    sm: "1.45rem",
                  },
                  lineHeight: 1.75,
                  fontStyle: "italic",
                  maxWidth: 760,
                  mx: "auto",
                }}
              >
                “Backyard Relief was built with one simple goal: to make life a little easier for our neighbors. We all have our own reasons for wanting a little more relief in our lives, and I'm truly grateful you've trusted us to care for your yard. We'll work hard to make sure every visit leaves your yard cleaner, your pets happier, and your day just a little brighter!”
              </Typography>

              <Typography
                color={BRAND.forest}
                fontWeight={1000}
                sx={{
                  mt: 1.5,
                  fontSize: "1.1rem",
                }}
              >
                — Dean Baer, Founder & Owner
              </Typography>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                mt: 7,
                borderRadius: 5,
                p: {
                  xs: 3,
                  sm: 5,
                },
                textAlign: "center",
                color: BRAND.white,
                background:
                  "linear-gradient(135deg, #164E2A 0%, #2E7D32 55%, #54A83C 100%)",
                boxShadow:
                  "0 22px 55px rgba(22,78,42,0.23)",
              }}
            >
              <Typography sx={{ fontSize: 52 }}>
                🎊
              </Typography>

              <Typography
                fontWeight={1000}
                sx={{
                  mt: 1,
                  fontSize: {
                    xs: "1.9rem",
                    sm: "2.5rem",
                  },
                }}
              >
                Welcome to the Backyard Relief family!
              </Typography>

              <Typography
                sx={{
                  mt: 1.5,
                  maxWidth: 720,
                  mx: "auto",
                  color: "rgba(255,255,255,0.88)",
                  lineHeight: 1.75,
                  fontSize: "1.04rem",
                }}
              >
                We’ll take care of the dirty work so you can spend
                more time enjoying your yard with the people and pets
                you love.
              </Typography>

              <Button
                variant="contained"
                size="large"
                href="https://www.backyardrelief.com"
                sx={{
                  mt: 3,
                  bgcolor: BRAND.white,
                  color: BRAND.forest,
                  fontWeight: 1000,
                  borderRadius: 999,
                  px: 4,
                  py: 1.4,
                  textTransform: "none",

                  "&:hover": {
                    bgcolor: "#F2F7F0",
                  },
                }}
              >
                Return to Backyard Relief
              </Button>
            </Paper>
          </>
        )}

        <Typography
          textAlign="center"
          color="text.secondary"
          variant="body2"
          sx={{ mt: 4 }}
        >
          Relieved Pets • Clean Yards • Happy Humans
        </Typography>
      </Box>
    </Box>
  );
}
