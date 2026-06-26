import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  Checkbox,
  LinearProgress,
  Divider,
} from "@mui/material";

import { supabase } from "../lib/supabase";

const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function DispatchBoard() {
  const [customers, setCustomers] = useState([]);
  const [today, setToday] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dayIndex = new Date().getDay();
    const todayName = days[dayIndex];
    setToday(todayName);

    fetchCustomers(todayName);
  }, []);

  const fetchCustomers = async (day) => {
    setLoading(true);

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("service_day", day)
      .order("route_order", { ascending: true });

    if (error) {
      console.error("Dispatch load error:", error);
      setLoading(false);
      return;
    }

    setCustomers(data || []);
    setLoading(false);
  };

  // -------------------------
  // PERSISTENT TOGGLE COMPLETE
  // -------------------------
  const toggleComplete = async (id, currentValue) => {
    const newValue = !currentValue;

    const { error } = await supabase
      .from("customers")
      .update({ completed: newValue })
      .eq("id", id);

    if (error) {
      console.error("Error updating completion:", error);
      return;
    }

    setCustomers((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, completed: newValue } : c
      )
    );
  };

  // -------------------------
  // PROGRESS CALCULATION
  // -------------------------
  const completedCount = customers.filter(
    (c) => c.completed
  ).length;

  const progress =
    customers.length === 0
      ? 0
      : (completedCount / customers.length) * 100;

  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER */}
      <Typography variant="h4" fontWeight="bold">
        Today’s Dispatch — {today}
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {completedCount} / {customers.length} completed
      </Typography>

      {/* PROGRESS BAR */}
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{ mb: 3, height: 10, borderRadius: 5 }}
      />

      {/* LIST */}
      <Stack spacing={2}>
        {customers.map((customer) => (
          <Paper
            key={customer.id}
            sx={{
              p: 2,
              borderLeft: customer.completed
                ? "6px solid green"
                : "6px solid #1976d2",
              opacity: customer.completed ? 0.6 : 1,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              {/* LEFT INFO */}
              <Box>
                <Typography fontWeight="bold">
                  Stop #{customer.route_order || "?"} —{" "}
                  {customer.first_name} {customer.last_name}
                </Typography>

                <Typography variant="body2">
                  {customer.address}
                </Typography>

                <Stack direction="row" spacing={1} mt={1}>
                  <Chip
                    size="small"
                    label={customer.service_plan}
                  />
                  <Chip
                    size="small"
                    label={customer.status}
                    color={
                      customer.status === "active"
                        ? "success"
                        : "default"
                    }
                  />
                </Stack>
              </Box>

              {/* CHECKBOX */}
              <Checkbox
                checked={customer.completed || false}
                onChange={() =>
                  toggleComplete(
                    customer.id,
                    customer.completed
                  )
                }
              />
            </Stack>

            <Divider sx={{ mt: 2 }} />
          </Paper>
        ))}

        {customers.length === 0 && !loading && (
          <Typography color="text.secondary">
            No stops scheduled for today.
          </Typography>
        )}
      </Stack>
    </Box>
  );
}