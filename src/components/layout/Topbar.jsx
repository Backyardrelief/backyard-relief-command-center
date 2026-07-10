import {
  AppBar,
  Box,
  Toolbar,
  Typography,
} from "@mui/material";

export default function Topbar() {
  return (
    <AppBar
      position="static"
      elevation={1}
      sx={{
        width: "100%",
        backgroundColor: "#ffffff",
        color: "#1f2937",
      }}
    >
      <Toolbar
        sx={{
          minHeight: {
            xs: 64,
            md: 72,
          },
          px: {
            xs: 2,
            sm: 3,
          },
          pl: {
            xs: 8,
            md: 3,
          },
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            fontSize: {
              xs: "1rem",
              sm: "1.15rem",
              md: "1.25rem",
            },
            lineHeight: 1.2,
            whiteSpace: {
              xs: "normal",
              sm: "nowrap",
            },
          }}
        >
          🐾 Backyard Relief Command Center
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        <Typography
          variant="body1"
          sx={{
            display: {
              xs: "none",
              sm: "block",
            },
            whiteSpace: "nowrap",
          }}
        >
          Welcome, Dean
        </Typography>
      </Toolbar>
    </AppBar>
  );
}