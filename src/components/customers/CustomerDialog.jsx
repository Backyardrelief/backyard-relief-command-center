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
import { INTERNAL_WORKING_DAYS } from "../../lib/serviceArea";

const SERVICE_PLANS = [
  "Basic Relief",
  "Standard Relief",
  "Relief Plus",
  "Relief Premium",
  "Relief Elite",
];

const SERVICE_DAYS = INTERNAL_WORKING_DAYS;

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

const sortServiceDays = (days) => {
  return [...new Set(days)]
    .filter((day) => SERVICE_DAYS.includes(day))
    .sort(
      (a, b) =>
        SERVICE_DAYS.indexOf(a) -
        SERVICE_DAYS.indexOf(b)
    );
};

const getExistingServiceDays = (customer) => {
  if (!customer) {
    return [];
  }

  if (
    Array.isArray(customer.service_days) &&
    customer.service_days.length > 0
  ) {
    return sortServiceDays(customer.service_days);
  }

  const legacyDays = [
    customer.service_day,
    customer.second_service_day,
  ].filter(Boolean);

  return sortServiceDays(legacyDays);
};

const getDefaultSecondDay = (primaryDay) => {
  return (
    SERVICE_DAYS.find(
      (day) => day !== primaryDay
    ) || ""
  );
};

const getDeodorizerSettingsFromPlan = (plan) => {
  if (plan === "Relief Plus") {
    return {
      deodorizer_enabled: true,
      deodorizer_frequency: "monthly",
    };
  }

  if (
    plan === "Relief Premium" ||
    plan === "Relief Elite"
  ) {
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

export default function CustomerDialog({
  open,
  onClose,
  onSave,
  initialData,
}) {
  const [form, setForm] =
    useState(defaultForm);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [lockedData, setLockedData] =
    useState(null);

  useEffect(() => {
    if (open) {
      setLockedData(initialData || null);
    }
  }, [open, initialData]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const data = lockedData;

    if (data) {
      const existingDays =
        getExistingServiceDays(data);

      const primaryDay =
        existingDays[0] ||
        data.service_day ||
        "";

      const secondDay =
        existingDays[1] ||
        data.second_service_day ||
        "";

      setForm({
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        phone: data.phone || "",
        email: data.email || "",

        service_plan:
          data.service_plan ||
          "Relief Plus",

        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        zip: data.zip || "",

        lat: data.lat ?? null,
        lng: data.lng ?? null,

        zone: data.zone || "",
        zone_id: data.zone_id || "",

        service_day: primaryDay,

        second_service_day:
          data.service_plan ===
          "Relief Elite"
            ? secondDay
            : "",

        dog_names:
          data.dog_names || "",

        gate_code:
          data.gate_code || "",

        access_instructions:
          data.access_instructions || "",

        notes:
          data.notes || "",

        deodorizer_enabled:
          data.deodorizer_enabled ??
          false,

        deodorizer_frequency:
          data.deodorizer_frequency ||
          "monthly",

        last_deodorizer_date:
          data.last_deodorizer_date ||
          "",

        next_deodorizer_date:
          data.next_deodorizer_date ||
          "",
      });
    } else {
      setForm({
        ...defaultForm,
      });
    }

    setError("");
  }, [open, lockedData]);

  const applyZoneAssignment = (zip) => {
    return getZoneAssignment(zip);
  };

  const handleChange = (event) => {
    const { name, value } =
      event.target;

    if (name === "zip") {
      const assignment =
        applyZoneAssignment(value);

      setForm((previousForm) => {
        const suggestedDay =
          assignment.service_day || "";

        let secondDay =
          previousForm.second_service_day;

        if (
          previousForm.service_plan ===
            "Relief Elite" &&
          secondDay === suggestedDay
        ) {
          secondDay =
            getDefaultSecondDay(
              suggestedDay
            );
        }

        return {
          ...previousForm,
          zip: value,
          zone:
            assignment.zone || "",
          zone_id:
            assignment.zone_id || "",
          service_day: suggestedDay,
          second_service_day:
            previousForm.service_plan ===
            "Relief Elite"
              ? secondDay
              : "",
        };
      });

      return;
    }

    if (name === "service_plan") {
      const deodorizerSettings =
        getDeodorizerSettingsFromPlan(
          value
        );

      setForm((previousForm) => {
        let secondDay = "";

        if (value === "Relief Elite") {
          secondDay =
            previousForm.second_service_day;

          if (
            !secondDay ||
            secondDay ===
              previousForm.service_day
          ) {
            secondDay =
              getDefaultSecondDay(
                previousForm.service_day
              );
          }
        }

        return {
          ...previousForm,
          service_plan: value,
          ...deodorizerSettings,

          second_service_day:
            secondDay,

          next_deodorizer_date:
            deodorizerSettings.deodorizer_enabled
              ? previousForm.next_deodorizer_date ||
                new Date()
                  .toISOString()
                  .slice(0, 10)
              : "",
        };
      });

      return;
    }

    if (name === "service_day") {
      setForm((previousForm) => {
        let secondDay =
          previousForm.second_service_day;

        if (
          previousForm.service_plan ===
            "Relief Elite" &&
          secondDay === value
        ) {
          secondDay =
            getDefaultSecondDay(value);
        }

        return {
          ...previousForm,
          service_day: value,
          second_service_day:
            secondDay,
        };
      });

      return;
    }

    if (
      name === "second_service_day"
    ) {
      setForm((previousForm) => ({
        ...previousForm,
        second_service_day: value,
      }));

      return;
    }

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  };

  const handlePlaceSelected = (place) => {
    const assignment =
      applyZoneAssignment(place.zip);

    setForm((previousForm) => {
      const suggestedDay =
        assignment.service_day || "";

      let secondDay =
        previousForm.second_service_day;

      if (
        previousForm.service_plan ===
          "Relief Elite" &&
        secondDay === suggestedDay
      ) {
        secondDay =
          getDefaultSecondDay(
            suggestedDay
          );
      }

      return {
        ...previousForm,
        ...place,

        zone:
          assignment.zone || "",

        zone_id:
          assignment.zone_id || "",

        service_day:
          suggestedDay,

        second_service_day:
          previousForm.service_plan ===
          "Relief Elite"
            ? secondDay
            : "",
      };
    });
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

    if (!form.service_day) {
      return "Please select a service day.";
    }

    if (
      !SERVICE_DAYS.includes(
        form.service_day
      )
    ) {
      return "Please select a valid service day.";
    }

    if (
      form.service_plan ===
      "Relief Elite"
    ) {
      if (!form.second_service_day) {
        return "Elite customers need a second service day.";
      }

      if (
        !SERVICE_DAYS.includes(
          form.second_service_day
        )
      ) {
        return "Please select a valid second service day.";
      }

      if (
        form.service_day ===
        form.second_service_day
      ) {
        return "The second service day must be different from the primary service day.";
      }
    }

    return "";
  };

  const resetForm = () => {
    setForm({
      ...defaultForm,
    });

    setError("");
  };

  const handleSubmit = async () => {
    const validationError =
      validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");

    try {
      const assignment =
        applyZoneAssignment(form.zip);

      const selectedServiceDays =
        form.service_plan ===
        "Relief Elite"
          ? sortServiceDays([
              form.service_day,
              form.second_service_day,
            ])
          : [form.service_day];

      const primaryServiceDay =
        selectedServiceDays[0] ||
        form.service_day ||
        assignment.service_day ||
        null;

      const customerData = {
        first_name:
          (form.first_name || "").trim(),

        last_name:
          (form.last_name || "").trim(),

        phone:
          (form.phone || "").trim(),

        email:
          (form.email || "").trim(),

        service_plan:
          form.service_plan ||
          "Relief Plus",

        address:
          (form.address || "").trim(),

        city:
          (form.city || "").trim(),

        state:
          (form.state || "").trim(),

        zip:
          (form.zip || "").trim(),

        zone:
          assignment.zone ||
          form.zone ||
          "",

        zone_id:
          assignment.zone_id ||
          form.zone_id ||
          "",

        service_day:
          primaryServiceDay,

        service_days:
          selectedServiceDays,

        dog_names:
          (form.dog_names || "").trim(),

        gate_code:
          (form.gate_code || "").trim(),

        access_instructions:
          (
            form.access_instructions ||
            ""
          ).trim(),

        notes:
          (form.notes || "").trim(),

        deodorizer_enabled:
          Boolean(
            form.deodorizer_enabled
          ),

        deodorizer_frequency:
          form.deodorizer_enabled
            ? form.deodorizer_frequency ||
              "monthly"
            : null,

        last_deodorizer_date:
          form.last_deodorizer_date ||
          null,

        next_deodorizer_date:
          form.deodorizer_enabled
            ? form.next_deodorizer_date ||
              null
            : null,

        lat:
          form.lat != null &&
          form.lat !== ""
            ? Number(form.lat)
            : null,

        lng:
          form.lng != null &&
          form.lng !== ""
            ? Number(form.lng)
            : null,
      };

      await onSave(customerData);

      resetForm();
      onClose();
    } catch (error) {
      console.error(
        "Customer save error:",
        error
      );

      setError(
        error?.message ||
          "Unable to save customer."
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
    <Dialog
      open={open}
      onClose={handleCancel}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          width: {
            xs: "calc(100% - 24px)",
            sm: "100%",
          },
          m: {
            xs: 1.5,
            sm: 4,
          },
        },
      }}
    >
      <DialogTitle>
        {initialData
          ? "Edit Customer"
          : "Add Customer"}
      </DialogTitle>

      <DialogContent dividers>
        <Grid
          container
          spacing={2}
          sx={{ mt: 0 }}
        >
          <Grid item xs={12} sm={6}>
            <TextField
              label="First Name"
              name="first_name"
              value={
                form.first_name || ""
              }
              onChange={handleChange}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Last Name"
              name="last_name"
              value={
                form.last_name || ""
              }
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
              value={
                form.service_plan || ""
              }
              onChange={handleChange}
              fullWidth
            >
              {SERVICE_PLANS.map(
                (plan) => (
                  <MenuItem
                    key={plan}
                    value={plan}
                  >
                    {plan}
                  </MenuItem>
                )
              )}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              select
              label={
                form.service_plan ===
                "Relief Elite"
                  ? "First Service Day"
                  : "Service Day Override"
              }
              name="service_day"
              value={
                form.service_day || ""
              }
              onChange={handleChange}
              fullWidth
              helperText="Changing the ZIP auto-suggests a weekday, but you may override it manually."
            >
              <MenuItem value="">
                Unassigned
              </MenuItem>

              {SERVICE_DAYS.map(
                (day) => (
                  <MenuItem
                    key={day}
                    value={day}
                    disabled={
                      form.service_plan ===
                        "Relief Elite" &&
                      form.second_service_day ===
                        day
                    }
                  >
                    {day}
                  </MenuItem>
                )
              )}
            </TextField>
          </Grid>

          {form.service_plan ===
            "Relief Elite" && (
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Second Service Day"
                name="second_service_day"
                value={
                  form.second_service_day ||
                  ""
                }
                onChange={handleChange}
                fullWidth
                helperText="Elite customers receive service on two different days each week."
              >
                <MenuItem value="">
                  Select Day
                </MenuItem>

                {SERVICE_DAYS.map(
                  (day) => (
                    <MenuItem
                      key={day}
                      value={day}
                      disabled={
                        day ===
                        form.service_day
                      }
                    >
                      {day}
                    </MenuItem>
                  )
                )}
              </TextField>
            </Grid>
          )}

          <Grid item xs={12}>
            <PlacesAutocomplete
              value={form.address || ""}
              onPlaceSelected={
                handlePlaceSelected
              }
              label="Search Address"
            />
          </Grid>

          <Grid item xs={12} sm={8}>
            <TextField
              label="Address"
              name="address"
              value={
                form.address || ""
              }
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
            <TextField
              label="Zone"
              value={form.zone || ""}
              fullWidth
              disabled
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Zone ID"
              value={
                form.zone_id || ""
              }
              fullWidth
              disabled
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={Boolean(
                    form.deodorizer_enabled
                  )}
                  onChange={(event) =>
                    setForm(
                      (previousForm) => ({
                        ...previousForm,

                        deodorizer_enabled:
                          event.target
                            .checked,

                        deodorizer_frequency:
                          event.target
                            .checked
                            ? previousForm.deodorizer_frequency ||
                              "monthly"
                            : "",

                        next_deodorizer_date:
                          event.target
                            .checked
                            ? previousForm.next_deodorizer_date ||
                              new Date()
                                .toISOString()
                                .slice(
                                  0,
                                  10
                                )
                            : "",
                      })
                    )
                  }
                />
              }
              label="Yard Deodorizer Add-On"
            />
          </Grid>

          {form.deodorizer_enabled && (
            <>
              <Grid
                item
                xs={12}
                sm={6}
              >
                <TextField
                  select
                  label="Deodorizer Frequency"
                  value={
                    form.deodorizer_frequency ||
                    "monthly"
                  }
                  onChange={(event) =>
                    setForm(
                      (
                        previousForm
                      ) => ({
                        ...previousForm,
                        deodorizer_frequency:
                          event.target
                            .value,
                      })
                    )
                  }
                  fullWidth
                >
                  <MenuItem value="monthly">
                    Monthly
                  </MenuItem>

                  <MenuItem value="biweekly">
                    Biweekly
                  </MenuItem>
                </TextField>
              </Grid>

              <Grid
                item
                xs={12}
                sm={6}
              >
                <TextField
                  type="date"
                  label="Next Deodorizer Date"
                  value={
                    form.next_deodorizer_date ||
                    ""
                  }
                  InputLabelProps={{
                    shrink: true,
                  }}
                  onChange={(event) =>
                    setForm(
                      (
                        previousForm
                      ) => ({
                        ...previousForm,
                        next_deodorizer_date:
                          event.target
                            .value,
                      })
                    )
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
              value={
                form.dog_names || ""
              }
              onChange={handleChange}
              fullWidth
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Gate Code"
              name="gate_code"
              value={
                form.gate_code || ""
              }
              onChange={handleChange}
              fullWidth
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Access Instructions"
              name="access_instructions"
              value={
                form.access_instructions ||
                ""
              }
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
              <Alert severity="error">
                {error}
              </Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
        }}
      >
        <Button
          onClick={handleCancel}
          disabled={saving}
        >
          Cancel
        </Button>

        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={saving}
        >
          {saving ? (
            <CircularProgress
              size={20}
            />
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