import { useMemo, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { supabase } from "../lib/supabase";

import {
  getRequiredServiceDayCount,
  getServiceAreaResult,
  isPriorityPlan,
  PRIORITY_SIGNUP_DAYS,
} from "../lib/serviceArea";

import { PLANS, ADD_ONS } from "../config/pricing";
import PlacesAutocomplete from "../maps/components/PlacesAutocomplete";

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
    lat: null,
    lng: null,
    plan: "Standard",
    sms_consent: false,
  });

  const [selectedDays, setSelectedDays] = useState([]);

  const [addOns, setAddOns] = useState(
    ADD_ONS.reduce((accumulator, item) => {
      accumulator[item.key] = false;
      return accumulator;
    }, {})
  );

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  const selectedPlan = PLANS.find((plan) => plan.key === form.plan);

  const priorityPlan = isPriorityPlan(form.plan);

  const requiredDayCount = getRequiredServiceDayCount(form.plan);

  const serviceAreaResult = useMemo(() => {
    const cleanZip = String(form.zip || "").trim().slice(0, 5);

    if (cleanZip.length < 5 || !form.plan) {
      return null;
    }

    return getServiceAreaResult(
      cleanZip,
      form.plan,
      selectedDays
    );
  }, [form.zip, form.plan, selectedDays]);

  const displayScheduleDays = useMemo(() => {
    if (!serviceAreaResult?.allowed) {
      return [];
    }

    if (priorityPlan) {
      return selectedDays;
    }

    return serviceAreaResult.service_schedule?.days || [];
  }, [
    serviceAreaResult,
    priorityPlan,
    selectedDays,
  ]);

  const displayServiceSchedule = useMemo(() => {
    if (!serviceAreaResult?.service_schedule) {
      return null;
    }

    return {
      ...serviceAreaResult.service_schedule,
      days: displayScheduleDays,
      priority_scheduling: priorityPlan,
    };
  }, [
    serviceAreaResult,
    displayScheduleDays,
    priorityPlan,
  ]);

  const addOnTotal = ADD_ONS.reduce((total, item) => {
    return total + (addOns[item.key] ? item.price : 0);
  }, 0);

  const monthlyTotal =
    (selectedPlan?.price || 0) + addOnTotal;

  const hasValidPriorityDays =
    !priorityPlan ||
    selectedDays.length === requiredDayCount;

  const hasRequiredCustomerInfo =
    form.first_name.trim() &&
    form.last_name.trim() &&
    form.phone.trim() &&
    form.email.trim() &&
    form.address.trim() &&
    form.city.trim() &&
    form.state.trim() &&
    form.zip.trim().length >= 5;

  const canContinue =
    Boolean(hasRequiredCustomerInfo) &&
    Boolean(serviceAreaResult?.allowed) &&
    hasValidPriorityDays &&
    form.sms_consent &&
    !checkoutLoading;

  const handleChange = (field, value) => {
    let nextValue = value;

    if (field === "zip") {
      nextValue = String(value)
        .replace(/\D/g, "")
        .slice(0, 5);
    }

    setForm((current) => ({
      ...current,
      [field]: nextValue,
    }));

    if (field === "plan") {
      setSelectedDays([]);
    }

    setCheckoutError("");
  };

  const handleAddressSelected = (addressData) => {
    setForm((current) => ({
      ...current,
      address:
        addressData.address ||
        addressData.street ||
        "",
      city: addressData.city || "",
      state: addressData.state || "CO",
      zip: String(addressData.zip || "")
        .replace(/\D/g, "")
        .slice(0, 5),
      lat: addressData.lat ?? null,
      lng: addressData.lng ?? null,
    }));

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
        return current.filter(
          (selectedDay) => selectedDay !== day
        );
      }

      if (current.length >= requiredDayCount) {
        return current;
      }

      return [...current, day];
    });

    setCheckoutError("");
  };

  const handleContinue = async () => {
    if (!canContinue) {
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError("");

    try {
      const selectedAddOns = ADD_ONS.filter(
        (item) => addOns[item.key]
      );

      const payload = {
        customer: {
          ...form,
          zip: String(form.zip || "")
            .trim()
            .slice(0, 5),
          sms_consent: form.sms_consent,
          sms_consent_source: "website_signup",
          sms_consent_timestamp:
            new Date().toISOString(),
        },

        plan: selectedPlan,

        selected_add_ons: selectedAddOns,

        zone: serviceAreaResult.zone,

        service_schedule: displayServiceSchedule,

        monthly_total: monthlyTotal,
      };

      console.log("CHECKOUT PAYLOAD:", payload);

      const { data, error } =
        await supabase.functions.invoke(
          "create-checkout-session",
          {
            body: payload,
          }
        );

      console.log("FUNCTION DATA:", data);
      console.log("FUNCTION ERROR:", error);

      if (error) {
        throw error;
      }

      if (!data?.url) {
        throw new Error(
          "Stripe checkout URL was not returned."
        );
      }

      window.location.assign(data.url);
    } catch (error) {
      console.error("CHECKOUT FAILURE:", error);

      setCheckoutError(
        error?.message ||
          "Unable to start checkout. Please try again."
      );

      setCheckoutLoading(false);
    }
  };

  return (
    <Box
      sx={{
        p: {
          xs: 2,
          sm: 3,
        },
        maxWidth: 1100,
        mx: "auto",
        position: "relative",
        zIndex: 1,
      }}
    >
      <Typography
        variant="h4"
        fontWeight="bold"
        gutterBottom
      >
        Join The Relief Club
      </Typography>

      <Typography
        variant="body1"
        sx={{ mb: 3 }}
      >
        Enter your address, choose your plan, and
        we’ll confirm your service area and assigned
        service day.
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
            <Typography
              variant="h6"
              fontWeight="bold"
              gutterBottom
            >
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
                required
                label="First Name"
                value={form.first_name}
                onChange={(event) =>
                  handleChange(
                    "first_name",
                    event.target.value
                  )
                }
              />

              <TextField
                fullWidth
                required
                label="Last Name"
                value={form.last_name}
                onChange={(event) =>
                  handleChange(
                    "last_name",
                    event.target.value
                  )
                }
              />

              <TextField
                fullWidth
                required
                label="Phone"
                type="tel"
                value={form.phone}
                onChange={(event) =>
                  handleChange(
                    "phone",
                    event.target.value
                  )
                }
              />

              <TextField
                fullWidth
                required
                label="Email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  handleChange(
                    "email",
                    event.target.value
                  )
                }
              />
            </Box>

            <Box sx={{ mt: 2 }}>
              <PlacesAutocomplete
                value={form.address}
                onChange={handleAddressSelected}
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
                required
                label="City"
                value={form.city}
                onChange={(event) =>
                  handleChange(
                    "city",
                    event.target.value
                  )
                }
              />

              <TextField
                fullWidth
                required
                label="State"
                value={form.state}
                onChange={(event) =>
                  handleChange(
                    "state",
                    event.target.value
                  )
                }
              />

              <TextField
                fullWidth
                required
                label="ZIP Code"
                value={form.zip}
                inputProps={{
                  inputMode: "numeric",
                  maxLength: 5,
                }}
                onChange={(event) =>
                  handleChange(
                    "zip",
                    event.target.value
                  )
                }
              />
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography
              variant="h6"
              fontWeight="bold"
              gutterBottom
            >
              Choose Your Plan
            </Typography>

            <TextField
              select
              fullWidth
              label="Membership Plan"
              value={form.plan}
              onChange={(event) =>
                handleChange(
                  "plan",
                  event.target.value
                )
              }
            >
              {PLANS.map((plan) => (
                <MenuItem
                  key={plan.key}
                  value={plan.key}
                >
                  {plan.name} — ${plan.price}/month
                </MenuItem>
              ))}
            </TextField>

            {priorityPlan && (
              <Box sx={{ mt: 3 }}>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  gutterBottom
                >
                  Priority Scheduling
                </Typography>

                <Typography
                  variant="body2"
                  sx={{ mb: 1 }}
                >
                  {form.plan === "Premium"
                    ? "Premium members may choose 1 preferred service day, including Saturday."
                    : "Elite members may choose 2 preferred service days, including Saturday."}
                </Typography>

                <Stack>
                  {PRIORITY_SIGNUP_DAYS.map(
                    (day) => (
                      <FormControlLabel
                        key={day}
                        control={
                          <Checkbox
                            checked={selectedDays.includes(
                              day
                            )}
                            onChange={() =>
                              handleDayToggle(day)
                            }
                            disabled={
                              !selectedDays.includes(
                                day
                              ) &&
                              selectedDays.length >=
                                requiredDayCount
                            }
                          />
                        }
                        label={day}
                      />
                    )
                  )}
                </Stack>

                {!hasValidPriorityDays && (
                  <Alert
                    severity="info"
                    sx={{ mt: 1 }}
                  >
                    Please select exactly{" "}
                    {requiredDayCount} service{" "}
                    {requiredDayCount === 1
                      ? "day"
                      : "days"}
                    .
                  </Alert>
                )}
              </Box>
            )}

            <Divider sx={{ my: 3 }} />

            <Typography
              variant="h6"
              fontWeight="bold"
              gutterBottom
            >
              Add-On Services
            </Typography>

            <Stack>
              {ADD_ONS.map((item) => (
                <FormControlLabel
                  key={item.key}
                  control={
                    <Checkbox
                      checked={Boolean(
                        addOns[item.key]
                      )}
                      onChange={() =>
                        handleAddOnChange(item.key)
                      }
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
            <Typography
              variant="h6"
              fontWeight="bold"
              gutterBottom
            >
              Signup Summary
            </Typography>

            {serviceAreaResult && (
              <Alert
                severity={
                  serviceAreaResult.allowed
                    ? "success"
                    : "error"
                }
                sx={{ mb: 2 }}
              >
                {serviceAreaResult.allowed
                  ? "Great news! Backyard Relief services your area."
                  : serviceAreaResult.message}
              </Alert>
            )}

            {checkoutError && (
              <Alert
                severity="error"
                sx={{ mb: 2 }}
              >
                {checkoutError}
              </Alert>
            )}

            <Typography>
              <strong>Plan:</strong>{" "}
              {selectedPlan?.name}
            </Typography>

            <Typography>
              <strong>Base Price:</strong> $
              {selectedPlan?.price}/month
            </Typography>

            <Typography>
              <strong>Add-Ons:</strong> $
              {addOnTotal}/month
            </Typography>

            <Typography
              variant="h5"
              fontWeight="bold"
              sx={{ mt: 2 }}
            >
              Total: ${monthlyTotal}/month
            </Typography>

            {serviceAreaResult?.allowed && (
              <>
                <Divider sx={{ my: 2 }} />

                <Typography>
                  <strong>Zone:</strong>{" "}
                  {serviceAreaResult.zone}
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: "bold",
                    mt: 1,
                  }}
                >
                  {displayScheduleDays.length > 1
                    ? "Your service days are:"
                    : "Your service day is:"}
                </Typography>

                <Typography
                  variant="h6"
                  fontWeight="bold"
                >
                  {displayScheduleDays.length > 0
                    ? displayScheduleDays.join(
                        " & "
                      )
                    : "Select service day"}
                </Typography>

                <Typography>
                  <strong>Frequency:</strong>{" "}
                  {displayServiceSchedule?.frequency ||
                    "Weekly"}
                </Typography>

                {priorityPlan && (
                  <Typography>
                    <strong>
                      Priority Scheduling:
                    </strong>{" "}
                    Included
                  </Typography>
                )}
              </>
            )}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ width: "100%" }}>
              <FormControlLabel
                sx={{
                  alignItems: "flex-start",
                  width: "100%",
                  m: 0,
                }}
                control={
                  <Checkbox
                    checked={Boolean(
                      form.sms_consent
                    )}
                    onChange={(event) =>
                      handleChange(
                        "sms_consent",
                        event.target.checked
                      )
                    }
                  />
                }
                label={
                  <Typography
                    variant="body2"
                    sx={{ lineHeight: 1.45 }}
                  >
                    I agree to receive
                    service-related text messages from
                    Backyard Relief Pet Waste
                    Solutions, including arrival
                    notifications, service completion
                    notifications, scheduling updates,
                    gate access confirmations, and
                    account-related communications.
                    Message frequency varies. Message
                    and data rates may apply. Reply
                    HELP for help and STOP to opt out.
                  </Typography>
                }
              />

              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                sx={{
                  mt: 1,
                  mb: 2,
                  overflowWrap: "anywhere",
                }}
              >
                Privacy Policy:
                https://www.backyardrelief.com/home/privacy
                <br />
                Terms &amp; Conditions:
                https://www.backyardrelief.com/home/terms-of-service
              </Typography>
            </Box>

            <Button
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 1 }}
              disabled={!canContinue}
              onClick={handleContinue}
            >
              {checkoutLoading
                ? "Opening Checkout..."
                : "Continue to Checkout"}
            </Button>

            {!serviceAreaResult && (
              <Typography
                variant="body2"
                sx={{ mt: 2 }}
              >
                Enter your ZIP code to confirm
                service availability.
              </Typography>
            )}

            {serviceAreaResult?.allowed &&
              !hasValidPriorityDays && (
                <Typography
                  variant="body2"
                  sx={{ mt: 2 }}
                >
                  Select your preferred service{" "}
                  {requiredDayCount === 1
                    ? "day"
                    : "days"}{" "}
                  to continue.
                </Typography>
              )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}