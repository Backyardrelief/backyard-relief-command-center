import { useEffect, useState } from "react";

import {
  Box,
  Typography,
  Paper,
  Grid,
  Divider,
  Chip,
} from "@mui/material";

import { supabase } from "../lib/supabase";
import { PLAN_VALUES } from "../config/pricing";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const formatCurrency = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "$0.00";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

const formatStatus = (value) => {
  if (!value) {
    return "Not connected";
  }

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
};

const normalizeDayName = (value) => {
  const normalizedValue = String(value || "")
    .trim()
    .toLowerCase();

  return (
    DAYS.find(
      (day) => day.toLowerCase() === normalizedValue
    ) || null
  );
};

const normalizeServiceDays = (customer) => {
  let savedDays = [];

  if (Array.isArray(customer?.service_days)) {
    savedDays = customer.service_days;
  } else if (typeof customer?.service_days === "string") {
    const cleanedValue = customer.service_days
      .replace(/[{}[\]"]/g, "")
      .trim();

    savedDays = cleanedValue
      ? cleanedValue.split(",")
      : [];
  }

  const normalizedSavedDays = savedDays
    .map(normalizeDayName)
    .filter(Boolean);

  if (normalizedSavedDays.length > 0) {
    return [...new Set(normalizedSavedDays)].sort(
      (a, b) => DAYS.indexOf(a) - DAYS.indexOf(b)
    );
  }

  const legacyDay = normalizeDayName(
    customer?.service_day
  );

  return legacyDay ? [legacyDay] : [];
};

const isCustomerScheduledForDay = (
  customer,
  day
) => normalizeServiceDays(customer).includes(day);

const isActiveCustomer = (customer) => {
  const status = String(customer?.status || "")
    .trim()
    .toLowerCase();

  return status === "active";
};

const getCustomerMonthlyRevenue = (customer) => {
  const stripeAmount = Number(
    customer.monthly_amount
  );

  if (
    Number.isFinite(stripeAmount) &&
    stripeAmount > 0
  ) {
    return stripeAmount;
  }

  return Number(
    PLAN_VALUES[customer.service_plan] || 0
  );
};

const getCustomerRouteRevenue = (customer) => {
  const monthlyRevenue =
    getCustomerMonthlyRevenue(customer);

  const serviceDays =
    normalizeServiceDays(customer);

  const dayCount = Math.max(
    serviceDays.length,
    1
  );

  return monthlyRevenue / dayCount;
};

export default function Schedule() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomers();

    const channel = supabase
      .channel("customers-schedule-refresh")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customers",
        },
        () => {
          loadCustomers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCustomers = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Schedule fetch error:",
        error
      );

      setLoading(false);
      return;
    }

    setCustomers(data || []);
    setLoading(false);
  };

  const activeCustomers =
    customers.filter(isActiveCustomer);

  const activeCustomerCount =
    activeCustomers.length;

  const weeklyStopCount =
    activeCustomers.reduce(
      (total, customer) =>
        total +
        normalizeServiceDays(customer).length,
      0
    );

  const totalMonthlyRevenue =
    activeCustomers.reduce(
      (total, customer) =>
        total +
        getCustomerMonthlyRevenue(customer),
      0
    );

  return (
    <Box
      sx={{
        p: {
          xs: 2,
          sm: 3,
        },
      }}
    >
      <Typography
        variant="h4"
        fontWeight="bold"
        sx={{ mb: 1 }}
      >
        Weekly Schedule
      </Typography>

      <Typography
        color="text.secondary"
        sx={{ mb: 3 }}
      >
        Active customers: {activeCustomerCount}
        {" • "}
        Weekly stops: {weeklyStopCount}
        {" • "}
        Monthly recurring revenue:{" "}
        {formatCurrency(totalMonthlyRevenue)}
      </Typography>

      <Grid container spacing={3}>
        {DAYS.map((day) => {
          const dayCustomers =
            activeCustomers.filter((customer) =>
              isCustomerScheduledForDay(
                customer,
                day
              )
            );

          const routeRevenue =
            dayCustomers.reduce(
              (total, customer) =>
                total +
                getCustomerRouteRevenue(
                  customer
                ),
              0
            );

          return (
            <Grid
              item
              xs={12}
              md={6}
              key={day}
            >
              <Paper
                sx={{
                  p: {
                    xs: 2,
                    sm: 3,
                  },
                  borderRadius: 3,
                  height: "100%",
                }}
              >
                <Typography
                  variant="h6"
                  fontWeight="bold"
                >
                  {day}
                </Typography>

                <Typography color="text.secondary">
                  Stops: {dayCustomers.length}
                </Typography>

                <Typography
                  sx={{
                    fontWeight: "bold",
                    mb: 0.5,
                  }}
                >
                  Allocated Monthly Revenue:{" "}
                  {formatCurrency(routeRevenue)}
                </Typography>

                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: "block",
                    mb: 2,
                  }}
                >
                  Twice-weekly subscriptions are
                  divided between their two route
                  days.
                </Typography>

                <Divider sx={{ mb: 2 }} />

                {dayCustomers.map((customer) => {
                  const serviceDays =
                    normalizeServiceDays(customer);

                  const monthlyRevenue =
                    getCustomerMonthlyRevenue(
                      customer
                    );

                  const routeRevenueShare =
                    getCustomerRouteRevenue(
                      customer
                    );

                  return (
                    <Box
                      key={`${customer.id}-${day}`}
                      sx={{
                        mb: 2,
                        p: 1.5,
                        bgcolor: "grey.100",
                        borderRadius: 2,
                      }}
                    >
                      <Typography
                        fontWeight="bold"
                        sx={{
                          overflowWrap: "anywhere",
                        }}
                      >
                        {customer.first_name}{" "}
                        {customer.last_name}
                      </Typography>

                      <Typography
                        variant="body2"
                        sx={{
                          overflowWrap: "anywhere",
                        }}
                      >
                        {customer.address ||
                          "No address"}
                      </Typography>

                      <Typography variant="body2">
                        {customer.service_plan ||
                          "No plan"}
                      </Typography>

                      {serviceDays.length > 1 && (
                        <Chip
                          size="small"
                          color="secondary"
                          label={`Twice weekly: ${serviceDays.join(
                            " & "
                          )}`}
                          sx={{
                            mt: 1,
                            mr: 1,
                          }}
                        />
                      )}

                      <CustomerMeta
                        customer={customer}
                        monthlyRevenue={
                          monthlyRevenue
                        }
                        routeRevenueShare={
                          routeRevenueShare
                        }
                        isMultiDay={
                          serviceDays.length > 1
                        }
                      />
                    </Box>
                  );
                })}

                {!loading &&
                  dayCustomers.length === 0 && (
                    <Typography color="text.secondary">
                      No active scheduled customers
                    </Typography>
                  )}

                {loading && (
                  <Typography color="text.secondary">
                    Loading schedule…
                  </Typography>
                )}
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}

function CustomerMeta({
  customer,
  monthlyRevenue,
  routeRevenueShare,
  isMultiDay,
}) {
  return (
    <Box
      sx={{
        mt: 1,
        display: "flex",
        gap: 1,
        flexWrap: "wrap",
      }}
    >
      <Chip
        size="small"
        label={`Billing: ${formatStatus(
          customer.subscription_status
        )}`}
      />

      <Chip
        size="small"
        label={`Monthly: ${formatCurrency(
          monthlyRevenue
        )}`}
      />

      {isMultiDay && (
        <Chip
          size="small"
          variant="outlined"
          label={`Route share: ${formatCurrency(
            routeRevenueShare
          )}`}
        />
      )}
    </Box>
  );
}