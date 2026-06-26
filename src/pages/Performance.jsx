import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

import {
  Box,
  Typography,
  Paper,
  Grid,
  LinearProgress,
  Stack,
  Chip,
} from "@mui/material";

const PLAN_VALUES = {
  "Basic Relief": 60,
  "Standard Relief": 80,
  "Relief Plus": 96,
  "Relief Premium": 110,
  "Relief Elite": 144,
};

export default function Performance() {
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("*");

    if (error) {
      console.error("Performance load error:", error);
      return;
    }

    setCustomers(data || []);
  };

  // -------------------------
  // CORE METRICS
  // -------------------------
  const totalStops = customers.length;

  const completedStops = customers.filter(
    (c) => c.completed
  ).length;

  const missedStops = customers.filter(
    (c) => !c.completed
  ).length;

  const completionRate =
    totalStops === 0
      ? 0
      : (completedStops / totalStops) * 100;

  const scheduledRevenue = customers.reduce(
    (sum, c) => sum + (PLAN_VALUES[c.service_plan] || 0),
    0
  );

  const completedRevenue = customers
    .filter((c) => c.completed)
    .reduce(
      (sum, c) => sum + (PLAN_VALUES[c.service_plan] || 0),
      0
    );

  const activeCustomers = customers.filter(
    (c) => c.status === "active"
  ).length;

  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER */}
      <Typography variant="h4" fontWeight="bold" mb={3}>
        Performance Dashboard
      </Typography>

      {/* TOP METRICS */}
      <Grid container spacing={3}>
        {/* COMPLETION RATE */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography fontWeight="bold">
              Completion Rate
            </Typography>

            <Typography variant="h4" sx={{ mt: 1 }}>
              {completionRate.toFixed(1)}%
            </Typography>

            <LinearProgress
              variant="determinate"
              value={completionRate}
              sx={{ mt: 2, height: 10, borderRadius: 5 }}
            />
          </Paper>
        </Grid>

        {/* COMPLETED VS MISSED */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography fontWeight="bold">
              Stops Breakdown
            </Typography>

            <Stack direction="row" spacing={1} mt={2}>
              <Chip
                label={`Completed: ${completedStops}`}
                color="success"
              />
              <Chip
                label={`Missed: ${missedStops}`}
                color="error"
              />
            </Stack>

            <Typography sx={{ mt: 2 }}>
              Total Stops: {totalStops}
            </Typography>
          </Paper>
        </Grid>

        {/* REVENUE */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography fontWeight="bold">
              Revenue Tracking
            </Typography>

            <Typography sx={{ mt: 1 }}>
              Scheduled:{" "}
              <strong>${scheduledRevenue}</strong>
            </Typography>

            <Typography>
              Completed:{" "}
              <strong>${completedRevenue}</strong>
            </Typography>
          </Paper>
        </Grid>

        {/* ACTIVE STATUS */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography fontWeight="bold">
              Active Customer Base
            </Typography>

            <Typography variant="h5" sx={{ mt: 1 }}>
              {activeCustomers} Active Customers
            </Typography>

            <Typography color="text.secondary">
              System-wide operational visibility
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}