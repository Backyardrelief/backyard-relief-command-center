import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

import {
  Box,
  Button,
  Stack,
  Chip,
  IconButton,
  Drawer,
  Typography,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

import { DataGrid } from "@mui/x-data-grid";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import CustomerDialog from "./CustomerDialog";

// -------------------------
// NORMALIZE CUSTOMER
// -------------------------
const normalizeCustomer = (customer) => ({
  ...customer,
  name: `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim(),
});

export default function CustomerTable() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [selectedViewCustomer, setSelectedViewCustomer] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // -------------------------
  // LOAD CUSTOMERS
  // -------------------------
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

  // -------------------------
  // OPEN ADD
  // -------------------------
  const handleOpenAdd = () => {
    setSelectedCustomer(null);
    setOpen(true);
  };

  // -------------------------
  // OPEN EDIT
  // -------------------------
  const handleEdit = (customer) => {
    setSelectedCustomer(customer);
    setOpen(true);
  };

  // -------------------------
  // SAVE (CREATE / UPDATE)
  // -------------------------
  const handleSave = async (form) => {
    const payload = {
      first_name: (form.first_name || "").trim(),
      last_name: (form.last_name || "").trim(),
      phone: (form.phone || "").trim(),
      email: (form.email || "").trim(),
      address: (form.address || "").trim(),
      city: (form.city || "").trim(),
      state: (form.state || "").trim(),
      zip: (form.zip || "").trim(),

      lat: form.lat == null ? null : Number(form.lat),
      lng: form.lng == null ? null : Number(form.lng),

      dog_names: (form.dog_names || "").trim(),
      gate_code: (form.gate_code || "").trim(),
      access_instructions: (form.access_instructions || "").trim(),
      notes: (form.notes || "").trim(),
    };

    // UPDATE
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

      setCustomers((prev) =>
        prev.map((c) =>
          c.id === selectedCustomer.id ? normalizeCustomer(updated) : c
        )
      );
    }

    // CREATE
    else {
      const { data: inserted, error } = await supabase
        .from("customers")
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error("Create error:", error);
        return;
      }

      setCustomers((prev) => [
        normalizeCustomer(inserted),
        ...prev,
      ]);
    }

    setSelectedCustomer(null);
    setOpen(false);
  };

  // -------------------------
  // DELETE
  // -------------------------
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

    setCustomers((prev) =>
      prev.filter((c) => c.id !== deleteTarget.id)
    );

    setDeleteTarget(null);
  };

  // -------------------------
  // COLUMNS
  // -------------------------
  const columns = [
    { field: "name", headerName: "Name", flex: 1, minWidth: 150 },
    { field: "email", headerName: "Email", flex: 1, minWidth: 180 },
    { field: "phone", headerName: "Phone", flex: 1 },
    { field: "address", headerName: "Address", flex: 1 },

    {
      field: "actions",
      headerName: "Actions",
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <IconButton onClick={() => handleEdit(params.row)}>
            <EditIcon fontSize="small" />
          </IconButton>

          <IconButton onClick={() => setDeleteTarget(params.row)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      ),
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

      <Box sx={{ height: 500, width: "100%" }}>
        <DataGrid
          rows={customers}
          columns={columns}
          loading={loading}
          pageSizeOptions={[5, 10]}
        />
      </Box>

      {/* DIALOG */}
      <CustomerDialog
        open={open}
        onClose={() => setOpen(false)}
        initialData={selectedCustomer}
        onSave={handleSave}
      />

      {/* DELETE */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Customer?</DialogTitle>

        <DialogContent>
          Are you sure you want to delete{" "}
          <strong>{deleteTarget?.name}</strong>?
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteConfirmed}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}