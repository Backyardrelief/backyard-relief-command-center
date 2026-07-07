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
  MenuItem,
  Checkbox,
  FormControlLabel,
} from "@mui/material";

import PlacesAutocomplete from "../../maps/components/PlacesAutocomplete";
import { getZoneAssignment } from "../../utils/zoneAssignment";

const SERVICE_PLANS = [
  "Basic Relief",
  "Standard Relief",
  "Relief Plus",
  "Relief Premium",
  "Relief Elite",
];

const SERVICE_DAYS = [
  "",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

const defaultForm = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  service_plan: "Relief Plus",

  address: "",
  city: "",
  state: "",
  zip: "",

  lat: null,
  lng: null,

  zone: "",
  zone_id: "",
  service_day: "",
  second_service_day: "",

  dog_names: "",
  gate_code: "",
  access_instructions: "",
  notes: "",

  deodorizer_enabled: true,
  deodorizer_frequency: "monthly",
  last_deodorizer_date: "",
  next_deodorizer_date: "",
};

const getDeodorizerSettingsFromPlan = (plan) => {
  if (plan === "Relief Plus") {
    return {
      deodorizer_enabled: true,
      deodorizer_frequency: "monthly",
    };
  }

  if (plan === "Relief Premium" || plan === "Relief Elite") {
    return {
      deodorizer_enabled: true,
      deodorizer_frequency: "biweekly",
    };
  }

  return {
    deodorizer_enabled: false,
    deodorizer_frequency: "",
  };
};

export default function CustomerDialog({ open, onClose, onSave, initialData }) {
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
        service_plan: data.service_plan || "Relief Plus",

        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        zip: data.zip || "",

        lat: data.lat ?? null,
        lng: data.lng ?? null,

        zone: data.zone || "",
        zone_id: data.zone_id || "",
        service_day: data.service_day || "",
        second_service_day: data.second_service_day || "",

        dog_names: data.dog_names || "",
        gate_code: data.gate_code || "",
        access_instructions: data.access_instructions || "",
        notes: data.notes || "",

        deodorizer_enabled: data.deodorizer_enabled ?? false,
        deodorizer_frequency: data.deodorizer_frequency || "monthly",
        last_deodorizer_date: data.last_deodorizer_date || "",
        next_deodorizer_date: data.next_deodorizer_date || "",
      });
    } else {
      setForm(defaultForm);
    }

    setError("");
  }, [open, lockedData]);

  const applyZoneAssignment = (zip) => {
    return getZoneAssignment(zip);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "zip") {
      const assignment = applyZoneAssignment(value);

      setForm((prev) => ({
        ...prev,
        zip: value,
        zone: assignment.zone,
        zone_id: assignment.zone_id,
        service_day: assignment.service_day || "",
      }));

      return;
    }

    if (name === "service_plan") {
      const deodorizerSettings = getDeodorizerSettingsFromPlan(value);

      setForm((prev) => ({
        ...prev,
        service_plan: value,
        ...deodorizerSettings,

        second_service_day:
          value === "Relief Elite"
            ? prev.second_service_day || "Thursday"
            : "",

        next_deodorizer_date: deodorizerSettings.deodorizer_enabled
          ? prev.next_deodorizer_date || new Date().toISOString().slice(0, 10)
          : "",
      }));

      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePlaceSelected = (place) => {
    const assignment = applyZoneAssignment(place.zip);

    setForm((prev) => ({
      ...prev,
      ...place,
      zone: assignment.zone,
      zone_id: assignment.zone_id,
      service_day: assignment.service_day || "",
    }));
  };

  const validateForm = () => {
    if (!form.first_name.trim()) return "First name is required.";
    if (!form.last_name.trim()) return "Last name is required.";
    if (!form.address.trim()) return "Please select a valid address.";

    if (form.service_plan === "Relief Elite") {
      if (!form.service_day) return "Elite customers need a primary service day.";
      if (!form.second_service_day) return "Elite customers need a second service day.";
      if (form.service_day === form.second_service_day) {
        return "Second service day must be different from the primary service day.";
      }
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
      const assignment = applyZoneAssignment(form.zip);

      await onSave({
        ...form,

        first_name: (form.first_name || "").trim(),
        last_name: (form.last_name || "").trim(),
        phone: (form.phone || "").trim(),
        email: (form.email || "").trim(),

        service_plan: form.service_plan || "Relief Plus",

        address: (form.address || "").trim(),
        city: (form.city || "").trim(),
        state: (form.state || "").trim(),
        zip: (form.zip || "").trim(),

        zone: assignment.zone,
        zone_id: assignment.zone_id,

        service_day: form.service_day || assignment.service_day || null,
        second_service_day:
          form.service_plan === "Relief Elite"
            ? form.second_service_day || null
            : null,

        dog_names: (form.dog_names || "").trim(),
        gate_code: (form.gate_code || "").trim(),
        access_instructions: (form.access_instructions || "").trim(),
        notes: (form.notes || "").trim(),

        deodorizer_enabled: !!form.deodorizer_enabled,
        deodorizer_frequency: form.deodorizer_enabled
          ? form.deodorizer_frequency || "monthly"
          : null,
        last_deodorizer_date: form.last_deodorizer_date || null,
        next_deodorizer_date: form.deodorizer_enabled
          ? form.next_deodorizer_date || null
          : null,

        lat: form.lat != null ? Number(form.lat) : null,
        lng: form.lng != null ? Number(form.lng) : null,
      });

      resetForm();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Unable to save customer.");
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
      <DialogTitle>{initialData ? "Edit Customer" : "Add Customer"}</DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 1 }}>
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

          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Service Plan"
              name="service_plan"
              value={form.service_plan || ""}
              onChange={handleChange}
              fullWidth
            >
              {SERVICE_PLANS.map((plan) => (
                <MenuItem key={plan} value={plan}>
                  {plan}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Service Day Override"
              name="service_day"
              value={form.service_day || ""}
              onChange={handleChange}
              fullWidth
              helperText="Changing ZIP will auto-suggest a day, but this box can override it."
            >
              <MenuItem value="">Unassigned</MenuItem>
              {SERVICE_DAYS.filter(Boolean).map((day) => (
                <MenuItem
                  key={day}
                  value={day}
                  disabled={form.second_service_day === day}
                >
                  {day}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {form.service_plan === "Relief Elite" && (
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Second Service Day"
                name="second_service_day"
                value={form.second_service_day || ""}
                onChange={handleChange}
                fullWidth
                helperText="Elite customers receive service twice per week."
              >
                <MenuItem value="">Select Day</MenuItem>

                {SERVICE_DAYS.filter(Boolean).map((day) => (
                  <MenuItem
                    key={day}
                    value={day}
                    disabled={day === form.service_day}
                  >
                    {day}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}

          <Grid item xs={12}>
  <PlacesAutocomplete
    value={form.address || ""}
    onPlaceSelected={handlePlaceSelected}
    label="Search Address"
  />
</Grid>

<Grid item xs={12} sm={8}>
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

<Grid item xs={12} sm={6}>
  <TextField
    label="State"
    name="state"
    value={form.state || ""}
    onChange={handleChange}
    fullWidth
  />
</Grid>

<Grid item xs={12} sm={6}>
  <TextField
    label="ZIP"
    name="zip"
    value={form.zip || ""}
    onChange={handleChange}
    fullWidth
  />
</Grid>

          <Grid item xs={12} sm={6}>
            <TextField label="Zone" value={form.zone || ""} fullWidth disabled />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Zone ID"
              value={form.zone_id || ""}
              fullWidth
              disabled
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!form.deodorizer_enabled}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      deodorizer_enabled: e.target.checked,
                      deodorizer_frequency: e.target.checked
                        ? prev.deodorizer_frequency || "monthly"
                        : "",
                      next_deodorizer_date: e.target.checked
                        ? prev.next_deodorizer_date ||
                          new Date().toISOString().slice(0, 10)
                        : "",
                    }))
                  }
                />
              }
              label="Yard Deodorizer Add-On"
            />
          </Grid>

          {form.deodorizer_enabled && (
            <>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Deodorizer Frequency"
                  value={form.deodorizer_frequency || "monthly"}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      deodorizer_frequency: e.target.value,
                    }))
                  }
                  fullWidth
                >
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="biweekly">Biweekly</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  type="date"
                  label="Next Deodorizer Date"
                  value={form.next_deodorizer_date || ""}
                  InputLabelProps={{ shrink: true }}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      next_deodorizer_date: e.target.value,
                    }))
                  }
                  fullWidth
                />
              </Grid>
            </>
          )}

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

        <Button onClick={handleSubmit} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={20} /> : initialData ? "Update" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}