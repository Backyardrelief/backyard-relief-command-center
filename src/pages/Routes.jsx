import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Divider,
  Chip,
} from "@mui/material";

import { supabase } from "../lib/supabase";

const PLAN_VALUES = {
  "Basic Relief": 60,
  "Standard Relief": 80,
  "Relief Plus": 96,
  "Relief Premium": 110,
  "Relief Elite": 144,
};

export default function Routes() {
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
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
        Route Management
      </Typography>

      <Grid container spacing={3}>
        {days.map((day) => {
          const dayCustomers = customers.filter(
            (customer) =>
              customer.service_day === day
          );

          const revenue = dayCustomers.reduce(
            (total, customer) =>
              total +
              (PLAN_VALUES[
                customer.service_plan
              ] || 0),
            0
          );

          return (
            <Grid
              item
              xs={12}
              md={6}
              lg={4}
              key={day}
            >
              <Paper
                sx={{
                  p: 3,
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

                <Typography
                  color="text.secondary"
                >
                  {dayCustomers.length} Stops
                </Typography>

                <Typography
                  sx={{
                    fontWeight: "bold",
                    mt: 1,
                    mb: 2,
                  }}
                >
                  ${revenue}/month
                </Typography>

                <Divider sx={{ mb: 2 }} />

                {dayCustomers.map(
                  (customer) => (
                    <Box
                      key={customer.id}
                      sx={{
                        mb: 2,
                        p: 1.5,
                        borderRadius: 2,
                        background:
                          "#f5f5f5",
                      }}
                    >
                      <Typography
                        fontWeight="bold"
                      >
                        {customer.first_name}{" "}
                        {customer.last_name}
                      </Typography>

                      <Typography
                        variant="body2"
                      >
                        {customer.address}
                      </Typography>

                      <Typography
                        variant="body2"
                      >
                        {customer.city}
                      </Typography>

                      <Chip
                        size="small"
                        label={
                          customer.service_plan
                        }
                        sx={{ mt: 1 }}
                      />
                    </Box>
                  )
                )}

                {dayCustomers.length === 0 && (
                  <Typography
                    color="text.secondary"
                  >
                    No customers assigned.
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