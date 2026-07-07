import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  Divider,
  Chip,
  Alert,
  Checkbox,
  FormControlLabel,
} from "@mui/material";

import useDriverGPS from "../hooks/useDriverGPS";
import { supabase } from "../lib/supabase";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getTodayName() {
  return DAYS[new Date().getDay()];
}

function isActiveCustomer(customer) {
  return String(customer.status || "").toLowerCase() === "active";
}

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getNextDeodorizerDate(frequency, fromDate) {
  if (frequency === "biweekly") return addDays(fromDate, 14);
  return addDays(fromDate, 30);
}

function isDeodorizerDue(customer) {
  if (!customer.deodorizer_enabled) return false;
  if (!customer.next_deodorizer_date) return true;
  return customer.next_deodorizer_date <= todayDateOnly();
}

export default function DriverDashboard() {
  useDriverGPS("tech1");

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);
  const [message, setMessage] = useState("");
  const [deodorizerApplied, setDeodorizerApplied] = useState({});

  const today = getTodayName();

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("service_day", today);

    if (error) {
      console.error(error);
      setMessage("Unable to load today's route.");
      setLoading(false);
      return;
    }

    const activeCustomers = (data || []).filter(isActiveCustomer);

    setCustomers(activeCustomers);

    const defaultDeodorizerChecks = {};
    activeCustomers.forEach((customer) => {
      defaultDeodorizerChecks[customer.id] = isDeodorizerDue(customer);
    });

    setDeodorizerApplied(defaultDeodorizerChecks);
    setLoading(false);
  };

  const updateCustomer = async (id, updates) => {
    const { error } = await supabase
      .from("customers")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error(error);
      setMessage("Something went wrong updating the stop.");
      return false;
    }

    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );

    return true;
  };

  const sendText = async (customer, type, extra = {}) => {
    const { error } = await supabase.functions.invoke("send-service-text", {
      body: {
        customer_id: customer.id,
        type,
        ...extra,
      },
    });

    if (error) {
      console.error(error);
      setMessage("Text failed to send. Check Supabase function logs.");
      return false;
    }

    setMessage(
      type === "on_the_way"
        ? "On-the-way text sent."
        : "Service completed text sent."
    );

    return true;
  };

  const handleOnTheWay = async (customer) => {
    const now = new Date().toISOString();

    await updateCustomer(customer.id, {
      last_service_status: "En Route",
      last_service_started_at: now,
      last_on_the_way_text_sent_at: now,
    });

    await sendText(customer, "on_the_way");
  };

  const handlePhotoUpload = async (customer, file) => {
    if (!file) return;

    setUploadingId(customer.id);

    const fileExt = file.name.split(".").pop() || "jpg";
    const filePath = `${customer.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("gate-photos")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error(uploadError);
      setMessage("Gate photo upload failed.");
      setUploadingId(null);
      return;
    }

    const { data } = supabase.storage
      .from("gate-photos")
      .getPublicUrl(filePath);

    const publicUrl = data.publicUrl;

    const ok = await updateCustomer(customer.id, {
      last_gate_photo_url: publicUrl,
      last_gate_photo_path: filePath,
    });

    if (!ok) {
      setUploadingId(null);
      return;
    }

    setMessage("Gate photo uploaded.");
    setUploadingId(null);
  };

  const handleComplete = async (customer) => {
    const completedAt = new Date().toISOString();
    const completedDate = completedAt.slice(0, 10);

    const appliedDeodorizerNow =
      !!customer.deodorizer_enabled && !!deodorizerApplied[customer.id];

    const customerUpdates = {
      last_service_status: "Completed",
      last_service_completed_at: completedAt,
      last_completed_text_sent_at: completedAt,
    };

    if (appliedDeodorizerNow) {
      customerUpdates.last_deodorizer_date = completedDate;
      customerUpdates.next_deodorizer_date = getNextDeodorizerDate(
        customer.deodorizer_frequency || "monthly",
        completedDate
      );
    }

    const ok = await updateCustomer(customer.id, customerUpdates);

    if (!ok) return;

    const historyNotes = [
      customer.notes || null,
      appliedDeodorizerNow
        ? `Deodorizer applied. Next deodorizer due: ${customerUpdates.next_deodorizer_date}.`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const { error: historyError } = await supabase
      .from("service_history")
      .insert({
        customer_id: customer.id,
        service_date: completedDate,
        service_day: today,
        driver_id: "tech1",
        status: "completed",
        completed_at: completedAt,

        gate_photo_url: customer.last_gate_photo_url || null,
        gate_photo_path: customer.last_gate_photo_path || null,

        photo_url: customer.last_gate_photo_url || null,

        notes: historyNotes || null,
      });

    if (historyError) {
      console.error(historyError);
      setMessage("Service completed, but history record failed to save.");
      return;
    }

    await sendText(
      {
        ...customer,
        last_service_status: "Completed",
      },
      "completed",
      {
        gate_photo_url: customer.last_gate_photo_url || null,
      }
    );

    setMessage(
      appliedDeodorizerNow
        ? "Service completed, deodorizer updated, and saved to service history."
        : "Service completed and saved to service history."
    );

    await loadCustomers();
  };

  const openNavigation = (customer) => {
    const destination = encodeURIComponent(
      `${customer.address || ""}, ${customer.city || ""}, ${customer.state || ""} ${customer.zip || ""}`
    );

    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
      "_blank"
    );
  };

  const callCustomer = (customer) => {
    if (!customer.phone) return;
    window.location.href = `tel:${customer.phone}`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
        🚚 Driver Mode V2
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Today: {today} • GPS tracking running for tech1
      </Typography>

      {message && (
        <Alert severity="info" sx={{ mb: 3 }} onClose={() => setMessage("")}>
          {message}
        </Alert>
      )}

      {loading && <Typography>Loading today&apos;s route...</Typography>}

      {!loading && customers.length === 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography color="text.secondary">
            No active customers scheduled for today.
          </Typography>
        </Paper>
      )}

      <Stack spacing={2}>
        {customers.map((customer, index) => {
          const deodorizerDue = isDeodorizerDue(customer);

          return (
            <Paper key={customer.id} sx={{ p: 3, borderRadius: 3 }}>
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Stop #{index + 1}
                  </Typography>

                  <Typography variant="h6" fontWeight="bold">
                    {customer.first_name} {customer.last_name}
                  </Typography>

                  <Typography>{customer.address}</Typography>

                  <Typography color="text.secondary">
                    {customer.city}, {customer.state} {customer.zip}
                  </Typography>
                </Box>

                <Stack spacing={1} alignItems="flex-end">
                  <Chip
                    label={customer.last_service_status || "Pending"}
                    color={
                      customer.last_service_status === "Completed"
                        ? "success"
                        : customer.last_service_status === "En Route"
                        ? "warning"
                        : "default"
                    }
                  />

                  {customer.deodorizer_enabled && (
                    <Chip
                      label={
                        deodorizerDue
                          ? "🟣 Deodorizer Due"
                          : `Deodorizer Due ${customer.next_deodorizer_date || ""}`
                      }
                      color={deodorizerDue ? "secondary" : "default"}
                    />
                  )}
                </Stack>
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2">
                <strong>Phone:</strong> {customer.phone || "Not listed"}
              </Typography>

              <Typography variant="body2">
                <strong>Plan:</strong> {customer.service_plan || "Not listed"}
              </Typography>

              <Typography variant="body2">
                <strong>Dogs:</strong> {customer.dogs || "Not listed"}
              </Typography>

              <Typography variant="body2">
                <strong>Gate Code:</strong> {customer.gate_code || "None"}
              </Typography>

              <Typography variant="body2">
                <strong>Access Notes:</strong>{" "}
                {customer.access_instructions || "None"}
              </Typography>

              <Typography variant="body2">
                <strong>Notes:</strong> {customer.notes || "None"}
              </Typography>

              {customer.deodorizer_enabled && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Deodorizer:</strong>{" "}
                    {customer.deodorizer_frequency === "biweekly"
                      ? "Twice Monthly / Biweekly"
                      : "Monthly"}
                  </Typography>

                  <Typography variant="body2">
                    <strong>Last Applied:</strong>{" "}
                    {customer.last_deodorizer_date || "Not yet"}
                  </Typography>

                  <Typography variant="body2">
                    <strong>Next Due:</strong>{" "}
                    {customer.next_deodorizer_date || "Due now"}
                  </Typography>

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={!!deodorizerApplied[customer.id]}
                        onChange={(e) =>
                          setDeodorizerApplied((prev) => ({
                            ...prev,
                            [customer.id]: e.target.checked,
                          }))
                        }
                      />
                    }
                    label="Applied Deodorizer Today"
                  />
                </Box>
              )}

              {customer.last_gate_photo_url && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" fontWeight="bold">
                    Gate Photo Ready:
                  </Typography>

                  <img
                    src={customer.last_gate_photo_url}
                    alt="Closed gate"
                    style={{
                      marginTop: 8,
                      maxWidth: "100%",
                      maxHeight: 260,
                      borderRadius: 8,
                    }}
                  />
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button variant="contained" onClick={() => openNavigation(customer)}>
                  📍 Navigate
                </Button>

                <Button variant="outlined" onClick={() => callCustomer(customer)}>
                  📞 Call
                </Button>

                <Button variant="outlined" onClick={() => handleOnTheWay(customer)}>
                  💬 On My Way
                </Button>

                <Button
                  variant="outlined"
                  component="label"
                  disabled={uploadingId === customer.id}
                >
                  {uploadingId === customer.id
                    ? "Uploading..."
                    : customer.last_gate_photo_url
                    ? "📸 Replace Gate Photo"
                    : "📸 Upload Gate Photo"}

                  <input
                    hidden
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) =>
                      handlePhotoUpload(customer, e.target.files?.[0])
                    }
                  />
                </Button>

                <Button
                  variant="contained"
                  color="success"
                  disabled={uploadingId === customer.id}
                  onClick={() => handleComplete(customer)}
                >
                  ✅ Complete Service
                </Button>
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}