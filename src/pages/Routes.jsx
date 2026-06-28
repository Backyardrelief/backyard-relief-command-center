import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Divider,
  Button,
} from "@mui/material";

import { supabase } from "../lib/supabase";
import { eventBus } from "../lib/eventBus";

import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import SortableItem from "../components/dispatch/SortableItem";

// -------------------------
const PLAN_VALUES = {
  "Basic Relief": 60,
  "Standard Relief": 80,
  "Relief Plus": 100,
  "Relief Premium": 115,
  "Relief Elite": 144,
};

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function Routes() {
  const [customers, setCustomers] = useState([]);

  // DB source of truth
  const [routes, setRoutes] = useState({});
  const [lockedDays, setLockedDays] = useState({});

  const [loadingDays, setLoadingDays] = useState({});

  // -------------------------
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

  // -------------------------
  // LOAD ROUTES FROM DB
  // -------------------------
  const loadRoutes = async () => {
    const { data, error } = await supabase
      .from("routes")
      .select("*");

    if (error) {
      console.error("Route load error:", error);
      return;
    }

    const rMap = {};
    const lMap = {};

    (data || []).forEach((r) => {
      rMap[r.day] = r.route || [];
      lMap[r.day] = r.locked || false;
    });

    setRoutes(rMap);
    setLockedDays(lMap);
  };

  // -------------------------
  useEffect(() => {
    fetchCustomers();
    loadRoutes();
  }, []);

  // -------------------------
  useEffect(() => {
    const handleUpdate = async (changedCustomer) => {
      await fetchCustomers();

      if (!changedCustomer?.service_day) return;

      const day = changedCustomer.service_day;

      if (lockedDays[day]) return;

      setTimeout(() => {
        const dayCustomers = customers.filter(
          (c) => c.service_day === day
        );

        if (dayCustomers.length) {
          generateRoute(dayCustomers, day);
        }
      }, 200);
    };

    eventBus.on("customersUpdated", handleUpdate);

    return () => {
      eventBus.off("customersUpdated", handleUpdate);
    };
  }, [customers, lockedDays]);

    // -------------------------
  // SAVE TO SUPABASE
  // -------------------------
  const saveRoute = async (day, route, locked) => {
    const { error } = await supabase
      .from("routes")
      .upsert({
        day,
        route,
        locked,
        updated_at: new Date(),
      }, { onConflict: "day" });

    if (error) console.error(error);
  };

  // -------------------------
  const generateRoute = async (dayCustomers, day) => {
    try {
      setLoadingDays((p) => ({ ...p, [day]: true }));

      const res = await fetch(
        "https://ugtqsmrgwnyxzuwrolcz.functions.supabase.co/optimize-route",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customers: dayCustomers }),
        }
      );

      const data = await res.json();

      setRoutes((prev) => ({
        ...prev,
        [day]: data.route,
      }));

      await saveRoute(day, data.route, lockedDays[day] || false);

    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDays((p) => ({ ...p, [day]: false }));
    }
  };

  // -------------------------
  const toggleLock = async (day) => {
    const newVal = !lockedDays[day];

    setLockedDays((prev) => ({
      ...prev,
      [day]: newVal,
    }));

    await saveRoute(day, routes[day] || [], newVal);
  };

  // -------------------------
  const handleDragEnd = async (day, event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const currentRoute =
      routes[day] ||
      customers.filter((c) => c.service_day === day);

    const oldIndex = currentRoute.findIndex(c => c.id === active.id);
    const newIndex = currentRoute.findIndex(c => c.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const updated = arrayMove(
      currentRoute,
      oldIndex,
      newIndex
    ).map((c, i) => ({ ...c, route_order: i + 1 }));

    setRoutes((prev) => ({
      ...prev,
      [day]: updated,
    }));

    setLockedDays((prev) => ({
      ...prev,
      [day]: true,
    }));

    await saveRoute(day, updated, true);
  };

  // -------------------------
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
            routes[day] ||
            dayCustomers;

          const revenue = activeRoute.reduce(
            (t, c) => t + (PLAN_VALUES[c.service_plan] || 0),
            0
          );

          return (
            <Grid item xs={12} md={6} lg={4} key={day}>
              <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h6">{day}</Typography>

                <Typography color="text.secondary">
                  {activeRoute.length} Stops
                </Typography>

                <Typography sx={{ fontWeight: "bold", mt: 1, mb: 2 }}>
                  ${revenue}/month
                </Typography>

                <Button
                  variant="contained"
                  size="small"
                  disabled={loadingDays[day] || lockedDays[day]}
                  onClick={() => generateRoute(dayCustomers, day)}
                >
                  {loadingDays[day]
                    ? "Generating..."
                    : "Generate Route"}
                </Button>

                <Button
                  size="small"
                  variant={lockedDays[day] ? "contained" : "outlined"}
                  color={lockedDays[day] ? "error" : "primary"}
                  sx={{ ml: 1 }}
                  onClick={() => toggleLock(day)}
                >
                  {lockedDays[day] ? "Locked" : "Unlocked"}
                </Button>

                <Divider sx={{ my: 2 }} />

                <DndContext
                  collisionDetection={closestCenter}
                  onDragEnd={(e) => handleDragEnd(day, e)}
                >
                  <SortableContext
                    items={activeRoute.map(c => c.id)}
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

              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}