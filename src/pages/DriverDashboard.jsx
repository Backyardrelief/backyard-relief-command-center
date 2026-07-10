import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import useDriverGPS from "../hooks/useDriverGPS";
import { supabase } from "../lib/supabase";

const DRIVER_ID = "tech1";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function getTodayName() {
  return DAYS[new Date().getDay()];
}

function localDateOnly(dateValue = new Date()) {
  const date =
    dateValue instanceof Date
      ? dateValue
      : new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isToday(dateValue) {
  if (!dateValue) return false;

  return localDateOnly(dateValue) === localDateOnly();
}

function isActiveCustomer(customer) {
  return (
    String(customer.status || "").toLowerCase() === "active"
  );
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`);

  date.setDate(date.getDate() + days);

  return localDateOnly(date);
}

function getNextDeodorizerDate(frequency, fromDate) {
  const normalizedFrequency = String(
    frequency || ""
  ).toLowerCase();

  if (
    normalizedFrequency === "biweekly" ||
    normalizedFrequency === "twice_monthly"
  ) {
    return addDays(fromDate, 14);
  }

  return addDays(fromDate, 30);
}

function isDeodorizerDue(customer) {
  if (!customer.deodorizer_enabled) {
    return false;
  }

  if (!customer.next_deodorizer_date) {
    return true;
  }

  return (
    customer.next_deodorizer_date <= localDateOnly()
  );
}

function isCompletedToday(customer) {
  return (
    String(
      customer.last_service_status || ""
    ).toLowerCase() === "completed" &&
    isToday(customer.last_service_completed_at)
  );
}

function isEnRouteToday(customer) {
  return (
    String(
      customer.last_service_status || ""
    ).toLowerCase() === "en route" &&
    isToday(customer.last_service_started_at)
  );
}

function getDisplayStatus(customer) {
  if (isCompletedToday(customer)) {
    return "Completed";
  }

  if (isEnRouteToday(customer)) {
    return "En Route";
  }

  return "Pending";
}

function getStatusColor(status) {
  switch (status) {
    case "Completed":
      return "success";

    case "En Route":
      return "warning";

    default:
      return "default";
  }
}

function getRouteItemCustomerId(routeItem) {
  if (!routeItem) return null;

  if (typeof routeItem === "string") {
    return routeItem;
  }

  return (
    routeItem.customer_id ||
    routeItem.customerId ||
    routeItem.id ||
    null
  );
}

function sortCustomersByRoute(customers, routeValue) {
  if (!routeValue) {
    return customers;
  }

  let parsedRoute = routeValue;

  if (typeof parsedRoute === "string") {
    try {
      parsedRoute = JSON.parse(parsedRoute);
    } catch {
      return customers;
    }
  }

  if (!Array.isArray(parsedRoute)) {
    return customers;
  }

  const routeOrder = new Map();

  parsedRoute.forEach((routeItem, index) => {
    const customerId =
      getRouteItemCustomerId(routeItem);

    if (customerId) {
      routeOrder.set(String(customerId), index);
    }
  });

  return [...customers].sort((a, b) => {
    const aPosition =
      routeOrder.get(String(a.id)) ??
      Number.MAX_SAFE_INTEGER;

    const bPosition =
      routeOrder.get(String(b.id)) ??
      Number.MAX_SAFE_INTEGER;

    return aPosition - bPosition;
  });
}

function formatPercent(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

export default function DriverDashboard() {
  useDriverGPS(DRIVER_ID);

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [uploadingId, setUploadingId] =
    useState(null);

  const [updatingId, setUpdatingId] =
    useState(null);

  const [message, setMessage] = useState("");
  const [messageSeverity, setMessageSeverity] =
    useState("info");

  const [
    deodorizerApplied,
    setDeodorizerApplied,
  ] = useState({});

  const [
    completionCustomer,
    setCompletionCustomer,
  ] = useState(null);

  const [gateConfirmed, setGateConfirmed] =
    useState(false);

  const [completionDialogOpen, setCompletionDialogOpen] =
    useState(false);

  const today = getTodayName();

  useEffect(() => {
    loadCustomers();
  }, []);

  const showMessage = (
    text,
    severity = "info"
  ) => {
    setMessage(text);
    setMessageSeverity(severity);
  };

  const loadCustomers = async () => {
    setLoading(true);

    const [
      customerResponse,
      routeResponse,
    ] = await Promise.all([
      supabase
        .from("customers")
        .select("*")
        .eq("service_day", today),

      supabase
        .from("routes")
        .select("route")
        .eq("day", today)
        .maybeSingle(),
    ]);

    if (customerResponse.error) {
      console.error(customerResponse.error);

      showMessage(
        "Unable to load today's route.",
        "error"
      );

      setLoading(false);
      return;
    }

    if (routeResponse.error) {
      console.warn(
        "Route order could not be loaded:",
        routeResponse.error
      );
    }

    const activeCustomers = (
      customerResponse.data || []
    ).filter(isActiveCustomer);

    const orderedCustomers =
      sortCustomersByRoute(
        activeCustomers,
        routeResponse.data?.route
      );

    setCustomers(orderedCustomers);

    const defaultDeodorizerChecks = {};

    orderedCustomers.forEach((customer) => {
      defaultDeodorizerChecks[customer.id] =
        isDeodorizerDue(customer);
    });

    setDeodorizerApplied(
      defaultDeodorizerChecks
    );

    setLoading(false);
  };

  const completedCount = useMemo(
    () =>
      customers.filter(isCompletedToday).length,
    [customers]
  );

  const totalStops = customers.length;

  const remainingCount = Math.max(
    totalStops - completedCount,
    0
  );

  const progressPercentage =
    totalStops > 0
      ? formatPercent(
          (completedCount / totalStops) * 100
        )
      : 0;

  const nextPendingCustomer = useMemo(
    () =>
      customers.find(
        (customer) =>
          !isCompletedToday(customer)
      ) || null,
    [customers]
  );

  const updateCustomer = async (
    id,
    updates
  ) => {
    const { data, error } = await supabase
      .from("customers")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error(error);

      showMessage(
        "Something went wrong while updating the stop.",
        "error"
      );

      return null;
    }

    setCustomers((previousCustomers) =>
      previousCustomers.map((customer) =>
        customer.id === id
          ? {
              ...customer,
              ...data,
            }
          : customer
      )
    );

    return data;
  };

  const sendText = async (
    customer,
    type,
    extra = {}
  ) => {
    const { error } =
      await supabase.functions.invoke(
        "send-service-text",
        {
          body: {
            customer_id: customer.id,
            type,
            ...extra,
          },
        }
      );

    if (error) {
      console.error(error);

      showMessage(
        "The customer record was updated, but the text failed to send. Check the Supabase function logs.",
        "warning"
      );

      return false;
    }

    return true;
  };

  const handleOnTheWay = async (
    customer
  ) => {
    if (isCompletedToday(customer)) {
      showMessage(
        "This stop has already been completed today.",
        "warning"
      );

      return;
    }

    setUpdatingId(customer.id);

    const now = new Date().toISOString();

    const updatedCustomer =
      await updateCustomer(customer.id, {
        last_service_status: "En Route",
        last_service_started_at: now,
        last_on_the_way_text_sent_at: now,
      });

    if (!updatedCustomer) {
      setUpdatingId(null);
      return;
    }

    const textSent = await sendText(
      updatedCustomer,
      "on_the_way"
    );

    if (textSent) {
      showMessage(
        `On-the-way text sent to ${customer.first_name || "customer"}.`,
        "success"
      );
    }

    setUpdatingId(null);
  };

  const handlePhotoUpload = async (
    customer,
    file
  ) => {
    if (!file) return;

    setUploadingId(customer.id);

    const fileExt =
      file.name.split(".").pop() || "jpg";

    const filePath =
      `${customer.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } =
      await supabase.storage
        .from("gate-photos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

    if (uploadError) {
      console.error(uploadError);

      showMessage(
        "Gate photo upload failed.",
        "error"
      );

      setUploadingId(null);
      return;
    }

    const { data: publicUrlData } =
      supabase.storage
        .from("gate-photos")
        .getPublicUrl(filePath);

    const publicUrl =
      publicUrlData.publicUrl;

    const updatedCustomer =
      await updateCustomer(customer.id, {
        last_gate_photo_url: publicUrl,
        last_gate_photo_path: filePath,
      });

    if (!updatedCustomer) {
      setUploadingId(null);
      return;
    }

    showMessage(
      "Gate photo uploaded successfully.",
      "success"
    );

    setUploadingId(null);
  };

  const openCompletionDialog = (
    customer
  ) => {
    if (isCompletedToday(customer)) {
      showMessage(
        "This stop has already been completed today.",
        "warning"
      );

      return;
    }

    setCompletionCustomer(customer);
    setGateConfirmed(false);
    setCompletionDialogOpen(true);
  };

  const closeCompletionDialog = () => {
    if (updatingId) return;

    setCompletionDialogOpen(false);
    setCompletionCustomer(null);
    setGateConfirmed(false);
  };

  const handleComplete = async () => {
    const customer = completionCustomer;

    if (!customer) return;

    if (!gateConfirmed) {
      showMessage(
        "Confirm that the gate is securely closed before completing service.",
        "warning"
      );

      return;
    }

    if (isCompletedToday(customer)) {
      showMessage(
        "This stop has already been completed today.",
        "warning"
      );

      closeCompletionDialog();
      return;
    }

    setUpdatingId(customer.id);

    const completedAt =
      new Date().toISOString();

    const completedDate =
      localDateOnly(completedAt);

    const appliedDeodorizerNow =
      Boolean(customer.deodorizer_enabled) &&
      Boolean(
        deodorizerApplied[customer.id]
      );

    const customerUpdates = {
      last_service_status: "Completed",
      last_service_completed_at:
        completedAt,
      last_completed_text_sent_at:
        completedAt,
    };

    if (appliedDeodorizerNow) {
      customerUpdates.last_deodorizer_date =
        completedDate;

      customerUpdates.next_deodorizer_date =
        getNextDeodorizerDate(
          customer.deodorizer_frequency ||
            "monthly",
          completedDate
        );
    }

    const updatedCustomer =
      await updateCustomer(
        customer.id,
        customerUpdates
      );

    if (!updatedCustomer) {
      setUpdatingId(null);
      return;
    }

    const historyNotes = [
      customer.notes || null,

      appliedDeodorizerNow
        ? `Deodorizer applied. Next deodorizer due: ${customerUpdates.next_deodorizer_date}.`
        : null,

      customer.last_gate_photo_url
        ? "Closed gate photo captured."
        : "Gate confirmed closed. No photo was attached.",
    ]
      .filter(Boolean)
      .join("\n");

    const { error: historyError } =
      await supabase
        .from("service_history")
        .insert({
          customer_id: customer.id,
          service_date: completedDate,
          service_day: today,
          driver_id: DRIVER_ID,
          status: "completed",
          completed_at: completedAt,

          gate_photo_url:
            customer.last_gate_photo_url ||
            null,

          gate_photo_path:
            customer.last_gate_photo_path ||
            null,

          photo_url:
            customer.last_gate_photo_url ||
            null,

          notes: historyNotes || null,
        });

    if (historyError) {
      console.error(historyError);

      showMessage(
        "Service was marked complete, but the service-history record failed to save.",
        "warning"
      );

      setUpdatingId(null);
      closeCompletionDialog();
      return;
    }

    const textSent = await sendText(
      updatedCustomer,
      "completed",
      {
        gate_photo_url:
          updatedCustomer.last_gate_photo_url ||
          null,
      }
    );

    if (textSent) {
      showMessage(
        appliedDeodorizerNow
          ? "Service completed, deodorizer updated, history saved, and customer notified."
          : "Service completed, history saved, and customer notified.",
        "success"
      );
    }

    setUpdatingId(null);
    closeCompletionDialog();

    await loadCustomers();
  };

  const openNavigation = (customer) => {
    const destination =
      encodeURIComponent(
        [
          customer.address,
          customer.city,
          customer.state,
          customer.zip,
        ]
          .filter(Boolean)
          .join(", ")
      );

    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const callCustomer = (customer) => {
    if (!customer.phone) {
      showMessage(
        "No phone number is listed for this customer.",
        "warning"
      );

      return;
    }

    window.location.href =
      `tel:${customer.phone}`;
  };

  return (
    <Box
      sx={{
        p: {
          xs: 2,
          md: 3,
        },
      }}
    >
      <Typography
        variant="h4"
        fontWeight="bold"
        sx={{ mb: 0.5 }}
      >
        🚚 Driver Mode
      </Typography>

      <Typography
        color="text.secondary"
        sx={{ mb: 3 }}
      >
        Today: {today} • GPS tracking active
        for {DRIVER_ID}
      </Typography>

      {message && (
        <Alert
          severity={messageSeverity}
          sx={{ mb: 3 }}
          onClose={() => setMessage("")}
        >
          {message}
        </Alert>
      )}

      {!loading && totalStops > 0 && (
        <Paper
          sx={{
            p: {
              xs: 2,
              md: 3,
            },
            mb: 3,
            borderRadius: 3,
          }}
        >
          <Stack
            direction={{
              xs: "column",
              sm: "row",
            }}
            justifyContent="space-between"
            spacing={2}
          >
            <Box>
              <Typography
                variant="h6"
                fontWeight="bold"
              >
                Today&apos;s Route Progress
              </Typography>

              <Typography
                color="text.secondary"
              >
                {completedCount} of {totalStops}{" "}
                stops completed
              </Typography>
            </Box>

            <Chip
              label={`${progressPercentage}% Complete`}
              color={
                progressPercentage === 100
                  ? "success"
                  : "primary"
              }
              sx={{
                alignSelf: {
                  xs: "flex-start",
                  sm: "center",
                },
                fontWeight: "bold",
              }}
            />
          </Stack>

          <LinearProgress
            variant="determinate"
            value={progressPercentage}
            sx={{
              height: 12,
              borderRadius: 10,
              mt: 2,
              mb: 2,
            }}
          />

          <Stack
            direction={{
              xs: "column",
              sm: "row",
            }}
            spacing={{
              xs: 1,
              sm: 4,
            }}
          >
            <Typography>
              <strong>Completed:</strong>{" "}
              {completedCount}
            </Typography>

            <Typography>
              <strong>Remaining:</strong>{" "}
              {remainingCount}
            </Typography>

            <Typography>
              <strong>Next Stop:</strong>{" "}
              {nextPendingCustomer
                ? `${nextPendingCustomer.first_name || ""} ${nextPendingCustomer.last_name || ""}`.trim()
                : "Route complete"}
            </Typography>
          </Stack>
        </Paper>
      )}

      {loading && (
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
        >
          <CircularProgress size={24} />

          <Typography>
            Loading today&apos;s route...
          </Typography>
        </Stack>
      )}

      {!loading && customers.length === 0 && (
        <Paper
          sx={{
            p: 3,
            borderRadius: 3,
          }}
        >
          <Typography
            color="text.secondary"
          >
            No active customers are scheduled
            for today.
          </Typography>
        </Paper>
      )}

      <Stack spacing={2}>
        {customers.map(
          (customer, index) => {
            const deodorizerDue =
              isDeodorizerDue(customer);

            const displayStatus =
              getDisplayStatus(customer);

            const completed =
              displayStatus === "Completed";

            const busy =
              uploadingId === customer.id ||
              updatingId === customer.id;

            return (
              <Paper
                key={customer.id}
                sx={{
                  p: {
                    xs: 2,
                    md: 3,
                  },
                  borderRadius: 3,
                  opacity: completed
                    ? 0.72
                    : 1,
                  border: completed
                    ? 1
                    : "none",
                  borderColor: completed
                    ? "success.light"
                    : "transparent",
                }}
              >
                <Stack
                  direction={{
                    xs: "column",
                    sm: "row",
                  }}
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      Stop #{index + 1}
                    </Typography>

                    <Typography
                      variant="h6"
                      fontWeight="bold"
                    >
                      {customer.first_name}{" "}
                      {customer.last_name}
                    </Typography>

                    <Typography>
                      {customer.address}
                    </Typography>

                    <Typography
                      color="text.secondary"
                    >
                      {customer.city}
                      {customer.city ? ", " : ""}
                      {customer.state}{" "}
                      {customer.zip}
                    </Typography>
                  </Box>

                  <Stack
                    spacing={1}
                    alignItems={{
                      xs: "flex-start",
                      sm: "flex-end",
                    }}
                  >
                    <Chip
                      label={displayStatus}
                      color={getStatusColor(
                        displayStatus
                      )}
                    />

                    {customer.deodorizer_enabled && (
                      <Chip
                        label={
                          deodorizerDue
                            ? "🟣 Deodorizer Due"
                            : `Deodorizer Due ${
                                customer.next_deodorizer_date ||
                                ""
                              }`
                        }
                        color={
                          deodorizerDue
                            ? "secondary"
                            : "default"
                        }
                      />
                    )}
                  </Stack>
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Stack spacing={0.5}>
                  <Typography variant="body2">
                    <strong>Phone:</strong>{" "}
                    {customer.phone ||
                      "Not listed"}
                  </Typography>

                  <Typography variant="body2">
                    <strong>Plan:</strong>{" "}
                    {customer.service_plan ||
                      "Not listed"}
                  </Typography>

                  <Typography variant="body2">
                    <strong>Dogs:</strong>{" "}
                    {customer.dogs ||
                      "Not listed"}
                  </Typography>

                  {customer.dog_names && (
                    <Typography variant="body2">
                      <strong>
                        Dog Names:
                      </strong>{" "}
                      {customer.dog_names}
                    </Typography>
                  )}

                  <Typography variant="body2">
                    <strong>
                      Gate Code:
                    </strong>{" "}
                    {customer.gate_code ||
                      "None"}
                  </Typography>

                  <Typography variant="body2">
                    <strong>
                      Access Notes:
                    </strong>{" "}
                    {customer.access_instructions ||
                      "None"}
                  </Typography>

                  <Typography variant="body2">
                    <strong>Notes:</strong>{" "}
                    {customer.notes || "None"}
                  </Typography>
                </Stack>

                {customer.deodorizer_enabled && (
                  <Box sx={{ mt: 2 }}>
                    <Divider sx={{ mb: 2 }} />

                    <Typography
                      variant="subtitle2"
                      fontWeight="bold"
                    >
                      Deodorizer Service
                    </Typography>

                    <Typography variant="body2">
                      <strong>
                        Frequency:
                      </strong>{" "}
                      {customer.deodorizer_frequency ===
                      "biweekly"
                        ? "Twice Monthly / Biweekly"
                        : "Monthly"}
                    </Typography>

                    <Typography variant="body2">
                      <strong>
                        Last Applied:
                      </strong>{" "}
                      {customer.last_deodorizer_date ||
                        "Not yet"}
                    </Typography>

                    <Typography variant="body2">
                      <strong>Next Due:</strong>{" "}
                      {customer.next_deodorizer_date ||
                        "Due now"}
                    </Typography>

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={Boolean(
                            deodorizerApplied[
                              customer.id
                            ]
                          )}
                          disabled={
                            completed || busy
                          }
                          onChange={(event) =>
                            setDeodorizerApplied(
                              (previous) => ({
                                ...previous,
                                [customer.id]:
                                  event.target
                                    .checked,
                              })
                            )
                          }
                        />
                      }
                      label="Applied deodorizer today"
                    />
                  </Box>
                )}

                {customer.last_gate_photo_url && (
                  <Box sx={{ mt: 2 }}>
                    <Divider sx={{ mb: 2 }} />

                    <Typography
                      variant="body2"
                      fontWeight="bold"
                    >
                      Closed Gate Photo
                    </Typography>

                    <Box
                      component="img"
                      src={
                        customer.last_gate_photo_url
                      }
                      alt="Closed gate"
                      sx={{
                        mt: 1,
                        display: "block",
                        width: "100%",
                        maxWidth: 420,
                        maxHeight: 280,
                        objectFit: "cover",
                        borderRadius: 2,
                      }}
                    />
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />

                <Stack
                  direction="row"
                  spacing={1}
                  flexWrap="wrap"
                  useFlexGap
                >
                  <Button
                    variant="contained"
                    disabled={busy}
                    onClick={() =>
                      openNavigation(customer)
                    }
                  >
                    📍 Navigate
                  </Button>

                  <Button
                    variant="outlined"
                    disabled={
                      busy || !customer.phone
                    }
                    onClick={() =>
                      callCustomer(customer)
                    }
                  >
                    📞 Call
                  </Button>

                  <Button
                    variant="outlined"
                    disabled={busy || completed}
                    onClick={() =>
                      handleOnTheWay(customer)
                    }
                  >
                    {updatingId === customer.id
                      ? "Sending..."
                      : "💬 On My Way"}
                  </Button>

                  <Button
                    variant="outlined"
                    component="label"
                    disabled={busy || completed}
                  >
                    {uploadingId === customer.id
                      ? "Uploading..."
                      : customer.last_gate_photo_url
                      ? "📸 Replace Gate Photo"
                      : "📸 Add Gate Photo"}

                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(event) => {
                        const file =
                          event.target.files?.[0];

                        handlePhotoUpload(
                          customer,
                          file
                        );

                        event.target.value = "";
                      }}
                    />
                  </Button>

                  <Button
                    variant="contained"
                    color="success"
                    disabled={busy || completed}
                    onClick={() =>
                      openCompletionDialog(
                        customer
                      )
                    }
                  >
                    {completed
                      ? "✅ Completed"
                      : "✅ Complete Service"}
                  </Button>
                </Stack>
              </Paper>
            );
          }
        )}
      </Stack>

      <Dialog
        open={completionDialogOpen}
        onClose={closeCompletionDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Complete Service
        </DialogTitle>

        <DialogContent dividers>
          {completionCustomer && (
            <Stack spacing={2}>
              <Box>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                >
                  {
                    completionCustomer.first_name
                  }{" "}
                  {
                    completionCustomer.last_name
                  }
                </Typography>

                <Typography
                  color="text.secondary"
                >
                  {completionCustomer.address}
                </Typography>
              </Box>

              <Divider />

              <Typography>
                Confirm the stop details before
                saving service history and sending
                the completion notification.
              </Typography>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={gateConfirmed}
                    disabled={Boolean(updatingId)}
                    onChange={(event) =>
                      setGateConfirmed(
                        event.target.checked
                      )
                    }
                  />
                }
                label="I verified that the customer's gate is securely closed."
              />

              {completionCustomer.last_gate_photo_url ? (
                <Alert severity="success">
                  Closed gate photo is attached and
                  will be included with this service
                  record.
                </Alert>
              ) : (
                <Alert severity="warning">
                  No gate photo is currently attached.
                  You can still complete the stop after
                  confirming the gate is securely
                  closed.
                </Alert>
              )}

              {completionCustomer.deodorizer_enabled && (
                <Alert
                  severity={
                    deodorizerApplied[
                      completionCustomer.id
                    ]
                      ? "success"
                      : "info"
                  }
                >
                  {deodorizerApplied[
                    completionCustomer.id
                  ]
                    ? "Deodorizer will be recorded as applied today."
                    : "Deodorizer will not be recorded for this visit."}
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={closeCompletionDialog}
            disabled={Boolean(updatingId)}
          >
            Go Back
          </Button>

          <Button
            variant="contained"
            color="success"
            disabled={
              !gateConfirmed ||
              Boolean(updatingId)
            }
            onClick={handleComplete}
          >
            {updatingId ? (
              <>
                <CircularProgress
                  size={18}
                  sx={{ mr: 1 }}
                />
                Completing...
              </>
            ) : (
              "Complete & Notify Customer"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}