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

// -------------------------
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// -------------------------
// TODAY → TOMORROW PRIORITY ENGINE
function getTodayIndex() {
  const jsDay = new Date().getDay(); // Sunday = 0
  const map = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };
  return map[jsDay] ?? 0;
}

function getDayPriority(day) {
  const todayIndex = getTodayIndex();
  const dayIndex = DAYS.indexOf(day);

  if (dayIndex === -1) return 99;

  return (dayIndex - todayIndex + 7) % 7;
}

// -------------------------
function getDispatchScore(customer) {
  const dayPriority = getDayPriority(customer.service_day);
  const lockPenalty = customer.locked ? 0.1 : 0;
  const routeIndex = customer.route_index ?? 0;

  return dayPriority * 10000 + routeIndex + lockPenalty;
}

// -------------------------
function DayColumn({ day, children }) {
  const { setNodeRef, isOver } = useDroppable({ id: day });

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

// -------------------------
export default function Routes() {
  const [customers, setCustomers] = useState([]);
  const [routes, setRoutes] = useState({});
  const [mode, setMode] = useState("days");
  const [activeItem, setActiveItem] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const debounceRef = useRef({});

  // -------------------------
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("customers").select("*");
      setCustomers(data || []);
    };

    load();
  }, []);

  // -------------------------
  const toggleLock = async (customer) => {
    const updated = !customer.locked;

    await supabase
      .from("customers")
      .update({ locked: updated })
      .eq("id", customer.id);

    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customer.id ? { ...c, locked: updated } : c
      )
    );
  };

  // -------------------------
  const rebuildDay = async (day) => {
    const dayCustomers = customers.filter(
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

    setRoutes((prev) => ({
      ...prev,
      [day]: data.route || [],
    }));
  };

  // -------------------------
  const scheduleOptimize = (day) => {
    if (!day) return;

    clearTimeout(debounceRef.current[day]);

    debounceRef.current[day] = setTimeout(() => {
      rebuildDay(day);
    }, 900);
  };

  // -------------------------
  const handleDragStart = (event) => {
    const item = customers.find((c) => c.id === event.active.id);
    setActiveItem(item || null);
  };

  // -------------------------
  const handleDragEnd = async (event) => {
    const { active, over } = event;

    setActiveItem(null);
    if (!over) return;

    const customer = customers.find((c) => c.id === active.id);
    if (!customer || customer.locked) return;

    // -------------------------
    // DAY MODE
    // -------------------------
    if (mode === "days") {
      const sourceDay = customer.service_day;
      const targetDay = over.id;

      if (!DAYS.includes(targetDay)) return;

      if (sourceDay !== targetDay) {
        await supabase
          .from("customers")
          .update({ service_day: targetDay })
          .eq("id", customer.id);

        setCustomers((prev) =>
          prev.map((c) =>
            c.id === customer.id
              ? { ...c, service_day: targetDay }
              : c
          )
        );

        scheduleOptimize(sourceDay);
        scheduleOptimize(targetDay);
      }
    }

    // -------------------------
    // DRIVER MODE
    // -------------------------
    if (mode === "drivers") {
      // IMPORTANT FIX: ALWAYS build from full dataset (prevents empty UI)
      const base = customers.length ? customers : [];

      const filtered = base.filter((c) => !c.locked);

      const ordered = [...filtered, customer].sort(
        (a, b) => getDispatchScore(a) - getDispatchScore(b)
      );

      setRoutes({
        main_driver: ordered,
      });
    }
  };

  // -------------------------
  const renderDays = () => (
    <Grid container spacing={3}>
      {DAYS.map((day) => {
        const dayCustomers = customers.filter(
          (c) => c.service_day === day
        );

        const activeRoute = routes[day]?.length
          ? routes[day]
          : dayCustomers;

        return (
          <Grid item xs={12} md={4} key={day}>
            <DayColumn day={day}>
              <Paper sx={{ p: 3, minHeight: 420 }}>
                <Typography variant="h6">{day}</Typography>

                <Button
                  variant="contained"
                  size="small"
                  sx={{ mt: 1, mb: 2 }}
                  onClick={() => rebuildDay(day)}
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
              </Paper>
            </DayColumn>
          </Grid>
        );
      })}
    </Grid>
  );

  // -------------------------
  const renderDriver = () => {
    // 🔥 FIX: fallback to customers so UI never goes empty
    const base = customers.length ? customers : [];

    const ordered = [...base]
      .filter((c) => c)
      .sort((a, b) => getDispatchScore(a) - getDispatchScore(b));

    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3, minHeight: 500 }}>
            <Typography variant="h6">
              🚚 Driver Mode (Tomorrow-First Intelligence)
            </Typography>

            <Divider sx={{ my: 2 }} />

            <SortableContext
              items={ordered.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {ordered.map((customer, index) => (
                <div key={customer.id}>
                  <Typography variant="caption" sx={{ opacity: 0.6 }}>
                    Stop #{index + 1} • {customer.service_day}
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
          </Paper>
        </Grid>
      </Grid>
    );
  };

  // -------------------------
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