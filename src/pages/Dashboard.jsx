import { useEffect, useState } from "react";

import {
  Box,
  Grid,
  Paper,
  Typography,
  Stack,
  Divider,
  Chip,
  Button,
} from "@mui/material";

import PeopleIcon from "@mui/icons-material/People";
import RouteIcon from "@mui/icons-material/Route";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import MapIcon from "@mui/icons-material/Map";
import CreditCardIcon from "@mui/icons-material/CreditCard";

import { useNavigate } from "react-router-dom";

import { supabase } from "../lib/supabase";
import { PLAN_VALUES } from "../config/pricing";

function isActiveCustomer(customer) {
  return String(customer.status || "").toLowerCase() === "active";
}

function getCustomerMonthlyValue(customer) {
  const monthlyAmount = Number(customer.monthly_amount || 0);

  if (monthlyAmount > 0) return monthlyAmount;

  return PLAN_VALUES[customer.service_plan] || 0;
}

function DashboardCard({ title, value, icon, subtitle }) {
  return (
    <Paper sx={{ p: 3, borderRadius: 3, height: "100%" }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography color="text.secondary" variant="body2">
            {title}
          </Typography>

          <Typography variant="h4" fontWeight="bold">
            {value}
          </Typography>

          {subtitle && (
            <Typography color="text.secondary" variant="caption">
              {subtitle}
            </Typography>
          )}
        </Box>

        {icon}
      </Box>
    </Paper>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data, error } = await supabase.from("customers").select("*");

    if (error) {
      console.error(error);
      return;
    }

    setCustomers(data || []);
  }

  const activeCustomers = customers.filter(isActiveCustomer);

  const totalCustomers = activeCustomers.length;

  const monthlyRevenue = activeCustomers.reduce((total, customer) => {
    return total + getCustomerMonthlyValue(customer);
  }, 0);

  const annualRevenue = monthlyRevenue * 12;

  const weeklyStops = activeCustomers.filter(
    (customer) =>
      customer.service_frequency === "Weekly" ||
      customer.service_frequency === "Twice Weekly"
  ).length;

  const routeDays = new Set(
    activeCustomers.map((customer) => customer.service_day).filter(Boolean)
  ).size;

  const failedPayments = activeCustomers.filter((customer) => {
    const status = String(customer.subscription_status || "").toLowerCase();
    return status === "past_due" || status === "unpaid";
  });

  const missingCoordinates = activeCustomers.filter(
    (customer) => !customer.lat || !customer.lng
  );

  const missingServiceDay = activeCustomers.filter(
    (customer) => !customer.service_day
  );

  const missingZone = activeCustomers.filter((customer) => !customer.zone);

  const alerts = [
    {
      label: "Failed Payments",
      count: failedPayments.length,
      severity: failedPayments.length > 0 ? "error" : "success",
      onClick: () => navigate("/billing?filter=failed"),
    },
    {
      label: "Missing Coordinates",
      count: missingCoordinates.length,
      severity: missingCoordinates.length > 0 ? "warning" : "success",
      onClick: () => navigate("/customers"),
    },
    {
      label: "Missing Service Day",
      count: missingServiceDay.length,
      severity: missingServiceDay.length > 0 ? "warning" : "success",
      onClick: () => navigate("/customers"),
    },
    {
      label: "Missing Zone",
      count: missingZone.length,
      severity: missingZone.length > 0 ? "warning" : "success",
      onClick: () => navigate("/customers"),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
        Backyard Relief Command Center
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Owner dashboard for customers, routes, revenue, and service alerts.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6} lg={3}>
          <DashboardCard
            title="Active Customers"
            value={totalCustomers}
            subtitle="Currently billable customers"
            icon={<PeopleIcon sx={{ fontSize: 40 }} />}
          />
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <DashboardCard
            title="Monthly Revenue"
            value={`$${monthlyRevenue.toLocaleString()}`}
            subtitle={`$${annualRevenue.toLocaleString()} annualized`}
            icon={<AttachMoneyIcon sx={{ fontSize: 40 }} />}
          />
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <DashboardCard
            title="Weekly Stops"
            value={weeklyStops}
            subtitle="Weekly + twice weekly customers"
            icon={<CalendarMonthIcon sx={{ fontSize: 40 }} />}
          />
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <DashboardCard
            title="Route Days"
            value={routeDays}
            subtitle="Active service days"
            icon={<RouteIcon sx={{ fontSize: 40 }} />}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, borderRadius: 3, height: "100%" }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <WarningAmberIcon />
              <Typography variant="h6" fontWeight="bold">
                Service Alerts
              </Typography>
            </Stack>

            <Divider sx={{ mb: 2 }} />

            <Stack spacing={2}>
              {alerts.map((alert) => (
                <Box
                  key={alert.label}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  onClick={alert.onClick}
                  sx={{
                    cursor: "pointer",
                    p: 1,
                    borderRadius: 2,
                    "&:hover": {
                      backgroundColor: "rgba(0,0,0,0.04)",
                    },
                  }}
                >
                  <Typography>{alert.label}</Typography>

                  <Chip
                    label={alert.count}
                    color={alert.severity}
                    size="small"
                  />
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, borderRadius: 3, height: "100%" }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              Quick Actions
            </Typography>

            <Stack spacing={1.5}>
              <Button
                variant="contained"
                startIcon={<PeopleIcon />}
                onClick={() => navigate("/customers")}
              >
                Open Customers
              </Button>

              <Button
                variant="contained"
                startIcon={<CalendarMonthIcon />}
                onClick={() => navigate("/schedule")}
              >
                Open Schedule
              </Button>

              <Button
                variant="contained"
                startIcon={<RouteIcon />}
                onClick={() => navigate("/routes")}
              >
                Open Routes
              </Button>

              <Button
                variant="contained"
                startIcon={<MapIcon />}
                onClick={() => navigate("/map")}
              >
                Open Fleet Map
              </Button>

              <Button
                variant="outlined"
                startIcon={<CreditCardIcon />}
                onClick={() => navigate("/billing")}
              >
                Open Billing
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ mt: 4, p: 3, borderRadius: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <CheckCircleIcon />
          <Typography variant="h6" fontWeight="bold">
            Business Snapshot
          </Typography>
        </Stack>

        <Typography>Active Customers: {totalCustomers}</Typography>
        <Typography>
          Monthly Recurring Revenue: ${monthlyRevenue.toLocaleString()}
        </Typography>
        <Typography>
          Annualized Revenue: ${annualRevenue.toLocaleString()}
        </Typography>
        <Typography>Weekly Stops: {weeklyStops}</Typography>
        <Typography>Active Route Days: {routeDays}</Typography>
      </Paper>
    </Box>
  );
}