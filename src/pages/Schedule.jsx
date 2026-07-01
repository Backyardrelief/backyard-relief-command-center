import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Divider,
} from "@mui/material";

import { supabase } from "../lib/supabase";

import { PLAN_VALUES } from "../config/pricing";

export default function Schedule() {
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("*");

    if (error) {
      console.error(error);
      return;
    }

    setCustomers(data || []);
  };

  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h4"
        fontWeight="bold"
        sx={{ mb: 3 }}
      >
        Weekly Schedule
      </Typography>

      <Grid container spacing={3}>
        {days.map((day) => {
          const dayCustomers = customers.filter(
            (customer) =>
              customer.service_day === day
          );

          const revenue = dayCustomers.reduce(
            (sum, customer) =>
              sum +
              (PLAN_VALUES[
                customer.service_plan
              ] || 0),
            0
          );

          return (
            <Grid item xs={12} md={6} key={day}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 3,
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
                  Revenue: ${revenue}
                </Typography>

                <Divider sx={{ mb: 2 }} />

                {dayCustomers.map(
                  (customer) => (
                    <Box
                      key={customer.id}
                      sx={{
                        mb: 2,
                        p: 1.5,
                        background:
                          "#f7f7f7",
                        borderRadius: 2,
                      }}
                    >
                      <Typography
                        fontWeight="bold"
                      >
                        {customer.first_name}{" "}
                        {customer.last_name}
                      </Typography>

                      <Typography variant="body2">
                        {customer.address}
                      </Typography>

                      <Typography variant="body2">
                        {customer.service_plan}
                      </Typography>
                    </Box>
                  )
                )}

                {dayCustomers.length === 0 && (
                  <Typography
                    color="text.secondary"
                  >
                    No scheduled customers
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