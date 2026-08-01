import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Alert,
  Button,
  Snackbar,
} from "@mui/material";

import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import { supabase } from "../../lib/supabase";

const NOTIFICATION_SETTING_KEY =
  "br_sms_browser_notifications";

function normalizePhone(value = "") {
  return String(value).replace(/\D/g, "");
}

function formatPhone(value = "") {
  const digits = normalizePhone(value);

  if (
    digits.length === 11 &&
    digits.startsWith("1")
  ) {
    return `(${digits.slice(1, 4)}) ${digits.slice(
      4,
      7
    )}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(
      3,
      6
    )}-${digits.slice(6)}`;
  }

  return value || "Unknown number";
}

function getCustomerName(customer) {
  if (!customer) {
    return "";
  }

  return [
    customer.first_name,
    customer.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export default function SmsBrowserNotifications() {
  const navigate = useNavigate();
  const location = useLocation();

  const [permission, setPermission] =
    useState(() => {
      if (
        typeof window === "undefined" ||
        !("Notification" in window)
      ) {
        return "unsupported";
      }

      return Notification.permission;
    });

  const [showPermissionPrompt, setShowPermissionPrompt] =
    useState(false);

  const [inAppAlert, setInAppAlert] = useState({
    open: false,
    title: "",
    message: "",
  });

  const locationRef = useRef(location.pathname);

  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window)
    ) {
      return;
    }

    const setting =
      localStorage.getItem(
        NOTIFICATION_SETTING_KEY
      );

    /*
      Show the Enable Notifications prompt only when:
      - permission has not been decided,
      - and the user has not dismissed it previously.
    */
    if (
      Notification.permission === "default" &&
      setting !== "dismissed"
    ) {
      const timer = window.setTimeout(() => {
        setShowPermissionPrompt(true);
      }, 1200);

      return () => {
        window.clearTimeout(timer);
      };
    }

    setPermission(Notification.permission);
  }, []);

  const enableNotifications = async () => {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      setShowPermissionPrompt(false);
      return;
    }

    try {
      const result =
        await Notification.requestPermission();

      setPermission(result);
      setShowPermissionPrompt(false);

      localStorage.setItem(
        NOTIFICATION_SETTING_KEY,
        result
      );

      if (result === "granted") {
        const notification = new Notification(
          "Backyard Relief notifications enabled",
          {
            body:
              "You’ll now be alerted when a new customer text arrives.",
            tag: "br-notifications-enabled",
          }
        );

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }
    } catch (error) {
      console.error(
        "Could not request notification permission:",
        error
      );
    }
  };

  const dismissPermissionPrompt = () => {
    setShowPermissionPrompt(false);

    localStorage.setItem(
      NOTIFICATION_SETTING_KEY,
      "dismissed"
    );
  };

  useEffect(() => {
    const channel = supabase
      .channel("global-incoming-sms-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sms_messages",
          filter: "direction=eq.inbound",
        },
        async (payload) => {
          const message = payload.new;

          /*
            Ignore malformed or non-inbound rows.
          */
          if (
            !message ||
            message.direction !== "inbound"
          ) {
            return;
          }

          let customer = null;

          if (message.customer_id) {
            const {
              data,
              error,
            } = await supabase
              .from("customers")
              .select(
                `
                  id,
                  first_name,
                  last_name,
                  phone,
                  service_plan,
                  service_day
                `
              )
              .eq("id", message.customer_id)
              .maybeSingle();

            if (error) {
              console.error(
                "Could not load message customer:",
                error
              );
            } else {
              customer = data;
            }
          }

          const customerName =
            getCustomerName(customer);

          const displayName =
            customerName ||
            formatPhone(message.from_phone);

          const messageBody =
            String(message.body || "").trim() ||
            (Number(message.media_count) > 0
              ? "Sent an attachment"
              : "New customer message");

          setInAppAlert({
            open: true,
            title: displayName,
            message: messageBody,
          });

          /*
            Avoid a duplicate operating-system notification
            when the user is already looking at Messages and
            the browser tab is visible.
          */
          const alreadyViewingConversation =
            locationRef.current === "/messages" &&
            document.visibilityState === "visible";

          if (
            permission === "granted" &&
            !alreadyViewingConversation
          ) {
            const notification =
              new Notification(
                `New text from ${displayName}`,
                {
                  body: messageBody,
                  tag:
                    `incoming-sms-${message.id}`,
                  renotify: true,
                }
              );

            notification.onclick = () => {
              window.focus();
              navigate("/messages");
              notification.close();
            };
          }

          /*
            Update the browser-tab title while the tab
            is hidden so the new text is noticeable.
          */
          if (
            document.visibilityState === "hidden"
          ) {
            const originalTitle =
              document.title;

            document.title =
              `New message — ${displayName}`;

            const restoreTitle = () => {
              document.title = originalTitle;

              document.removeEventListener(
                "visibilitychange",
                restoreTitle
              );
            };

            document.addEventListener(
              "visibilitychange",
              restoreTitle
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error(
            "SMS notification channel failed."
          );
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate, permission]);

  return (
    <>
      <Snackbar
        open={showPermissionPrompt}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <Alert
          severity="info"
          icon={<NotificationsActiveIcon />}
          sx={{
            width: "100%",
            alignItems: "center",
          }}
          action={
            <>
              <Button
                color="inherit"
                size="small"
                onClick={
                  dismissPermissionPrompt
                }
              >
                Not now
              </Button>

              <Button
                color="inherit"
                size="small"
                variant="outlined"
                onClick={enableNotifications}
                sx={{
                  ml: 1,
                }}
              >
                Enable
              </Button>
            </>
          }
        >
          Enable alerts for new customer texts.
        </Alert>
      </Snackbar>

      <Snackbar
        open={inAppAlert.open}
        autoHideDuration={5500}
        onClose={() =>
          setInAppAlert((current) => ({
            ...current,
            open: false,
          }))
        }
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        sx={{
          mt: {
            xs:
              "max(54px, env(safe-area-inset-top))",
            md: 1,
          },
        }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClick={() => {
            setInAppAlert((current) => ({
              ...current,
              open: false,
            }));

            navigate("/messages");
          }}
          onClose={() =>
            setInAppAlert((current) => ({
              ...current,
              open: false,
            }))
          }
          sx={{
            cursor: "pointer",
            minWidth: {
              xs: "calc(100vw - 32px)",
              sm: 360,
            },
          }}
        >
          <strong>{inAppAlert.title}</strong>
          <br />
          {inAppAlert.message}
        </Alert>
      </Snackbar>
    </>
  );
}