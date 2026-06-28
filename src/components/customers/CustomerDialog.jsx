import { useEffect, useState } from "react";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  Alert,
  CircularProgress,
} from "@mui/material";

import PlacesAutocomplete from "../../maps/components/PlacesAutocomplete";

const defaultForm = {
  first_name: "",
  last_name: "",

  phone: "",
  email: "",

  address: "",
  city: "",
  state: "",
  zip: "",

  lat: null,
  lng: null,

  dog_names: "",

  gate_code: "",

  access_instructions: "",

  notes: "",
};

export default function CustomerDialog({
  open,
  onClose,
  onSave,
  initialData,
}) {
  const [form, setForm] = useState(defaultForm);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [lockedData, setLockedData] = useState(null);

  useEffect(() => {
  if (open) {
    setLockedData(initialData || null);
  }
}, [open, initialData]);

useEffect(() => {
  if (!open) return;

  const data = lockedData;

  if (data) {
    setForm({
      first_name: data.first_name || "",
      last_name: data.last_name || "",

      phone: data.phone || "",
      email: data.email || "",

      address: data.address || "",
      city: data.city || "",
      state: data.state || "",
      zip: data.zip || "",

      lat: data.lat ?? null,
      lng: data.lng ?? null,

      dog_names: data.dog_names || "",
      gate_code: data.gate_code || "",
      access_instructions: data.access_instructions || "",

      notes: data.notes || "",
    });
  } else {
    setForm(defaultForm);
  }

  setError("");
}, [open, lockedData]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePlaceSelected = (place) => {
    setForm((prev) => ({
      ...prev,
      ...place,
    }));
  };

  const validateForm = () => {
    if (!form.first_name.trim()) {
      return "First name is required.";
    }

    if (!form.last_name.trim()) {
      return "Last name is required.";
    }

    if (!form.address.trim()) {
      return "Please select a valid address.";
    }

    return "";
  };

  const resetForm = () => {
  setForm(defaultForm);
  setError("");
};

    const handleSubmit = async () => {
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");

    try {
      await onSave({
  ...form,

  first_name: (form.first_name || "").trim(),
  last_name: (form.last_name || "").trim(),

  phone: (form.phone || "").trim(),
  email: (form.email || "").trim(),

  address: (form.address || "").trim(),
  city: (form.city || "").trim(),
  state: (form.state || "").trim(),
  zip: (form.zip || "").trim(),

  dog_names: (form.dog_names || "").trim(),
  gate_code: (form.gate_code || "").trim(),
  access_instructions: (form.access_instructions || "").trim(),

  notes: (form.notes || "").trim(),

  lat: form.lat != null ? Number(form.lat) : null,
  lng: form.lng != null ? Number(form.lng) : null,
});

      resetForm();
      onClose();
    } catch (err) {
      console.error(err);

      setError(
        err?.message || "Unable to save customer."
      );
    } finally {
      setSaving(false);
    }
    
  };

    const handleCancel = () => {
    resetForm();
    onClose();
  };

     return (
  <Dialog open={open} onClose={handleCancel} fullWidth maxWidth="md">
    <DialogTitle>
      {initialData ? "Edit Customer" : "Add Customer"}
    </DialogTitle>

    <DialogContent dividers>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        {/* Name */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="First Name"
            name="first_name"
            value={form.first_name || ""}
            onChange={handleChange}
            fullWidth
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Last Name"
            name="last_name"
            value={form.last_name || ""}
            onChange={handleChange}
            fullWidth
          />
        </Grid>

        {/* Contact */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Phone"
            name="phone"
            value={form.phone || ""}
            onChange={handleChange}
            fullWidth
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Email"
            name="email"
            value={form.email || ""}
            onChange={handleChange}
            fullWidth
          />
        </Grid>

        {/* Address Autocomplete */}
        <Grid item xs={12}>
          <PlacesAutocomplete
            value={form.address || ""}
            onPlaceSelected={handlePlaceSelected}
          />
        </Grid>

        {/* Address fields */}
        <Grid item xs={12}>
          <TextField
            label="Address"
            name="address"
            value={form.address || ""}
            onChange={handleChange}
            fullWidth
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField
            label="City"
            name="city"
            value={form.city || ""}
            onChange={handleChange}
            fullWidth
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField
            label="State"
            name="state"
            value={form.state || ""}
            onChange={handleChange}
            fullWidth
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField
            label="ZIP"
            name="zip"
            value={form.zip || ""}
            onChange={handleChange}
            fullWidth
          />
        </Grid>

        {/* Dog / Access */}
        <Grid item xs={12}>
          <TextField
            label="Dog Names"
            name="dog_names"
            value={form.dog_names || ""}
            onChange={handleChange}
            fullWidth
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Gate Code"
            name="gate_code"
            value={form.gate_code || ""}
            onChange={handleChange}
            fullWidth
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Access Instructions"
            name="access_instructions"
            value={form.access_instructions || ""}
            onChange={handleChange}
            fullWidth
            multiline
            minRows={2}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Notes"
            name="notes"
            value={form.notes || ""}
            onChange={handleChange}
            fullWidth
            multiline
            minRows={3}
          />
        </Grid>

        {/* Error */}
        {error && (
          <Grid item xs={12}>
            <Alert severity="error">{error}</Alert>
          </Grid>
        )}
      </Grid>
    </DialogContent>

    <DialogActions>
      <Button onClick={handleCancel} disabled={saving}>
        Cancel
      </Button>

      <Button
        onClick={handleSubmit}
        variant="contained"
        disabled={saving}
      >
        {saving ? (
          <CircularProgress size={20} />
        ) : initialData ? (
          "Update"
        ) : (
          "Save"
        )}
      </Button>
    </DialogActions>
  </Dialog>
);

}

