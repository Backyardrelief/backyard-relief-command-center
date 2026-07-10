import { useEffect, useMemo, useState } from "react";

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

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

const drawerWidth = 260;

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

  useEffect(() => {
    const handleResize = () => {
      setMobileDevice(detectMobileDevice());
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

  const usePermanentDrawer = useMemo(() => {
    return (
      desktopBreakpoint &&
      !mobileDevice
    );
  }, [
    desktopBreakpoint,
    mobileDevice,
  ]);

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
        }}
      >
        <Box>
          <Typography
            variant="h5"
            fontWeight={700}
          >
            🐾 Backyard
          </Typography>

          <Typography variant="subtitle2">
            Relief CRM
          </Typography>
        </Box>

        {!usePermanentDrawer && (
          <IconButton
            aria-label="Close menu"
            onClick={closeMobileDrawer}
            sx={{
              color: "white",
              mt: -0.5,
              mr: -0.5,
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
                  fontWeight: active
                    ? 700
                    : 400,
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <>
      {!usePermanentDrawer && (
        <IconButton
          aria-label="Open navigation menu"
          onClick={openMobileDrawer}
          sx={{
            position: "fixed",
            top: "max(10px, env(safe-area-inset-top))",
            left: 10,
            zIndex: (currentTheme) =>
              currentTheme.zIndex.drawer + 2,

            width: 44,
            height: 44,

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
            width: drawerWidth,
            maxWidth: "84vw",
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
            width: drawerWidth,
            maxWidth: "84vw",
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
}