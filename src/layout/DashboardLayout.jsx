import { Box } from "@mui/material";

import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";

export default function DashboardLayout({ children }) {
  return (
    <Box
      sx={{
        display: "flex",
        width: "100%",
        minWidth: 0,
        minHeight: "100dvh",
        backgroundColor: "#f5f7fa",
        overflow: "hidden",
      }}
    >
      <Sidebar />

      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          width: {
            xs: "100%",
            md: "calc(100% - 260px)",
          },
          minWidth: 0,
          minHeight: "100dvh",
          overflow: "hidden",
        }}
      >
        <Topbar />

        <Box
          component="main"
          sx={{
            flex: 1,
            width: "100%",
            minWidth: 0,
            overflowX: "hidden",
            overflowY: "auto",
            boxSizing: "border-box",

            px: {
              xs: 2,
              sm: 2.5,
              md: 3.75,
            },

            pt: {
              xs: 9,
              md: 3.75,
            },

            pb: {
              xs: 3,
              md: 3.75,
            },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}