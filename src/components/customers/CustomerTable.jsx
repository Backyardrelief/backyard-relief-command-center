import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

import {
  Box,
  Button,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Drawer,
  Typography,
  Divider,
  Chip,
} from "@mui/material";

import { DataGrid } from "@mui/x-data-grid";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import CustomerDialog from "./CustomerDialog";
import { eventBus } from "../../lib/eventBus";

const normalizeCustomer = (customer) => ({
  ...customer,
  name: `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim(),
});

export default function CustomerTable() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [drawerCustomer, setDrawerCustomer] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase fetch error:", error);
      setLoading(false);
      return;
    }

    setCustomers((data || []).map(normalizeCustomer));
    setLoading(false);
  };

  const handleOpenAdd = () => {
    setSelectedCustomer(null);
    setOpen(true);
  };

  const handleEdit = (customer) => {
    setSelectedCustomer(customer);
    setOpen(true);
  };

  const handleSave = async (form) => {
    const payload = {
      first_name: (form.first_name || "").trim(),
      last_name: (form.last_name || "").trim(),
      phone: (form.phone || "").trim(),
      email: (form.email || "").trim(),
      service_plan: form.service_plan,

      address: (form.address || "").trim(),
      city: (form.city || "").trim(),
      state: (form.state || "").trim(),
      zip: (form.zip || "").trim(),

      lat: form.lat == null ? null : Number(form.lat),
      lng: form.lng == null ? null : Number(form.lng),

      zone: form.zone || null,
      zone_id: form.zone_id || null,
      service_day: form.service_day || null,

      dog_names: (form.dog_names || "").trim(),
      gate_code: (form.gate_code || "").trim(),
      access_instructions: (form.access_instructions || "").trim(),
      notes: (form.notes || "").trim(),
    };

    if (selectedCustomer) {
      const { data: updated, error } = await supabase
        .from("customers")
        .update(payload)
        .eq("id", selectedCustomer.id)
        .select()
        .single();

      if (error) {
        console.error("Update error:", error);
        return;
      }

      const normalized = normalizeCustomer(updated);

      setCustomers((prev) =>
        prev.map((c) => (c.id === selectedCustomer.id ? normalized : c))
      );

      setDrawerCustomer(normalized);
      eventBus.emit("customersUpdated", updated);
    } else {
      const { data: inserted, error } = await supabase
        .from("customers")
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error("Create error:", error);
        return;
      }

      setCustomers((prev) => [normalizeCustomer(inserted), ...prev]);
      eventBus.emit("customersUpdated", inserted);
    }

    setSelectedCustomer(null);
    setOpen(false);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", deleteTarget.id);

    if (error) {
      console.error("Delete error:", error);
      return;
    }

    setCustomers((prev) => prev.filter((c) => c.id !== deleteTarget.id));

    if (drawerCustomer?.id === deleteTarget.id) {
      setDrawerCustomer(null);
    }

    setDeleteTarget(null);
    eventBus.emit("customersUpdated");
  };

  const columns = [
    {
      field: "name",
      headerName: "Name",
      flex: 1.2,
      minWidth: 160,
    },
    {
      field: "phone",
      headerName: "Phone",
      flex: 1,
      minWidth: 120,
    },
    {
      field: "city",
      headerName: "City",
      flex: 1,
      minWidth: 120,
    },
    {
      field: "service_plan",
      headerName: "Plan",
      flex: 1,
      minWidth: 140,
    },
    {
      field: "service_day",
      headerName: "Day",
      flex: 1,
      minWidth: 110,
      valueGetter: (value) => value || "Unassigned",
    },
    {
      field: "zone",
      headerName: "Zone",
      flex: 1,
      minWidth: 110,
      valueGetter: (value) => value || "Unassigned",
    },
    {
      field: "subscription_status",
      headerName: "Billing",
      flex: 1,
      minWidth: 130,
      valueGetter: (value) => value || "Not Connected",
    },
  ];

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <h2>Customers</h2>

        <Button variant="contained" onClick={handleOpenAdd}>
          Add Customer
        </Button>
      </Stack>

      <Box sx={{ height: 540, width: "100%" }}>
        <DataGrid
          rows={customers}
          columns={columns}
          loading={loading}
          pageSizeOptions={[5, 10, 25]}
          onRowClick={(params) => setDrawerCustomer(params.row)}
          sx={{
            "& .MuiDataGrid-row": {
              cursor: "pointer",
            },
          }}
        />
      </Box>

      <Drawer
        anchor="right"
        open={!!drawerCustomer}
        onClose={() => setDrawerCustomer(null)}
      >
        <Box sx={{ width: 420, p: 3 }}>
          <Stack direction="row" justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                {drawerCustomer?.name}
              </Typography>

              <Typography color="text.secondary">
                {drawerCustomer?.email || "No email"}
              </Typography>
            </Box>

            <Chip
              label={drawerCustomer?.status || "unknown"}
              color={
                String(drawerCustomer?.status || "").toLowerCase() === "active"
                  ? "success"
                  : "default"
              }
              size="small"
            />
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" color="text.secondary">
            Phone
          </Typography>
          <Typography sx={{ mb: 2 }}>{drawerCustomer?.phone || "—"}</Typography>

          <Typography variant="subtitle2" color="text.secondary">
            Address
          </Typography>
          <Typography sx={{ mb: 2 }}>
            {drawerCustomer?.address || "—"}
            <br />
            {[drawerCustomer?.city, drawerCustomer?.state, drawerCustomer?.zip]
              .filter(Boolean)
              .join(", ")}
          </Typography>

          <Typography variant="subtitle2" color="text.secondary">
            Plan
          </Typography>
          <Typography sx={{ mb: 2 }}>
            {drawerCustomer?.service_plan || "—"}
          </Typography>

          <Typography variant="subtitle2" color="text.secondary">
            Route Assignment
          </Typography>
          <Typography sx={{ mb: 2 }}>
            {drawerCustomer?.service_day || "Unassigned"} ·{" "}
            {drawerCustomer?.zone || "Unassigned"}
          </Typography>

          <Typography variant="subtitle2" color="text.secondary">
            Billing
          </Typography>
          <Typography sx={{ mb: 2 }}>
            {drawerCustomer?.subscription_status || "Not Connected"}
          </Typography>

          <Typography variant="subtitle2" color="text.secondary">
            Dog Names
          </Typography>
          <Typography sx={{ mb: 2 }}>
            {drawerCustomer?.dog_names || "—"}
          </Typography>

          <Typography variant="subtitle2" color="text.secondary">
            Gate Code
          </Typography>
          <Typography sx={{ mb: 2 }}>
            {drawerCustomer?.gate_code || "—"}
          </Typography>

          <Typography variant="subtitle2" color="text.secondary">
            Access Instructions
          </Typography>
          <Typography sx={{ mb: 2 }}>
            {drawerCustomer?.access_instructions || "—"}
          </Typography>

          <Typography variant="subtitle2" color="text.secondary">
            Notes
          </Typography>
          <Typography sx={{ mb: 3 }}>{drawerCustomer?.notes || "—"}</Typography>

          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => handleEdit(drawerCustomer)}
            >
              Edit
            </Button>

            <Button
              color="error"
              variant="outlined"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteTarget(drawerCustomer)}
            >
              Delete
            </Button>
          </Stack>
        </Box>
      </Drawer>

      <CustomerDialog
        open={open}
        onClose={() => setOpen(false)}
        initialData={selectedCustomer}
        onSave={handleSave}
      />

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Customer?</DialogTitle>

        <DialogContent>
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDeleteConfirmed}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}