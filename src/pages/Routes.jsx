import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Divider,
  Chip,
  Button,
} from "@mui/material";

import { supabase } from "../lib/supabase";
import { DndContext, closestCenter } from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import SortableItem from "../components/dispatch/SortableItem";
const PLAN_VALUES = {
  "Basic Relief": 60,
  "Standard Relief": 80,
  "Relief Plus": 96,
  "Relief Premium": 110,
  "Relief Elite": 144,
};

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function Routes() {
  const [customers, setCustomers] = useState([]);
const [routes, setRoutes] = useState({});
const [manualRoutes, setManualRoutes] = useState({});
const [loadingDays, setLoadingDays] = useState({});

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("*");

    if (error) {
      console.error("Route load error:", error);
      return;
    }

    setCustomers(data || []);
  };

  // -------------------------
  // CALL EDGE FUNCTION (STEP 11 ENGINE)
  // -------------------------
  const generateRoute = async (dayCustomers, day) => {
    try {
      setLoadingDays((prev) => ({ ...prev, [day]: true }));

      const res = await fetch(
        "https://ugtqsmrgwnyxzuwrolcz.functions.supabase.co/optimize-route",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customers: dayCustomers,
          }),
        }
      );

      const data = await res.json();

      console.table(
  data.route.map((customer, index) => ({
    Position: index + 1,
    RouteOrder: customer.route_order,
    Name: `${customer.first_name} ${customer.last_name}`,
    Address: customer.address,
  }))
);

      setRoutes((prev) => ({
        ...prev,
        [day]: data.route,
      }));
    } catch (err) {
      console.error("Route generation error:", err);
    } finally {
      setLoadingDays((prev) => ({ ...prev, [day]: false }));
    }
  };
// -------------------------
// DRAG & DROP HANDLER
// -------------------------
const handleDragEnd = (day, event) => {
  const { active, over } = event;

  if (!over || active.id === over.id) return;

  const currentRoute =
    manualRoutes[day] ||
    routes[day] ||
    customers.filter(
      (customer) => customer.service_day === day
    );

  const oldIndex = currentRoute.findIndex(
    (customer) => customer.id === active.id
  );

  const newIndex = currentRoute.findIndex(
    (customer) => customer.id === over.id
  );

  if (oldIndex === -1 || newIndex === -1) return;

  const updatedRoute = arrayMove(
    currentRoute,
    oldIndex,
    newIndex
  ).map((customer, index) => ({
    ...customer,
    route_order: index + 1,
  }));

  setManualRoutes((prev) => ({
    ...prev,
    [day]: updatedRoute,
  }));
};
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        Dispatch Board
      </Typography>

      <Grid container spacing={3}>
        {days.map((day) => {
          const dayCustomers = customers.filter(
            (c) => c.service_day === day
          );

          const activeRoute =
  manualRoutes[day] ||
  routes[day] ||
  dayCustomers;

          const revenue = activeRoute.reduce(
            (total, customer) =>
              total + (PLAN_VALUES[customer.service_plan] || 0),
            0
          );

          return (
            <Grid item xs={12} md={6} lg={4} key={day}>
              <Paper sx={{ p: 3, borderRadius: 3 }}>
                {/* HEADER */}
                <Typography variant="h6" fontWeight="bold">
                  {day}
                </Typography>

                <Typography color="text.secondary">
                  {activeRoute.length} Stops
                </Typography>

                <Typography sx={{ fontWeight: "bold", mt: 1, mb: 2 }}>
                  ${revenue}/month
                </Typography>

                {/* GENERATE ROUTE BUTTON */}
                <Button
                  variant="contained"
                  size="small"
                  sx={{ mb: 2 }}
                  disabled={loadingDays[day]}
                  onClick={() => generateRoute(dayCustomers, day)}
                >
                  {loadingDays[day]
                    ? "Generating Route..."
                    : "Generate Route"}
                </Button>

                <Divider sx={{ mb: 2 }} />

                {/* DRAG & DROP ROUTE */}
<DndContext
  collisionDetection={closestCenter}
  onDragEnd={(event) => handleDragEnd(day, event)}
>
  <SortableContext
    items={activeRoute.map((customer) => customer.id)}
    strategy={verticalListSortingStrategy}
  >
    {activeRoute.map((customer) => (
      <SortableItem
        key={customer.id}
        id={customer.id}
        customer={customer}
      />
    ))}
  </SortableContext>
</DndContext>

                {activeRoute.length === 0 && (
                  <Typography color="text.secondary">
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