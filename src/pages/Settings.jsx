import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";

import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import RefreshIcon from "@mui/icons-material/Refresh";
import SettingsIcon from "@mui/icons-material/Settings";

const REGISTER_PUSH_ENDPOINT =
  "https://ugtqsmrgwnyxzuwrolcz.supabase.co/functions/v1/register-push-subscription";

function urlBase64ToUint8Array(base64String) {
  const padding =
    "=".repeat(
      (4 - (base64String.length % 4)) % 4
    );

  const base64 = (
    base64String + padding
  )
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData =
    window.atob(base64);

  return Uint8Array.from(
    [...rawData].map((character) =>
      character.charCodeAt(0)
    )
  );
}

function getCrmAccessCode() {
  const storedCode =
    localStorage.getItem(
      "br_crm_access_code"
    );

  if (storedCode) {
    return storedCode;
  }

  const environmentCode =
    import.meta.env
      .VITE_CRM_ACCESS_CODE || "";

  if (environmentCode) {
    localStorage.setItem(
      "br_crm_access_code",
      environmentCode
    );
  }

  return environmentCode;
}

function getDeviceName() {
  const platform =
    navigator.platform || "";

  const userAgent =
    navigator.userAgent || "";

  if (
    /iPhone/i.test(userAgent) ||
    /iPhone/i.test(platform)
  ) {
    return "Dean's iPhone";
  }

  if (
    /iPad/i.test(userAgent) ||
    /iPad/i.test(platform)
  ) {
    return "Dean's iPad";
  }

  if (/Mac/i.test(platform)) {
    return "Dean's Mac";
  }

  return "Backyard Relief device";
}

function isStandaloneApp() {
  return (
    window.matchMedia?.(
      "(display-mode: standalone)"
    ).matches ||
    window.navigator.standalone === true
  );
}

export default function Settings() {
  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [disabling, setDisabling] =
    useState(false);

  const [supported, setSupported] =
    useState(true);

  const [installed, setInstalled] =
    useState(false);

  const [permission, setPermission] =
    useState("default");

  const [subscription, setSubscription] =
    useState(null);

  const [message, setMessage] =
    useState({
      severity: "info",
      text: "",
    });

  const inspectCurrentStatus =
    useCallback(async () => {
      setLoading(true);

      const pushSupported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      setSupported(pushSupported);
      setInstalled(isStandaloneApp());

      if (!pushSupported) {
        setMessage({
          severity: "error",
          text:
            "This browser or device does not support Web Push notifications.",
        });

        setLoading(false);
        return;
      }

      setPermission(
        Notification.permission
      );

      try {
        const registration =
          await navigator.serviceWorker.ready;

        const existingSubscription =
          await registration.pushManager
            .getSubscription();

        setSubscription(
          existingSubscription
        );
      } catch (error) {
        console.error(
          "Could not inspect push subscription:",
          error
        );

        setMessage({
          severity: "error",
          text:
            "The CRM could not inspect this device's notification subscription.",
        });
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    inspectCurrentStatus();
  }, [inspectCurrentStatus]);

  const loadPublicVapidKey =
    async (accessCode) => {
      const response = await fetch(
        REGISTER_PUSH_ENDPOINT,
        {
          method: "GET",
          headers: {
            "x-crm-access-code":
              accessCode,
          },
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data?.success ||
        !data?.vapid_public_key
      ) {
        throw new Error(
          data?.error ||
            "The public notification key could not be loaded."
        );
      }

      return data.vapid_public_key;
    };

  const saveSubscription =
    async (
      pushSubscription,
      accessCode
    ) => {
      const response = await fetch(
        REGISTER_PUSH_ENDPOINT,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            "x-crm-access-code":
              accessCode,
          },
          body: JSON.stringify({
            subscription:
              pushSubscription.toJSON(),
            device_name:
              getDeviceName(),
            user_agent:
              navigator.userAgent,
          }),
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.error ||
            "This device could not be registered."
        );
      }

      return data;
    };

  const enablePushNotifications =
    async () => {
      if (!supported || saving) {
        return;
      }

      setSaving(true);

      setMessage({
        severity: "info",
        text: "",
      });

      try {
        if (
          /iPhone|iPad|iPod/i.test(
            navigator.userAgent
          ) &&
          !isStandaloneApp()
        ) {
          throw new Error(
            "On iPhone, open the installed Backyard Relief CRM Home Screen app before enabling push notifications."
          );
        }

        const accessCode =
          getCrmAccessCode();

        if (!accessCode) {
          throw new Error(
            "Your CRM access code is missing. Sign out or reload the CRM and enter the access code again."
          );
        }

        const requestedPermission =
          await Notification
            .requestPermission();

        setPermission(
          requestedPermission
        );

        if (
          requestedPermission !==
          "granted"
        ) {
          throw new Error(
            "Notification permission was not granted. You can enable it later in your iPhone notification settings."
          );
        }

        const registration =
          await navigator.serviceWorker.ready;

        let currentSubscription =
          await registration.pushManager
            .getSubscription();

        if (!currentSubscription) {
          const publicVapidKey =
            await loadPublicVapidKey(
              accessCode
            );

          currentSubscription =
            await registration.pushManager
              .subscribe({
                userVisibleOnly: true,
                applicationServerKey:
                  urlBase64ToUint8Array(
                    publicVapidKey
                  ),
              });
        }

        await saveSubscription(
          currentSubscription,
          accessCode
        );

        setSubscription(
          currentSubscription
        );

        setMessage({
          severity: "success",
          text:
            `${getDeviceName()} is registered for Backyard Relief push notifications.`,
        });
      } catch (error) {
        console.error(
          "Could not enable push notifications:",
          error
        );

        setMessage({
          severity: "error",
          text:
            error instanceof Error
              ? error.message
              : "Push notifications could not be enabled.",
        });
      } finally {
        setSaving(false);
      }
    };

  const disablePushNotifications =
    async () => {
      if (
        !subscription ||
        disabling
      ) {
        return;
      }

      setDisabling(true);

      try {
        const accessCode =
          getCrmAccessCode();

        if (!accessCode) {
          throw new Error(
            "Your CRM access code is missing."
          );
        }

        const endpoint =
          subscription.endpoint;

        const response = await fetch(
          REGISTER_PUSH_ENDPOINT,
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
              "x-crm-access-code":
                accessCode,
            },
            body: JSON.stringify({
              endpoint,
            }),
          }
        );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data?.success
        ) {
          throw new Error(
            data?.error ||
              "The device could not be disabled."
          );
        }

        await subscription.unsubscribe();

        setSubscription(null);

        setMessage({
          severity: "success",
          text:
            "Push notifications were disabled on this device.",
        });
      } catch (error) {
        console.error(
          "Could not disable push notifications:",
          error
        );

        setMessage({
          severity: "error",
          text:
            error instanceof Error
              ? error.message
              : "Push notifications could not be disabled.",
        });
      } finally {
        setDisabling(false);
      }
    };

  const enabled =
    Boolean(subscription) &&
    permission === "granted";

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 900,
        mx: "auto",
      }}
    >
      <Stack spacing={3}>
        <Box>
          <Typography
            variant="h4"
            fontWeight={800}
            color="#173b20"
          >
            Settings
          </Typography>

          <Typography
            color="text.secondary"
            mt={0.5}
          >
            Configure your Backyard Relief
            Command Center.
          </Typography>
        </Box>

        <Card
          elevation={0}
          sx={{
            borderRadius: 4,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <CardContent
            sx={{
              p: {
                xs: 2.25,
                sm: 3,
              },
            }}
          >
            <Stack
              direction={{
                xs: "column",
                sm: "row",
              }}
              spacing={2}
              alignItems={{
                xs: "flex-start",
                sm: "center",
              }}
              justifyContent="space-between"
            >
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
              >
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: 3,
                    display: "grid",
                    placeItems: "center",
                    backgroundColor:
                      "#E8F5E9",
                    color: "#1B5E20",
                  }}
                >
                  <NotificationsActiveIcon
                    fontSize="large"
                  />
                </Box>

                <Box>
                  <Typography
                    variant="h6"
                    fontWeight={800}
                  >
                    Phone Push Notifications
                  </Typography>

                  <Typography
                    color="text.secondary"
                    mt={0.25}
                  >
                    Receive alerts when a
                    customer texts Backyard
                    Relief—even when the CRM
                    is closed.
                  </Typography>
                </Box>
              </Stack>

              {loading ? (
                <CircularProgress
                  size={25}
                />
              ) : (
                <Chip
                  color={
                    enabled
                      ? "success"
                      : "warning"
                  }
                  label={
                    enabled
                      ? "Enabled"
                      : "Not Registered"
                  }
                  sx={{
                    fontWeight: 800,
                  }}
                />
              )}
            </Stack>

            <Divider sx={{ my: 3 }} />

            <Stack spacing={2.25}>
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
              >
                <PhoneIphoneIcon
                  color={
                    enabled
                      ? "success"
                      : "action"
                  }
                />

                <Box>
                  <Typography
                    fontWeight={700}
                  >
                    {getDeviceName()}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    {installed
                      ? "Running as the installed CRM app."
                      : "Currently open in a browser window."}
                  </Typography>
                </Box>
              </Stack>

              {!supported && (
                <Alert severity="error">
                  Push notifications are not
                  supported on this device or
                  browser.
                </Alert>
              )}

              {supported &&
                /iPhone|iPad|iPod/i.test(
                  navigator.userAgent
                ) &&
                !installed && (
                  <Alert severity="warning">
                    On iPhone, open the
                    installed Backyard Relief
                    CRM Home Screen app before
                    enabling push notifications.
                  </Alert>
                )}

              {permission ===
                "denied" && (
                <Alert severity="error">
                  Notifications are blocked.
                  Open iPhone Settings →
                  Notifications → Relief CRM
                  and allow notifications.
                </Alert>
              )}

              {message.text && (
                <Alert
                  severity={
                    message.severity
                  }
                >
                  {message.text}
                </Alert>
              )}

              <Stack
                direction={{
                  xs: "column",
                  sm: "row",
                }}
                spacing={1.5}
              >
                {!enabled ? (
                  <Button
                    size="large"
                    variant="contained"
                    startIcon={
                      saving ? (
                        <CircularProgress
                          size={18}
                          color="inherit"
                        />
                      ) : (
                        <NotificationsActiveIcon />
                      )
                    }
                    onClick={
                      enablePushNotifications
                    }
                    disabled={
                      loading ||
                      saving ||
                      !supported
                    }
                    sx={{
                      minHeight: 48,
                      backgroundColor:
                        "#1B5E20",

                      "&:hover": {
                        backgroundColor:
                          "#164d1a",
                      },
                    }}
                  >
                    {saving
                      ? "Registering Device…"
                      : "Enable Push Notifications"}
                  </Button>
                ) : (
                  <Button
                    size="large"
                    variant="outlined"
                    color="error"
                    startIcon={
                      disabling ? (
                        <CircularProgress
                          size={18}
                          color="inherit"
                        />
                      ) : (
                        <NotificationsOffIcon />
                      )
                    }
                    onClick={
                      disablePushNotifications
                    }
                    disabled={disabling}
                    sx={{
                      minHeight: 48,
                    }}
                  >
                    {disabling
                      ? "Disabling…"
                      : "Disable on This Device"}
                  </Button>
                )}

                <Button
                  size="large"
                  variant="text"
                  startIcon={
                    <RefreshIcon />
                  }
                  onClick={
                    inspectCurrentStatus
                  }
                  disabled={loading}
                >
                  Refresh Status
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card
          elevation={0}
          sx={{
            borderRadius: 4,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <CardContent
            sx={{
              p: {
                xs: 2.25,
                sm: 3,
              },
            }}
          >
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
            >
              <SettingsIcon />

              <Typography
                variant="h6"
                fontWeight={800}
              >
                CRM Settings
              </Typography>
            </Stack>

            <Alert
              severity="info"
              sx={{
                mt: 2,
              }}
            >
              Additional business and team
              settings will appear here as
              Backyard Relief grows.
            </Alert>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}