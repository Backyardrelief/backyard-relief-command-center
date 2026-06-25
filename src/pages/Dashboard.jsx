import { useEffect, useState } from "react";

import {
  Box,
  Grid,
  Paper,
  Typography,
} from "@mui/material";

import PeopleIcon from "@mui/icons-material/People";
import RouteIcon from "@mui/icons-material/Route";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";

import { supabase } from "../lib/supabase";

const PLAN_VALUES = {
  "Basic Relief": 60,
  "Standard Relief": 80,
  "Relief Plus": 96,
  "Relief Premium": 110,
  "Relief Elite": 144,
};

function DashboardCard({
  title,
  value,
  icon,
}) {
  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: 3,
        height: "100%",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography
            color="text.secondary"
            variant="body2"
          >
            {title}
          </Typography>

          <Typography
            variant="h4"
            fontWeight="bold"
          >
            {value}
          </Typography>
        </Box>

        {icon}
      </Box>
    </Paper>
  );
}

export default function Dashboard() {
  const [customers, setCustomers] =
    useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data, error } =
      await supabase
        .from("customers")
        .select("*");

    if (error) {
      console.error(error);
      return;
    }

    setCustomers(data || []);
  };

  const totalCustomers =
    customers.length;

  const monthlyRevenue =
    customers.reduce(
      (total, customer) =>
        total +
        (PLAN_VALUES[
          customer.service_plan
        ] || 0),
      0
    );

  const weeklyStops =
    customers.filter(
      (customer) =>
        customer.service_frequency ===
        "Weekly"
    ).length;

  const routeDays =
    new Set(
      customers.map(
        (customer) =>
          customer.service_day
      )
    ).size;

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h4"
        fontWeight="bold"
        sx={{ mb: 3 }}
      >
        Backyard Relief Command Center
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6} lg={3}>
          <DashboardCard
            title="Customers"
            value={totalCustomers}
            icon={
              <PeopleIcon
                sx={{
                  fontSize: 40,
                }}
              />
            }
          />
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <DashboardCard
            title="Monthly Revenue"
            value={`$${monthlyRevenue}`}
            icon={
              <AttachMoneyIcon
                sx={{
                  fontSize: 40,
                }}
              />
            }
          />
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <DashboardCard
            title="Weekly Stops"
            value={weeklyStops}
            icon={
              <CalendarMonthIcon
                sx={{
                  fontSize: 40,
                }}
              />
            }
          />
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <DashboardCard
            title="Route Days"
            value={routeDays}
            icon={
              <RouteIcon
                sx={{
                  fontSize: 40,
                }}
              />
            }
          />
        </Grid>
      </Grid>

      <Paper
        sx={{
          mt: 4,
          p: 3,
          borderRadius: 3,
        }}
      >
        <Typography
          variant="h6"
          fontWeight="bold"
          sx={{ mb: 2 }}
        >
          Business Snapshot
        </Typography>

        <Typography>
          Total Customers:{" "}
          {totalCustomers}
        </Typography>

        <Typography>
          Monthly Recurring Revenue:
          ${monthlyRevenue}
        </Typography>

        <Typography>
          Weekly Stops: {weeklyStops}
        </Typography>
      </Paper>
    </Box>
  );
}