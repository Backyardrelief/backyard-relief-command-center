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

export default function DriverDashboard() {
  useDriverGPS("tech1");

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);
  const [message, setMessage] = useState("");

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
      setLoading(false);
      return;
    }

    setCustomers((data || []).filter(isActiveCustomer));
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

  const sendText = async (customer, type) => {
    const { error } = await supabase.functions.invoke("send-service-text", {
      body: {
        customer_id: customer.id,
        type,
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
    await updateCustomer(customer.id, {
      last_service_status: "En Route",
      last_service_started_at: new Date().toISOString(),
      last_on_the_way_text_sent_at: new Date().toISOString(),
    });

    await sendText(customer, "on_the_way");
  };

  const handlePhotoUpload = async (customer, file) => {
    if (!file) return;

    setUploadingId(customer.id);

    const fileExt = file.name.split(".").pop();
    const filePath = `${customer.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("gate-photos")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error(uploadError);
      setMessage("Photo upload failed.");
      setUploadingId(null);
      return;
    }

    const { data } = supabase.storage
      .from("gate-photos")
      .getPublicUrl(filePath);

    await updateCustomer(customer.id, {
      last_gate_photo_url: data.publicUrl,
    });

    setMessage("Gate photo uploaded.");
    setUploadingId(null);
  };

  const handleComplete = async (customer) => {
    const ok = await updateCustomer(customer.id, {
      last_service_status: "Completed",
      last_service_completed_at: new Date().toISOString(),
      last_completed_text_sent_at: new Date().toISOString(),
    });

    if (!ok) return;

    await sendText(
      {
        ...customer,
        last_service_status: "Completed",
      },
      "completed"
    );
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
        {customers.map((customer, index) => (
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

            {customer.last_gate_photo_url && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" fontWeight="bold">
                  Last Gate Photo:
                </Typography>

                <img
                  src={customer.last_gate_photo_url}
                  alt="Closed gate"
                  style={{
                    marginTop: 8,
                    maxWidth: "100%",
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

              <Button variant="outlined" component="label">
                📸 Upload Gate Photo
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
        ))}
      </Stack>
    </Box>
  );
}