import { useEffect, useRef, useState } from "react";

import {
  Box,
  Typography,
  Grid,
  Paper,
  Divider,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
} from "@mui/material";

import { supabase } from "../lib/supabase";

import {
  DndContext,
  closestCenter,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import SortableItem from "../components/dispatch/SortableItem";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const createOccurrenceId = (customerId, day) =>
  `${customerId}::${day}`;

const parseOccurrenceId = (occurrenceId) => {
  const [customerId, ...dayParts] =
    String(occurrenceId).split("::");

  return {
    customerId,
    day: dayParts.join("::"),
  };
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

const customerIsScheduledForDay = (customer, day) =>
  normalizeServiceDays(customer).includes(day);

const isActiveCustomer = (customer) => {
  const status = String(customer?.status || "")
    .trim()
    .toLowerCase();

  return status === "active";
};

const sortServiceDays = (days) =>
  [...new Set(days)]
    .map(normalizeDayName)
    .filter(Boolean)
    .sort(
      (a, b) => DAYS.indexOf(a) - DAYS.indexOf(b)
    );

function DayColumn({ day, children }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${day}`,
  });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        minHeight: 420,
        borderRadius: 2,
        transition: "0.15s ease",
        border: isOver
          ? "2px solid"
          : "1px solid transparent",
        borderColor: isOver
          ? "primary.main"
          : "transparent",
        bgcolor: isOver
          ? "action.hover"
          : "transparent",
      }}
    >
      {children}
    </Box>
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
      activationConstraint: {
        distance: 5,
      },
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

      Object.values(debounceRef.current).forEach(
        (timeoutId) => {
          clearTimeout(timeoutId);
        }
      );
    };
  }, []);

  const loadCustomers = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Routes customer fetch error:",
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

  const getCustomersForDay = (day) => {
    const dayCustomers = activeCustomers.filter(
      (customer) =>
        customerIsScheduledForDay(customer, day)
    );

    const savedOrder = routeOrders[day];

    if (!savedOrder?.length) {
      return dayCustomers;
    }

    return [...dayCustomers].sort((a, b) => {
      const aIndex = savedOrder.indexOf(a.id);
      const bIndex = savedOrder.indexOf(b.id);

      if (aIndex === -1 && bIndex === -1) {
        return 0;
      }

      if (aIndex === -1) {
        return 1;
      }

      if (bIndex === -1) {
        return -1;
      }

      return aIndex - bIndex;
    });
  };

  const getTargetDay = (overId) => {
    if (!overId) {
      return null;
    }

    const id = String(overId);

    if (id.startsWith("day-")) {
      return normalizeDayName(
        id.replace("day-", "")
      );
    }

    const occurrence = parseOccurrenceId(id);

    return normalizeDayName(occurrence.day);
  };

  const toggleLock = async (customer) => {
    const updatedLockState = !customer.locked;

    const { error } = await supabase
      .from("customers")
      .update({
        locked: updatedLockState,
      })
      .eq("id", customer.id);

    if (error) {
      console.error("Lock update error:", error);
      return;
    }

    setCustomers((previousCustomers) =>
      previousCustomers.map((currentCustomer) =>
        currentCustomer.id === customer.id
          ? {
              ...currentCustomer,
              locked: updatedLockState,
            }
          : currentCustomer
      )
    );
  };

  const rebuildDay = async (day) => {
    const dayCustomers = activeCustomers.filter(
      (customer) =>
        customerIsScheduledForDay(customer, day) &&
        !customer.locked
    );

    if (dayCustomers.length === 0) {
      setRouteOrders((previousOrders) => ({
        ...previousOrders,
        [day]: [],
      }));

      return;
    }

    try {
      const response = await fetch(
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

      if (!response.ok) {
        throw new Error(
          `Route optimization failed with status ${response.status}`
        );
      }

      const data = await response.json();
      const optimizedCustomers = data.route || [];

      setRouteOrders((previousOrders) => ({
        ...previousOrders,
        [day]: optimizedCustomers.map(
          (customer) => customer.id
        ),
      }));
    } catch (error) {
      console.error(
        `Route optimization error for ${day}:`,
        error
      );
    }
  };

  const scheduleOptimize = (day) => {
    if (!day) {
      return;
    }

    clearTimeout(debounceRef.current[day]);

    debounceRef.current[day] = setTimeout(() => {
      rebuildDay(day);
    }, 900);
  };

  const handleDragStart = (event) => {
    const { customerId, day } = parseOccurrenceId(
      event.active.id
    );

    const customer = activeCustomers.find(
      (currentCustomer) =>
        String(currentCustomer.id) ===
        String(customerId)
    );

    setActiveItem(
      customer
        ? {
            customer,
            day,
          }
        : null
    );
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    setActiveItem(null);

    if (!over) {
      return;
    }

    const {
      customerId,
      day: sourceDayValue,
    } = parseOccurrenceId(active.id);

    const sourceDay =
      normalizeDayName(sourceDayValue);

    const customer = activeCustomers.find(
      (currentCustomer) =>
        String(currentCustomer.id) ===
        String(customerId)
    );

    if (!customer || customer.locked) {
      return;
    }

    const targetDay = getTargetDay(over.id);

    if (!sourceDay || !targetDay) {
      return;
    }

    if (sourceDay === targetDay) {
      return;
    }

    const currentDays =
      normalizeServiceDays(customer);

    /*
      Prevent a twice-weekly customer from being
      assigned to the same route day twice.
    */
    if (currentDays.includes(targetDay)) {
      return;
    }

    const updatedDays = sortServiceDays(
      currentDays.map((day) =>
        day === sourceDay ? targetDay : day
      )
    );

    const updatedPrimaryDay =
      updatedDays[0] || targetDay;

    setCustomers((previousCustomers) =>
      previousCustomers.map((currentCustomer) =>
        currentCustomer.id === customer.id
          ? {
              ...currentCustomer,
              service_day: updatedPrimaryDay,
              service_days: updatedDays,
            }
          : currentCustomer
      )
    );

    setRouteOrders((previousOrders) => ({
      ...previousOrders,

      [sourceDay]: (
        previousOrders[sourceDay] || []
      ).filter(
        (id) =>
          String(id) !== String(customer.id)
      ),

      [targetDay]: [
        ...(
          previousOrders[targetDay] || []
        ).filter(
          (id) =>
            String(id) !== String(customer.id)
        ),
        customer.id,
      ],
    }));

    const { error } = await supabase
      .from("customers")
      .update({
        service_day: updatedPrimaryDay,
        service_days: updatedDays,
      })
      .eq("id", customer.id);

    if (error) {
      console.error(
        "Service-day update error:",
        error
      );

      await loadCustomers();
      return;
    }

    scheduleOptimize(sourceDay);
    scheduleOptimize(targetDay);
  };

  const renderDays = () => (
    <Grid container spacing={3}>
      {DAYS.map((day) => {
        const dayCustomers =
          getCustomersForDay(day);

        return (
          <Grid
            item
            xs={12}
            md={6}
            lg={4}
            key={day}
          >
            <DayColumn day={day}>
              <Paper
                sx={{
                  p: 3,
                  minHeight: 420,
                  height: "100%",
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
                  Active Stops: {dayCustomers.length}
                </Typography>

                <Button
                  variant="contained"
                  size="small"
                  sx={{
                    mt: 1,
                    mb: 2,
                  }}
                  onClick={() => rebuildDay(day)}
                  disabled={loading}
                >
                  Optimize Route
                </Button>

                <Divider sx={{ mb: 2 }} />

                <SortableContext
                  items={dayCustomers.map(
                    (customer) =>
                      createOccurrenceId(
                        customer.id,
                        day
                      )
                  )}
                  strategy={
                    verticalListSortingStrategy
                  }
                >
                  {dayCustomers.map((customer) => {
                    const serviceDays =
                      normalizeServiceDays(customer);

                    const occurrenceId =
                      createOccurrenceId(
                        customer.id,
                        day
                      );

                    return (
                      <Box
                        key={occurrenceId}
                        sx={{ mb: 2 }}
                      >
                        {serviceDays.length > 1 && (
                          <Chip
                            size="small"
                            color="secondary"
                            label={`Twice weekly: ${serviceDays.join(
                              " & "
                            )}`}
                            sx={{ mb: 0.75 }}
                          />
                        )}

                        <SortableItem
                          id={occurrenceId}
                          customer={customer}
                          disabled={
                            Boolean(customer.locked)
                          }
                        />

                        <Button
                          size="small"
                          sx={{ mt: 0.5 }}
                          color={
                            customer.locked
                              ? "error"
                              : "primary"
                          }
                          variant="outlined"
                          onClick={() =>
                            toggleLock(customer)
                          }
                        >
                          {customer.locked
                            ? "Locked"
                            : "Unlocked"}
                        </Button>
                      </Box>
                    );
                  })}
                </SortableContext>

                {!loading &&
                  dayCustomers.length === 0 && (
                    <Typography color="text.secondary">
                      No active customers scheduled
                    </Typography>
                  )}

                {loading && (
                  <Typography color="text.secondary">
                    Loading routes…
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
    const occurrences = activeCustomers.flatMap(
      (customer) =>
        normalizeServiceDays(customer).map((day) => ({
          occurrenceId: createOccurrenceId(
            customer.id,
            day
          ),
          customer,
          day,
        }))
    );

    const orderedOccurrences = occurrences.sort(
      (a, b) =>
        DAYS.indexOf(a.day) -
        DAYS.indexOf(b.day)
    );

    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper
            sx={{
              p: 3,
              minHeight: 500,
              borderRadius: 3,
            }}
          >
            <Typography
              variant="h6"
              fontWeight="bold"
            >
              🚚 Driver Mode
            </Typography>

            <Typography color="text.secondary">
              Scheduled Stops:{" "}
              {orderedOccurrences.length}
            </Typography>

            <Divider sx={{ my: 2 }} />

            <SortableContext
              items={orderedOccurrences.map(
                (occurrence) =>
                  occurrence.occurrenceId
              )}
              strategy={
                verticalListSortingStrategy
              }
            >
              {orderedOccurrences.map(
                (
                  {
                    occurrenceId,
                    customer,
                    day,
                  },
                  index
                ) => (
                  <Box
                    key={occurrenceId}
                    sx={{ mb: 2 }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      Stop #{index + 1} • {day}
                    </Typography>

                    <SortableItem
                      id={occurrenceId}
                      customer={customer}
                      disabled={
                        Boolean(customer.locked)
                      }
                    />

                    <Button
                      size="small"
                      sx={{ mt: 0.5 }}
                      color={
                        customer.locked
                          ? "error"
                          : "primary"
                      }
                      variant="outlined"
                      onClick={() =>
                        toggleLock(customer)
                      }
                    >
                      {customer.locked
                        ? "Locked"
                        : "Unlocked"}
                    </Button>
                  </Box>
                )
              )}
            </SortableContext>

            {!loading &&
              orderedOccurrences.length === 0 && (
                <Typography color="text.secondary">
                  No active scheduled customers
                </Typography>
              )}

            {loading && (
              <Typography color="text.secondary">
                Loading driver schedule…
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
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
        sx={{ mb: 2 }}
      >
        Dispatch Board
      </Typography>

      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={(_event, value) => {
          if (value) {
            setMode(value);
          }
        }}
        sx={{
          mb: 3,
          flexWrap: "wrap",
        }}
      >
        <ToggleButton value="days">
          Day Mode
        </ToggleButton>

        <ToggleButton value="drivers">
          Driver Mode
        </ToggleButton>
      </ToggleButtonGroup>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {mode === "days"
          ? renderDays()
          : renderDriver()}

        <DragOverlay>
          {activeItem ? (
            <Paper
              sx={{
                p: 1.5,
                maxWidth: 260,
              }}
            >
              <Typography fontWeight="bold">
                {activeItem.customer.first_name}{" "}
                {activeItem.customer.last_name}
              </Typography>

              <Typography
                variant="caption"
                color="text.secondary"
              >
                {activeItem.day}
              </Typography>
            </Paper>
          ) : null}
        </DragOverlay>
      </DndContext>
    </Box>
  );
}