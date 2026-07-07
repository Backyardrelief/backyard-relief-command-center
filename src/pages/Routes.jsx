import { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Divider,
  Button,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";

import { supabase } from "../lib/supabase";

import {
  DndContext,
  closestCenter,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  useDroppable,
} from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import SortableItem from "../components/dispatch/SortableItem";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function isActiveCustomer(customer) {
  return String(customer.status || "").toLowerCase() === "active";
}

function DayColumn({ day, children }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${day}` });

  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: 420,
        borderRadius: 10,
        transition: "0.15s ease",
        border: isOver ? "2px solid #1976d2" : "1px solid transparent",
        background: isOver ? "#f5f9ff" : "transparent",
      }}
    >
      {children}
    </div>
  );
}

export default function Routes() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("days");
  const [activeItem, setActiveItem] = useState(null);
  const [routeOrders, setRouteOrders] = useState({});

  const debounceRef = useRef({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  useEffect(() => {
  loadCustomers();

  const channel = supabase
    .channel("customers-routes-refresh")
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
      .order("service_day", { ascending: true });

    if (error) {
      console.error("Routes customer fetch error:", error);
      setLoading(false);
      return;
    }

    setCustomers(data || []);
    setLoading(false);
  };

  const activeCustomers = customers.filter(isActiveCustomer);

  const getCustomersForDay = (day) => {
    const dayCustomers = activeCustomers.filter((c) => c.service_day === day);
    const order = routeOrders[day];

    if (!order?.length) return dayCustomers;

    return [...dayCustomers].sort((a, b) => {
      const aIndex = order.indexOf(a.id);
      const bIndex = order.indexOf(b.id);

      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;

      return aIndex - bIndex;
    });
  };

  const getTargetDay = (overId) => {
    if (!overId) return null;

    const id = String(overId);

    if (id.startsWith("day-")) {
      return id.replace("day-", "");
    }

    const overCustomer = activeCustomers.find((c) => c.id === overId);
    return overCustomer?.service_day || null;
  };

  const toggleLock = async (customer) => {
    const updated = !customer.locked;

    const { error } = await supabase
      .from("customers")
      .update({ locked: updated })
      .eq("id", customer.id);

    if (error) {
      console.error("Lock update error:", error);
      return;
    }

    setCustomers((prev) =>
      prev.map((c) => (c.id === customer.id ? { ...c, locked: updated } : c))
    );
  };

  const rebuildDay = async (day) => {
    const dayCustomers = activeCustomers.filter(
      (c) => c.service_day === day && !c.locked
    );

    const res = await fetch(
      "https://ugtqsmrgwnyxzuwrolcz.functions.supabase.co/optimize-route",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customers: dayCustomers }),
      }
    );

    const data = await res.json();
    const optimized = data.route || [];

    setRouteOrders((prev) => ({
      ...prev,
      [day]: optimized.map((c) => c.id),
    }));
  };

  const scheduleOptimize = (day) => {
    if (!day) return;

    clearTimeout(debounceRef.current[day]);

    debounceRef.current[day] = setTimeout(() => {
      rebuildDay(day);
    }, 900);
  };

  const handleDragStart = (event) => {
    const item = activeCustomers.find((c) => c.id === event.active.id);
    setActiveItem(item || null);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    setActiveItem(null);
    if (!over) return;

    const customer = activeCustomers.find((c) => c.id === active.id);
    if (!customer || customer.locked) return;

    const sourceDay = customer.service_day;
    const targetDay = getTargetDay(over.id);

    if (!targetDay || !DAYS.includes(targetDay)) return;
    if (sourceDay === targetDay) return;

    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customer.id ? { ...c, service_day: targetDay } : c
      )
    );

    setRouteOrders((prev) => ({
      ...prev,
      [sourceDay]: (prev[sourceDay] || []).filter((id) => id !== customer.id),
      [targetDay]: [
        ...(prev[targetDay] || []).filter((id) => id !== customer.id),
        customer.id,
      ],
    }));

    const { error } = await supabase
      .from("customers")
      .update({ service_day: targetDay })
      .eq("id", customer.id);

    if (error) {
      console.error("Service day update error:", error);
      loadCustomers();
      return;
    }

    scheduleOptimize(sourceDay);
    scheduleOptimize(targetDay);
  };

  const renderDays = () => (
    <Grid container spacing={3}>
      {DAYS.map((day) => {
        const dayCustomers = getCustomersForDay(day);

        return (
          <Grid item xs={12} md={4} key={day}>
            <DayColumn day={day}>
              <Paper sx={{ p: 3, minHeight: 420 }}>
                <Typography variant="h6">{day}</Typography>

                <Typography color="text.secondary">
                  Active Stops: {dayCustomers.length}
                </Typography>

                <Button
                  variant="contained"
                  size="small"
                  sx={{ mt: 1, mb: 2 }}
                  onClick={() => rebuildDay(day)}
                  disabled={loading}
                >
                  Optimize Route
                </Button>

                <Divider sx={{ my: 2 }} />

                <SortableContext
                  items={dayCustomers.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {dayCustomers.map((customer) => (
                    <div key={customer.id}>
                      <SortableItem
                        id={customer.id}
                        customer={customer}
                        disabled={customer.locked}
                      />

                      <Button
                        size="small"
                        sx={{ mt: 0.5 }}
                        color={customer.locked ? "error" : "primary"}
                        variant="outlined"
                        onClick={() => toggleLock(customer)}
                      >
                        {customer.locked ? "Locked" : "Unlocked"}
                      </Button>
                    </div>
                  ))}
                </SortableContext>

                {dayCustomers.length === 0 && (
                  <Typography color="text.secondary">
                    Drop active customers here
                  </Typography>
                )}
              </Paper>
            </DayColumn>
          </Grid>
        );
      })}
    </Grid>
  );

  const renderDriver = () => {
    const ordered = [...activeCustomers].sort((a, b) => {
      const aDay = DAYS.indexOf(a.service_day);
      const bDay = DAYS.indexOf(b.service_day);

      return (aDay === -1 ? 99 : aDay) - (bDay === -1 ? 99 : bDay);
    });

    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3, minHeight: 500 }}>
            <Typography variant="h6">
              🚚 Driver Mode
            </Typography>

            <Typography color="text.secondary">
              Active Stops: {ordered.length}
            </Typography>

            <Divider sx={{ my: 2 }} />

            <SortableContext
              items={ordered.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {ordered.map((customer, index) => (
                <div key={customer.id}>
                  <Typography variant="caption" sx={{ opacity: 0.6 }}>
                    Stop #{index + 1} • {customer.service_day || "Unassigned"}
                  </Typography>

                  <SortableItem
                    id={customer.id}
                    customer={customer}
                    disabled={customer.locked}
                  />

                  <Button
                    size="small"
                    sx={{ mt: 0.5 }}
                    color={customer.locked ? "error" : "primary"}
                    variant="outlined"
                    onClick={() => toggleLock(customer)}
                  >
                    {customer.locked ? "Locked" : "Unlocked"}
                  </Button>
                </div>
              ))}
            </SortableContext>

            {ordered.length === 0 && (
              <Typography color="text.secondary">
                No active customers
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 2 }}>
        Dispatch Board
      </Typography>

      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={(_, v) => v && setMode(v)}
        sx={{ mb: 3 }}
      >
        <ToggleButton value="days">Day Mode</ToggleButton>
        <ToggleButton value="drivers">Driver Mode</ToggleButton>
      </ToggleButtonGroup>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {mode === "days" ? renderDays() : renderDriver()}

        <DragOverlay>
          {activeItem ? (
            <Paper sx={{ p: 1, maxWidth: 240 }}>
              {activeItem.first_name} {activeItem.last_name}
            </Paper>
          ) : null}
        </DragOverlay>
      </DndContext>
    </Box>
  );
}