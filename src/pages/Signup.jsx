import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  MenuItem,
  TextField,
  Typography,
  Alert,
  Stack,
  Divider,
} from "@mui/material";

import { supabase } from "../lib/supabase";
import { getServiceAreaResult } from "../lib/serviceArea";
import { PLANS, ADD_ONS } from "../config/pricing";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function isPriorityPlan(plan) {
  return plan === "Premium" || plan === "Elite";
}

function getRequiredServiceDayCount(plan) {
  if (plan === "Elite") return 2;
  return 1;
}

export default function Signup() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "CO",
    zip: "",
    plan: "Standard",
  });

  const [selectedDays, setSelectedDays] = useState([]);

  const [addOns, setAddOns] = useState(
    ADD_ONS.reduce((acc, item) => {
      acc[item.key] = false;
      return acc;
    }, {})
  );

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  const selectedPlan = PLANS.find((plan) => plan.key === form.plan);

  const priorityPlan = isPriorityPlan(form.plan);
  const requiredDayCount = getRequiredServiceDayCount(form.plan);

  const serviceAreaResult = useMemo(() => {
    if (!form.zip || !form.plan) return null;
    return getServiceAreaResult(form.zip, form.plan, selectedDays);
  }, [form.zip, form.plan, selectedDays]);

  const displayScheduleDays = useMemo(() => {
    if (!serviceAreaResult?.allowed) return [];

    if (priorityPlan && selectedDays.length > 0) {
      return selectedDays;
    }

    return serviceAreaResult.service_schedule?.days || [];
  }, [serviceAreaResult, priorityPlan, selectedDays]);

  const displayServiceSchedule = useMemo(() => {
    if (!serviceAreaResult?.service_schedule) return null;

    return {
      ...serviceAreaResult.service_schedule,
      days: displayScheduleDays,
      priority_scheduling: priorityPlan,
    };
  }, [serviceAreaResult, displayScheduleDays, priorityPlan]);

  const addOnTotal = ADD_ONS.reduce((total, item) => {
    return total + (addOns[item.key] ? item.price : 0);
  }, 0);

  const monthlyTotal = (selectedPlan?.price || 0) + addOnTotal;

  const hasValidPriorityDays =
    !priorityPlan || selectedDays.length === requiredDayCount;

  const canContinue =
    serviceAreaResult?.allowed && hasValidPriorityDays && !checkoutLoading;

  const handleChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (field === "plan") {
      setSelectedDays([]);
    }

    setCheckoutError("");
  };

  const handleAddOnChange = (key) => {
    setAddOns((current) => ({
      ...current,
      [key]: !current[key],
    }));

    setCheckoutError("");
  };

  const handleDayToggle = (day) => {
    setSelectedDays((current) => {
      if (current.includes(day)) {
        return current.filter((item) => item !== day);
      }

      if (current.length >= requiredDayCount) {
        return current;
      }

      return [...current, day];
    });

    setCheckoutError("");
  };

  const handleContinue = async () => {
  if (!canContinue) return;

  setCheckoutLoading(true);
  setCheckoutError("");

  try {
    const selectedAddOns = ADD_ONS.filter((item) => addOns[item.key]);

    const payload = {
      customer: form,
      plan: selectedPlan,
      selected_add_ons: selectedAddOns,
      zone: serviceAreaResult.zone,
      service_schedule: displayServiceSchedule,
      monthly_total: monthlyTotal,
    };

    console.log("CHECKOUT PAYLOAD:", payload);

    const { data, error } = await supabase.functions.invoke(
      "create-checkout-session",
      {
        body: payload,
      }
    );

    console.log("FUNCTION DATA:", data);
    console.log("FUNCTION ERROR:", error);

    if (error) {
      alert(JSON.stringify(error, null, 2));
      throw error;
    }

    if (!data?.url) {
      alert(JSON.stringify(data, null, 2));
      throw new Error("Stripe checkout URL was not returned.");
    }

    window.location.href = data.url;
  } catch (err) {
    console.error("CHECKOUT FAILURE:", err);

    setCheckoutError(
      err?.message || "Unable to start checkout. Please try again."
    );

    setCheckoutLoading(false);
  }
};

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: "auto" }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Join The Relief Club
      </Typography>

      <Typography variant="body1" sx={{ mb: 3 }}>
        Enter your address, choose your plan, and we’ll confirm your service
        area and assigned service day.
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "2fr 1fr",
          },
          gap: 3,
        }}
      >
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Customer Information
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "1fr 1fr",
                },
                gap: 2,
              }}
            >
              <TextField
                fullWidth
                label="First Name"
                value={form.first_name}
                onChange={(e) => handleChange("first_name", e.target.value)}
              />

              <TextField
                fullWidth
                label="Last Name"
                value={form.last_name}
                onChange={(e) => handleChange("last_name", e.target.value)}
              />

              <TextField
                fullWidth
                label="Phone"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
              />

              <TextField
                fullWidth
                label="Email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />
            </Box>

            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Street Address"
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
              />
            </Box>

            <Box
              sx={{
                mt: 2,
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "2fr 1fr 1fr",
                },
                gap: 2,
              }}
            >
              <TextField
                fullWidth
                label="City"
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
              />

              <TextField
                fullWidth
                label="State"
                value={form.state}
                onChange={(e) => handleChange("state", e.target.value)}
              />

              <TextField
                fullWidth
                label="ZIP Code"
                value={form.zip}
                onChange={(e) => handleChange("zip", e.target.value)}
              />
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Choose Your Plan
            </Typography>

            <TextField
              select
              fullWidth
              label="Membership Plan"
              value={form.plan}
              onChange={(e) => handleChange("plan", e.target.value)}
            >
              {PLANS.map((plan) => (
                <MenuItem key={plan.key} value={plan.key}>
                  {plan.name} — ${plan.price}/month
                </MenuItem>
              ))}
            </TextField>

            {priorityPlan && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Priority Scheduling
                </Typography>

                <Typography variant="body2" sx={{ mb: 1 }}>
                  {form.plan === "Premium"
                    ? "Premium members may choose 1 preferred service day."
                    : "Elite members may choose 2 preferred service days."}
                </Typography>

                <Stack>
                  {WEEKDAYS.map((day) => (
                    <FormControlLabel
                      key={day}
                      control={
                        <Checkbox
                          checked={selectedDays.includes(day)}
                          onChange={() => handleDayToggle(day)}
                          disabled={
                            !selectedDays.includes(day) &&
                            selectedDays.length >= requiredDayCount
                          }
                        />
                      }
                      label={day}
                    />
                  ))}
                </Stack>

                {!hasValidPriorityDays && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Please select exactly {requiredDayCount} service{" "}
                    {requiredDayCount === 1 ? "day" : "days"}.
                  </Alert>
                )}
              </Box>
            )}

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Add-On Services
            </Typography>

            <Stack>
              {ADD_ONS.map((item) => (
                <FormControlLabel
                  key={item.key}
                  control={
                    <Checkbox
                      checked={Boolean(addOns[item.key])}
                      onChange={() => handleAddOnChange(item.key)}
                    />
                  }
                  label={`${item.label} — $${item.price}/month`}
                />
              ))}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Signup Summary
            </Typography>

            {serviceAreaResult && (
              <Alert
                severity={serviceAreaResult.allowed ? "success" : "error"}
                sx={{ mb: 2 }}
              >
                {serviceAreaResult.allowed
                  ? "Great news! Backyard Relief services your area."
                  : serviceAreaResult.message}
              </Alert>
            )}

            {checkoutError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {checkoutError}
              </Alert>
            )}

            <Typography>
              <strong>Plan:</strong> {selectedPlan?.name}
            </Typography>

            <Typography>
              <strong>Base Price:</strong> ${selectedPlan?.price}/month
            </Typography>

            <Typography>
              <strong>Add-Ons:</strong> ${addOnTotal}/month
            </Typography>

            <Typography variant="h5" fontWeight="bold" sx={{ mt: 2 }}>
              Total: ${monthlyTotal}/month
            </Typography>

            {serviceAreaResult?.allowed && (
              <>
                <Divider sx={{ my: 2 }} />

                <Typography>
                  <strong>Zone:</strong> {serviceAreaResult.zone}
                </Typography>

                <Typography variant="body2" sx={{ fontWeight: "bold", mt: 1 }}>
                  {displayScheduleDays.length > 1
                    ? "Your service days are:"
                    : "Your service day is:"}
                </Typography>

                <Typography variant="h6" fontWeight="bold">
                  {displayScheduleDays.length > 0
                    ? displayScheduleDays.join(" & ")
                    : "Select service day"}
                </Typography>

                <Typography>
                  <strong>Frequency:</strong>{" "}
                  {displayServiceSchedule?.frequency}
                </Typography>

                {priorityPlan && (
                  <Typography>
                    <strong>Priority Scheduling:</strong> Included
                  </Typography>
                )}
              </>
            )}

            <Button
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3 }}
              disabled={!canContinue}
              onClick={handleContinue}
            >
              {checkoutLoading ? "Opening Checkout..." : "Continue to Checkout"}
            </Button>

            {!serviceAreaResult && (
              <Typography variant="body2" sx={{ mt: 2 }}>
                Enter your ZIP code to confirm service availability.
              </Typography>
            )}

            {serviceAreaResult?.allowed && !hasValidPriorityDays && (
              <Typography variant="body2" sx={{ mt: 2 }}>
                Select your preferred service{" "}
                {requiredDayCount === 1 ? "day" : "days"} to continue.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}