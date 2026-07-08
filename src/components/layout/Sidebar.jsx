import {
  Drawer,
  Toolbar,
  Typography,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";

import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import RouteIcon from "@mui/icons-material/Route";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SettingsIcon from "@mui/icons-material/Settings";
import MapIcon from "@mui/icons-material/Map";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import HistoryIcon from "@mui/icons-material/History";

import { useNavigate, useLocation } from "react-router-dom";

const drawerWidth = 260;

const menuItems = [
  { text: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
  { text: "Customers", icon: <PeopleIcon />, path: "/customers" },
  { text: "Schedule", icon: <CalendarMonthIcon />, path: "/schedule" },
  { text: "Routes", icon: <RouteIcon />, path: "/routes" },
  { text: "Driver Mode", icon: <LocalShippingIcon />, path: "/driver" },
  { text: "Service History", icon: <HistoryIcon />, path: "/service-history" },
  { text: "Map", icon: <MapIcon />, path: "/map" },
  { text: "Billing", icon: <ReceiptLongIcon />, path: "/billing" },
  { text: "Settings", icon: <SettingsIcon />, path: "/settings" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          backgroundColor: "#1B5E20",
          color: "white",
          borderRight: "none",
        },
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          py: 2,
        }}
      >
        <Typography variant="h5" fontWeight="bold">
          🐾 Backyard
        </Typography>

        <Typography variant="subtitle2">Relief CRM</Typography>
      </Toolbar>

      <Divider sx={{ borderColor: "rgba(255,255,255,.15)" }} />

      <List>
        {menuItems.map((item) => {
          const active = location.pathname === item.path;

          return (
            <ListItemButton
              key={item.text}
              onClick={() => navigate(item.path)}
              sx={{
                mx: 1,
                my: 0.5,
                borderRadius: 2,
                backgroundColor: active
                  ? "rgba(255,255,255,.20)"
                  : "transparent",
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,.12)",
                },
              }}
            >
              <ListItemIcon sx={{ color: "white" }}>
                {item.icon}
              </ListItemIcon>

              <ListItemText primary={item.text} />
            </ListItemButton>
          );
        })}
      </List>
    </Drawer>
  );
}