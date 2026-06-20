import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
} from "@mui/material";

import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import RouteIcon from "@mui/icons-material/Route";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import SettingsIcon from "@mui/icons-material/Settings";

const drawerWidth = 240;

export default function Sidebar({ selected, setSelected }) {
  const items = [
    { text: "Dashboard", icon: <DashboardIcon /> },
    { text: "Customers", icon: <PeopleIcon /> },
    { text: "Schedule", icon: <CalendarMonthIcon /> },
    { text: "Routes", icon: <RouteIcon /> },
    { text: "Settings", icon: <SettingsIcon /> },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
        },
      }}
    >
      <Toolbar />

      <List>
        {items.map((item) => (
          <ListItemButton
            key={item.text}
            selected={selected === item.text}
            onClick={() => setSelected(item.text)}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>

            <ListItemText primary={item.text} />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  );
}