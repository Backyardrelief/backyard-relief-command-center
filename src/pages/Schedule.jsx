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
import { INTERNAL_WORKING_DAYS } from "../lib/serviceArea";

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

export default function Schedule() {
  const [customers, setCustomers] = useState([]);

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
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Schedule fetch error:", error);
      return;
    }

    setCustomers(data || []);
  };

  const getCustomerRevenue = (customer) => {
    return (
      Number(customer.monthly_amount) ||
      PLAN_VALUES[customer.service_plan] ||
      0
    );
  };

  const isActiveCustomer = (customer) => {
    return (
      String(customer.status || "").toLowerCase() ===
      "active"
    );
  };

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
        sx={{ mb: 3 }}
      >
        Weekly Schedule
      </Typography>

      <Grid container spacing={3}>
        {INTERNAL_WORKING_DAYS.map((day) => {
          const dayCustomers = customers.filter(
            (customer) =>
              customer.service_day === day &&
              isActiveCustomer(customer)
          );

          const revenue = dayCustomers.reduce(
            (sum, customer) =>
              sum + getCustomerRevenue(customer),
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
                    mb: 2,
                  }}
                >
                  Monthly Revenue:{" "}
                  {formatCurrency(revenue)}
                </Typography>

                <Divider sx={{ mb: 2 }} />

                {dayCustomers.map((customer) => (
                  <Box
                    key={customer.id}
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
                      {customer.address || "No address"}
                    </Typography>

                    <Typography variant="body2">
                      {customer.service_plan ||
                        "No plan"}
                    </Typography>

                    <StackSafeCustomerMeta
                      customer={customer}
                    />
                  </Box>
                ))}

                {dayCustomers.length === 0 && (
                  <Typography color="text.secondary">
                    No active scheduled customers
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

function StackSafeCustomerMeta({ customer }) {
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
        label={`Billing: ${
          customer.subscription_status ||
          "Not connected"
        }`}
      />

      <Chip
        size="small"
        label={`Monthly: ${formatCurrency(
          customer.monthly_amount
        )}`}
      />
    </Box>
  );
}