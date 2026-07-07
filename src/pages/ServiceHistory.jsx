import { useEffect, useState } from "react";

import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
} from "@mui/material";

import { DataGrid } from "@mui/x-data-grid";

import { supabase } from "../lib/supabase";

export default function ServiceHistory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoading(true);

    const { data, error } = await supabase
      .from("service_history")
      .select(`
        *,
        customers (
          first_name,
          last_name
        )
      `)
      .order("service_date", { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const formatted =
      data?.map((row) => ({
        id: row.id,
        service_date: row.service_date,
        completed_at: row.completed_at || "",
        customer_name: row.customers
          ? `${row.customers.first_name || ""} ${row.customers.last_name || ""}`.trim()
          : "Unknown Customer",
        driver_id: row.driver_id || "-",
        status: row.status || "completed",
        gate_photo_url: row.gate_photo_url || row.photo_url || "",
        notes: row.notes || "",
      })) || [];

    setRows(formatted);
    setLoading(false);
  }

  const columns = [
    {
      field: "service_date",
      headerName: "Service Date",
      width: 140,
    },
    {
      field: "customer_name",
      headerName: "Customer",
      flex: 1,
      minWidth: 200,
    },
    {
      field: "driver_id",
      headerName: "Driver",
      width: 120,
    },
    {
      field: "status",
      headerName: "Status",
      width: 140,
      renderCell: (params) => (
        <Chip
          size="small"
          color={params.value === "completed" ? "success" : "warning"}
          label={params.value}
        />
      ),
    },
    {
      field: "gate_photo_url",
      headerName: "Gate Photo",
      width: 150,
      sortable: false,
      renderCell: (params) =>
        params.value ? (
          <Button
            size="small"
            variant="outlined"
            onClick={() => window.open(params.value, "_blank")}
          >
            View Photo
          </Button>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No photo
          </Typography>
        ),
    },
    {
      field: "notes",
      headerName: "Notes",
      flex: 1,
      minWidth: 250,
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        Service History
      </Typography>

      <Paper sx={{ height: 650, borderRadius: 3 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          pageSizeOptions={[25, 50, 100]}
        />
      </Paper>
    </Box>
  );
}