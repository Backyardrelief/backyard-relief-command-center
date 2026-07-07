import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Billing() {
  const [customers, setCustomers] = useState([]);
  const [searchParams] = useSearchParams();

  const failedOnly =
    searchParams.get("filter") === "failed";

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    const { data, error } = await supabase
      .from("customers")
      .select("*");

    if (error) {
      console.error(error);
      return;
    }

    let rows = data || [];

    if (failedOnly) {
      rows = rows.filter(
        (customer) =>
          String(
            customer.subscription_status || ""
          ).toLowerCase() === "past_due" ||
          String(
            customer.subscription_status || ""
          ).toLowerCase() === "unpaid"
      );
    }

    setCustomers(rows);
  }

  const columns = [
    {
      field: "name",
      headerName: "Customer",
      flex: 1.5,
      valueGetter: (_, row) =>
        `${row.first_name || ""} ${row.last_name || ""}`,
    },
    {
      field: "service_plan",
      headerName: "Plan",
      flex: 1,
    },
    {
      field: "subscription_status",
      headerName: "Subscription Status",
      flex: 1.2,
      renderCell: (params) => (
        <Chip
          label={params.value || "unknown"}
          color={
            params.value === "active"
              ? "success"
              : "error"
          }
          size="small"
        />
      ),
    },
    {
      field: "email",
      headerName: "Email",
      flex: 1.5,
    },
    {
      field: "phone",
      headerName: "Phone",
      flex: 1,
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h4"
        fontWeight="bold"
        sx={{ mb: 1 }}
      >
        Billing
      </Typography>

      <Typography
        color="text.secondary"
        sx={{ mb: 3 }}
      >
        Subscription management and payment status.
      </Typography>

      <Paper sx={{ p: 2 }}>
        <DataGrid
          autoHeight
          rows={customers}
          columns={columns}
          getRowId={(row) => row.id}
          pageSizeOptions={[10, 25, 50]}
        />
      </Paper>
    </Box>
  );
}