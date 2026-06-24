import { AppBar, Toolbar, Typography, Box } from "@mui/material";

export default function Topbar() {
  return (
    <AppBar
      position="static"
      elevation={1}
      sx={{
        backgroundColor: "#ffffff",
        color: "#1f2937",
      }}
    >
      <Toolbar>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          🐾 Backyard Relief Command Center
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        <Typography variant="body1">
          Welcome, Dean
        </Typography>
      </Toolbar>
    </AppBar>
  );
}