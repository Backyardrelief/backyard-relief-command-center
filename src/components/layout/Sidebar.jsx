import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import RouteIcon from "@mui/icons-material/Route";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SettingsIcon from "@mui/icons-material/Settings";
import MapIcon from "@mui/icons-material/Map";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import HistoryIcon from "@mui/icons-material/History";
import ForumIcon from "@mui/icons-material/Forum";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import { supabase } from "../../lib/supabase";

const drawerWidth = 260;
const mobileDrawerWidth = "min(320px, 88vw)";
const BASE_DOCUMENT_TITLE = "Backyard Relief CRM";

const menuItems = [
  {
    text: "Dashboard",
    icon: <DashboardIcon />,
    path: "/dashboard",
  },
  {
    text: "Customers",
    icon: <PeopleIcon />,
    path: "/customers",
  },
  {
    text: "Messages",
    icon: <ForumIcon />,
    path: "/messages",
    showUnreadBadge: true,
  },
  {
    text: "Schedule",
    icon: <CalendarMonthIcon />,
    path: "/schedule",
  },
  {
    text: "Routes",
    icon: <RouteIcon />,
    path: "/routes",
  },
  {
    text: "Driver Mode",
    icon: <LocalShippingIcon />,
    path: "/driver",
  },
  {
    text: "Service History",
    icon: <HistoryIcon />,
    path: "/service-history",
  },
  {
    text: "Map",
    icon: <MapIcon />,
    path: "/map",
  },
  {
    text: "Billing",
    icon: <ReceiptLongIcon />,
    path: "/billing",
  },
  {
    text: "Settings",
    icon: <SettingsIcon />,
    path: "/settings",
  },
];

function detectMobileDevice() {
  if (typeof window === "undefined") {
    return false;
  }

  const userAgent =
    navigator.userAgent ||
    navigator.vendor ||
    "";

  const mobileUserAgent =
    /iPhone|iPad|iPod|Android|Mobile/i.test(
      userAgent
    );

  const touchDevice =
    navigator.maxTouchPoints > 1;

  const smallPhysicalScreen =
    Math.min(
      window.screen.width,
      window.screen.height
    ) < 900;

  return (
    mobileUserAgent ||
    (touchDevice && smallPhysicalScreen)
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  const desktopBreakpoint = useMediaQuery(
    theme.breakpoints.up("md"),
    {
      noSsr: true,
    }
  );

  const [mobileDevice, setMobileDevice] =
    useState(detectMobileDevice);

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [unreadMessages, setUnreadMessages] =
    useState(0);

  const loadUnreadCount = useCallback(
    async () => {
      const {
        count,
        error,
      } = await supabase
        .from("sms_messages")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("direction", "inbound")
        .eq("is_read", false);

      if (error) {
        console.error(
          "Could not load unread SMS count:",
          error
        );

        return;
      }

      setUnreadMessages(count ?? 0);
    },
    []
  );

  useEffect(() => {
    loadUnreadCount();

    const channel = supabase
      .channel("sidebar-unread-sms")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sms_messages",
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadUnreadCount]);

  useEffect(() => {
    document.title =
      unreadMessages > 0
        ? `(${unreadMessages}) ${BASE_DOCUMENT_TITLE}`
        : BASE_DOCUMENT_TITLE;

    return () => {
      document.title = BASE_DOCUMENT_TITLE;
    };
  }, [unreadMessages]);

  useEffect(() => {
    const handleResize = () => {
      setMobileDevice(
        detectMobileDevice()
      );
    };

    window.addEventListener(
      "resize",
      handleResize
    );

    window.addEventListener(
      "orientationchange",
      handleResize
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize
      );

      window.removeEventListener(
        "orientationchange",
        handleResize
      );
    };
  }, []);

  const usePermanentDrawer = useMemo(
    () =>
      desktopBreakpoint &&
      !mobileDevice,
    [
      desktopBreakpoint,
      mobileDevice,
    ]
  );

  useEffect(() => {
    if (usePermanentDrawer) {
      setMobileOpen(false);
    }
  }, [usePermanentDrawer]);

  const openMobileDrawer = () => {
    setMobileOpen(true);
  };

  const closeMobileDrawer = () => {
    setMobileOpen(false);
  };

  const handleNavigation = (path) => {
    navigate(path);

    if (!usePermanentDrawer) {
      closeMobileDrawer();
    }
  };

  const drawerContent = (
    <Box
      sx={{
        minHeight: "100%",
        backgroundColor: "#1B5E20",
        color: "white",
      }}
    >
      <Toolbar
        sx={{
          minHeight: 100,
          px: 2,
          py: 2,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        <Box
          sx={{
            minWidth: 0,
            flex: 1,
            pr: usePermanentDrawer ? 0 : 6,
          }}
        >
          <Typography
            fontWeight={800}
            sx={{
              fontSize: {
                xs: 21,
                sm: 22,
                md: 22,
              },
              lineHeight: 1.15,
              whiteSpace: "nowrap",
            }}
          >
            🐾 Backyard Relief
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              fontSize: 14,
              lineHeight: 1.2,
              opacity: 0.9,
              whiteSpace: "nowrap",
            }}
          >
            Command Center
          </Typography>
        </Box>

        {!usePermanentDrawer && (
          <IconButton
            aria-label="Close menu"
            onClick={closeMobileDrawer}
            sx={{
              color: "white",
              position: "absolute",
              top: 12,
              right: 10,
              zIndex: 2,
              width: 40,
              height: 40,
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </Toolbar>

      <Divider
        sx={{
          borderColor:
            "rgba(255, 255, 255, 0.15)",
        }}
      />

      <List
        sx={{
          px: 1,
          py: 1.5,
        }}
      >
        {menuItems.map((item) => {
          const active =
            location.pathname === item.path;

          const hasUnread =
            item.showUnreadBadge &&
            unreadMessages > 0;

          return (
            <ListItemButton
              key={item.path}
              selected={active}
              onClick={() =>
                handleNavigation(item.path)
              }
              sx={{
                minHeight: 52,
                my: 0.5,
                borderRadius: 2,
                color: "white",

                backgroundColor: active
                  ? "rgba(255, 255, 255, 0.20)"
                  : "transparent",

                "&.Mui-selected": {
                  backgroundColor:
                    "rgba(255, 255, 255, 0.20)",
                },

                "&.Mui-selected:hover": {
                  backgroundColor:
                    "rgba(255, 255, 255, 0.25)",
                },

                "&:hover": {
                  backgroundColor:
                    "rgba(255, 255, 255, 0.12)",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 48,
                  color: "white",
                }}
              >
                {item.icon}
              </ListItemIcon>

              <ListItemText
                primary={item.text}
                primaryTypographyProps={{
                  fontSize: 16,
                  fontWeight:
                    active || hasUnread
                      ? 700
                      : 400,
                }}
              />

              {hasUnread && (
                <Typography
                  component="span"
                  aria-label={`${unreadMessages} unread messages`}
                  sx={{
                    minWidth: 26,
                    height: 22,
                    px: 0.75,
                    borderRadius: 10,
                    backgroundColor: "#C62828",
                    color: "white",
                    fontSize: 12,
                    lineHeight: "22px",
                    textAlign: "center",
                    fontWeight: 800,
                    boxShadow:
                      "0 1px 3px rgba(0,0,0,0.28)",
                  }}
                >
                  {unreadMessages > 99
                    ? "99+"
                    : unreadMessages}
                </Typography>
              )}
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <>
      {!usePermanentDrawer && !mobileOpen && (
        <IconButton
          aria-label="Open navigation menu"
          onClick={openMobileDrawer}
          sx={{
            position: "fixed",
            top:
              "max(14px, env(safe-area-inset-top))",
            left: 14,

            /*
              Keep the menu button above ordinary page
              content, but below temporary/detail drawers.
              This prevents it from covering customer,
              billing, and service-history drawers.
            */
            zIndex: (currentTheme) =>
              currentTheme.zIndex.appBar + 1,

            width: 48,
            height: 48,

            color: "white",
            backgroundColor: "#1B5E20",
            boxShadow: 3,

            "&:hover": {
              backgroundColor: "#164d1a",
            },
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      <Drawer
        variant={
          usePermanentDrawer
            ? "permanent"
            : "temporary"
        }
        open={
          usePermanentDrawer
            ? true
            : mobileOpen
        }
        onClose={closeMobileDrawer}
        ModalProps={{
          keepMounted: true,
        }}
        PaperProps={{
          sx: {
            width: usePermanentDrawer
              ? drawerWidth
              : mobileDrawerWidth,
            maxWidth: usePermanentDrawer
              ? drawerWidth
              : "88vw",
            boxSizing: "border-box",
            backgroundColor: "#1B5E20",
            color: "white",
            borderRight: "none",
          },
        }}
        sx={{
          width: usePermanentDrawer
            ? drawerWidth
            : 0,

          flexShrink: 0,

          "& .MuiDrawer-paper": {
            width: usePermanentDrawer
              ? drawerWidth
              : mobileDrawerWidth,
            maxWidth: usePermanentDrawer
              ? drawerWidth
              : "88vw",
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
}

