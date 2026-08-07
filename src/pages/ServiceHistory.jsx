import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";

import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import GrassIcon from "@mui/icons-material/Grass";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import NotesIcon from "@mui/icons-material/Notes";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import RefreshIcon from "@mui/icons-material/Refresh";
import RouteIcon from "@mui/icons-material/Route";
import SearchIcon from "@mui/icons-material/Search";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import TodayIcon from "@mui/icons-material/Today";

import { DataGrid } from "@mui/x-data-grid";

import { supabase } from "../lib/supabase";

const BRAND_GREEN = "#1B5E20";
const PAGE_BACKGROUND = "#f5f7fa";

function cleanText(value) {
  return String(value ?? "").trim();
}

function formatStatus(value) {
  const status = cleanText(value);

  if (!status) {
    return "Unknown";
  }

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function normalizeStatus(value) {
  return cleanText(value).toLowerCase();
}

function getStatusColor(value) {
  const status = normalizeStatus(value);

  if (
    status === "completed" ||
    status === "complete" ||
    status === "success"
  ) {
    return "success";
  }

  if (
    status === "failed" ||
    status === "missed" ||
    status === "canceled" ||
    status === "cancelled"
  ) {
    return "error";
  }

  if (
    status === "scheduled" ||
    status === "pending" ||
    status === "in_progress"
  ) {
    return "warning";
  }

  return "default";
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return cleanText(value) || "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return cleanText(value) || "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getCustomer(record) {
  if (!record?.customers) {
    return null;
  }

  if (Array.isArray(record.customers)) {
    return record.customers[0] ?? null;
  }

  return record.customers;
}

function getCustomerName(record) {
  const customer = getCustomer(record);

  const name = [
    customer?.first_name,
    customer?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    name ||
    cleanText(record?.customer_name) ||
    "Unknown Customer"
  );
}

function getInitials(record) {
  return getCustomerName(record)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function getGatePhotoUrl(record) {
  return (
    cleanText(record?.gate_photo_url) ||
    cleanText(record?.photo_url) ||
    cleanText(record?.gate_photo) ||
    ""
  );
}

function getRouteDay(record) {
  return (
    cleanText(record?.route_day) ||
    cleanText(record?.service_day) ||
    cleanText(record?.day) ||
    "Not recorded"
  );
}

function getDriverName(record) {
  return (
    cleanText(record?.driver_name) ||
    cleanText(record?.technician_name) ||
    cleanText(record?.driver_id) ||
    "Not recorded"
  );
}

function getGateConfirmed(record) {
  const values = [
    record?.gate_confirmed,
    record?.gate_secured,
    record?.gate_checked,
    record?.gate_closed,
  ];

  const explicit = values.find(
    (value) =>
      typeof value === "boolean"
  );

  if (typeof explicit === "boolean") {
    return explicit;
  }

  return Boolean(getGatePhotoUrl(record));
}

function getWysiwashUsed(record) {
  const booleanFields = [
    record?.wysiwash_applied,
    record?.wysiwash_used,
    record?.deodorizer_used,
    record?.deodorizer_applied,
    record?.sanitizer_applied,
  ];

  const explicit = booleanFields.find(
    (value) =>
      typeof value === "boolean"
  );

  if (typeof explicit === "boolean") {
    return explicit;
  }

  const textValue = [
    record?.wysiwash,
    record?.deodorizer,
    record?.sanitizer,
  ]
    .map((value) =>
      cleanText(value).toLowerCase()
    )
    .find(Boolean);

  return [
    "yes",
    "true",
    "applied",
    "used",
  ].includes(textValue);
}

function getCompletedAt(record) {
  return (
    record?.completed_at ||
    record?.service_completed_at ||
    record?.updated_at ||
    null
  );
}

function getServiceDate(record) {
  return (
    record?.service_date ||
    record?.completed_at ||
    record?.created_at ||
    null
  );
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayInputValue() {
  return toDateInputValue(new Date());
}

function getThirtyDaysAgoInputValue() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return toDateInputValue(date);
}

function isWithinDateRange(
  value,
  startDate,
  endDate
) {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  if (startDate) {
    const start = new Date(
      `${startDate}T00:00:00`
    );

    if (date < start) {
      return false;
    }
  }

  if (endDate) {
    const end = new Date(
      `${endDate}T23:59:59.999`
    );

    if (date > end) {
      return false;
    }
  }

  return true;
}

function SummaryCard({
  title,
  value,
  helper,
  icon,
  tone = "default",
}) {
  const tones = {
    default: {
      backgroundColor: "white",
      iconBackground: "#E8F5E9",
      iconColor: BRAND_GREEN,
      valueColor: "#173b20",
    },
    warning: {
      backgroundColor: "#FFF8E8",
      iconBackground: "#FFE8B0",
      iconColor: "#A65A00",
      valueColor: "#7A4200",
    },
    error: {
      backgroundColor: "#FFF0F0",
      iconBackground: "#FFD7D7",
      iconColor: "#B3261E",
      valueColor: "#7A1C1C",
    },
  };

  const style =
    tones[tone] || tones.default;

  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        backgroundColor:
          style.backgroundColor,
      }}
    >
      <CardContent
        sx={{
          p: 2.25,
          "&:last-child": {
            pb: 2.25,
          },
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={2}
        >
          <Box minWidth={0}>
            <Typography
              variant="body2"
              color="text.secondary"
              fontWeight={700}
            >
              {title}
            </Typography>

            <Typography
              variant="h4"
              fontWeight={850}
              color={style.valueColor}
              mt={0.5}
            >
              {value}
            </Typography>

            {helper && (
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                mt={0.5}
              >
                {helper}
              </Typography>
            )}
          </Box>

          <Box
            sx={{
              width: 46,
              height: 46,
              borderRadius: 2.5,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              backgroundColor:
                style.iconBackground,
              color: style.iconColor,
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function DetailRow({
  icon,
  label,
  value,
}) {
  return (
    <Stack
      direction="row"
      spacing={1.25}
      alignItems="flex-start"
      sx={{
        py: 1.1,
      }}
    >
      <Box
        sx={{
          color: BRAND_GREEN,
          display: "flex",
          mt: 0.1,
        }}
      >
        {icon}
      </Box>

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
        >
          {label}
        </Typography>

        <Typography
          variant="body2"
          fontWeight={650}
          sx={{
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
          }}
        >
          {value || "Not available"}
        </Typography>
      </Box>
    </Stack>
  );
}

export default function ServiceHistory() {
  const theme = useTheme();
  const mobileLayout = useMediaQuery(
    theme.breakpoints.down("md")
  );

  const [records, setRecords] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [searchValue, setSearchValue] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [photoFilter, setPhotoFilter] =
    useState("all");

  const [wysiwashFilter, setWysiwashFilter] =
    useState("all");

  const [startDate, setStartDate] =
    useState(
      getThirtyDaysAgoInputValue()
    );

  const [endDate, setEndDate] =
    useState(
      getTodayInputValue()
    );

  const [
    selectedRecord,
    setSelectedRecord,
  ] = useState(null);

  const loadHistory = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const {
        data,
        error: queryError,
      } = await supabase
        .from("service_history")
        .select(
          `
            *,
            customers (
              *
            )
          `
        )
        .order("service_date", {
          ascending: false,
        });

      if (queryError) {
        console.error(
          "Could not load service history:",
          queryError
        );

        setError(
          queryError.message ||
            "Service history could not be loaded."
        );
      } else {
        setRecords(data ?? []);
      }

      setLoading(false);
      setRefreshing(false);
    },
    []
  );

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const summary = useMemo(() => {
    const today = getTodayInputValue();

    const todayRecords =
      records.filter((record) =>
        isWithinDateRange(
          getServiceDate(record),
          today,
          today
        )
      );

    const completed =
      records.filter((record) =>
        [
          "completed",
          "complete",
          "success",
        ].includes(
          normalizeStatus(record.status)
        )
      );

    const withPhotos =
      records.filter((record) =>
        Boolean(getGatePhotoUrl(record))
      );

    const withWysiwash =
      records.filter((record) =>
        getWysiwashUsed(record)
      );

    return {
      total: records.length,
      today: todayRecords.length,
      completed: completed.length,
      withPhotos: withPhotos.length,
      withWysiwash: withWysiwash.length,
    };
  }, [records]);

  const filteredRecords = useMemo(() => {
    const search = searchValue
      .trim()
      .toLowerCase();

    return records.filter((record) => {
      const serviceDate =
        getServiceDate(record);

      if (
        !isWithinDateRange(
          serviceDate,
          startDate,
          endDate
        )
      ) {
        return false;
      }

      const status =
        normalizeStatus(record.status);

      if (
        statusFilter !== "all" &&
        status !== statusFilter
      ) {
        return false;
      }

      const hasPhoto =
        Boolean(getGatePhotoUrl(record));

      if (
        photoFilter === "with_photo" &&
        !hasPhoto
      ) {
        return false;
      }

      if (
        photoFilter === "without_photo" &&
        hasPhoto
      ) {
        return false;
      }

      const wysiwashUsed =
        getWysiwashUsed(record);

      if (
        wysiwashFilter === "used" &&
        !wysiwashUsed
      ) {
        return false;
      }

      if (
        wysiwashFilter === "not_used" &&
        wysiwashUsed
      ) {
        return false;
      }

      if (!search) {
        return true;
      }

      const searchableText = [
        getCustomerName(record),
        getDriverName(record),
        getRouteDay(record),
        record.status,
        record.notes,
        record.customer_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(
        search
      );
    });
  }, [
    records,
    searchValue,
    statusFilter,
    photoFilter,
    wysiwashFilter,
    startDate,
    endDate,
  ]);

  const statusOptions = useMemo(() => {
    const statuses = [
      ...new Set(
        records
          .map((record) =>
            normalizeStatus(
              record.status
            )
          )
          .filter(Boolean)
      ),
    ].sort();

    return statuses;
  }, [records]);

  const columns = useMemo(
    () => [
      {
        field: "service_date",
        headerName: "Service Date",
        minWidth: 150,
        flex: 0.9,
        valueGetter: (_value, row) =>
          getServiceDate(row),
        valueFormatter: (value) =>
          formatDate(value),
      },
      {
        field: "customer_name",
        headerName: "Customer",
        minWidth: 190,
        flex: 1.35,
        valueGetter: (_value, row) =>
          getCustomerName(row),
        renderCell: (params) => (
          <Box
            sx={{
              minWidth: 0,
              py: 0.75,
            }}
          >
            <Typography
              fontWeight={750}
              noWrap
            >
              {getCustomerName(
                params.row
              )}
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              noWrap
            >
              {getRouteDay(
                params.row
              )}
            </Typography>
          </Box>
        ),
      },
      {
        field: "driver",
        headerName: "Driver",
        minWidth: 135,
        flex: 0.85,
        valueGetter: (_value, row) =>
          getDriverName(row),
      },
      {
        field: "status",
        headerName: "Status",
        minWidth: 130,
        flex: 0.8,
        renderCell: (params) => (
          <Chip
            size="small"
            label={formatStatus(
              params.value
            )}
            color={getStatusColor(
              params.value
            )}
            sx={{
              fontWeight: 700,
            }}
          />
        ),
      },
      {
        field: "gate_photo",
        headerName: "Gate Photo",
        minWidth: 125,
        flex: 0.75,
        sortable: false,
        valueGetter: (_value, row) =>
          getGatePhotoUrl(row),
        renderCell: (params) =>
          params.value ? (
            <Chip
              size="small"
              icon={
                <PhotoCameraIcon />
              }
              label="Available"
              color="success"
              variant="outlined"
            />
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
            >
              No photo
            </Typography>
          ),
      },
      {
        field: "wysiwash",
        headerName: "WYSIWASH",
        minWidth: 120,
        flex: 0.75,
        valueGetter: (_value, row) =>
          getWysiwashUsed(row),
        renderCell: (params) => (
          <Chip
            size="small"
            label={
              params.value
                ? "Applied"
                : "Not used"
            }
            color={
              params.value
                ? "success"
                : "default"
            }
            variant={
              params.value
                ? "filled"
                : "outlined"
            }
          />
        ),
      },
      {
        field: "notes",
        headerName: "Notes",
        minWidth: 220,
        flex: 1.4,
        valueGetter: (value) =>
          cleanText(value) ||
          "No notes",
      },
    ],
    []
  );

  const resetFilters = () => {
    setSearchValue("");
    setStatusFilter("all");
    setPhotoFilter("all");
    setWysiwashFilter("all");
    setStartDate(
      getThirtyDaysAgoInputValue()
    );
    setEndDate(
      getTodayInputValue()
    );
  };

  return (
    <>
      <Box
        sx={{
          width: "100%",
          minHeight: "100%",
          backgroundColor:
            PAGE_BACKGROUND,
          p: {
            xs: 1.5,
            sm: 2.5,
            lg: 3,
          },
          boxSizing: "border-box",
        }}
      >
        <Stack
          direction={{
            xs: "column",
            sm: "row",
          }}
          alignItems={{
            xs: "stretch",
            sm: "center",
          }}
          justifyContent="space-between"
          spacing={2}
          mb={2.5}
        >
          <Box>
            <Typography
              variant="h4"
              fontWeight={850}
              color="#173b20"
            >
              Service History
            </Typography>

            <Typography
              color="text.secondary"
              mt={0.5}
            >
              Completed visits, gate security,
              WYSIWASH use, photos, and service notes.
            </Typography>
          </Box>

          <Tooltip title="Refresh service history">
            <span>
              <IconButton
                onClick={() =>
                  loadHistory({
                    silent: true,
                  })
                }
                disabled={refreshing}
                sx={{
                  width: 46,
                  height: 46,
                  alignSelf: {
                    xs: "flex-end",
                    sm: "center",
                  },
                  backgroundColor: "white",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                {refreshing ? (
                  <CircularProgress
                    size={21}
                  />
                ) : (
                  <RefreshIcon />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 2.5,
              borderRadius: 2,
            }}
          >
            {error}
          </Alert>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              xl: "repeat(5, minmax(0, 1fr))",
            },
            gap: 2,
            mb: 2.5,
          }}
        >
          <SummaryCard
            title="Total Visits"
            value={summary.total}
            helper="All recorded service visits"
            icon={<CalendarMonthIcon />}
          />

          <SummaryCard
            title="Today's Visits"
            value={summary.today}
            helper="Recorded today"
            icon={<TodayIcon />}
          />

          <SummaryCard
            title="Completed"
            value={summary.completed}
            helper="Successfully finished visits"
            icon={<CheckCircleOutlineIcon />}
          />

          <SummaryCard
            title="Gate Photos"
            value={summary.withPhotos}
            helper="Visits with photo proof"
            icon={<PhotoCameraIcon />}
          />

          <SummaryCard
            title="WYSIWASH Applied"
            value={summary.withWysiwash}
            helper="Sanitizer applications recorded"
            icon={<GrassIcon />}
          />
        </Box>

        <Paper
          elevation={0}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3,
            overflow: "hidden",
            backgroundColor: "white",
          }}
        >
          <Box
            sx={{
              p: {
                xs: 1.5,
                sm: 2,
              },
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Stack
              direction={{
                xs: "column",
                lg: "row",
              }}
              spacing={1.5}
              alignItems={{
                xs: "stretch",
                lg: "center",
              }}
            >
              <TextField
                fullWidth
                size="small"
                value={searchValue}
                onChange={(event) =>
                  setSearchValue(
                    event.target.value
                  )
                }
                placeholder="Search customer, driver, route, or notes"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon
                        fontSize="small"
                        color="action"
                      />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                size="small"
                type="date"
                label="Start date"
                value={startDate}
                onChange={(event) =>
                  setStartDate(
                    event.target.value
                  )
                }
                InputLabelProps={{
                  shrink: true,
                }}
                sx={{
                  minWidth: {
                    xs: "100%",
                    lg: 160,
                  },
                }}
              />

              <TextField
                size="small"
                type="date"
                label="End date"
                value={endDate}
                onChange={(event) =>
                  setEndDate(
                    event.target.value
                  )
                }
                InputLabelProps={{
                  shrink: true,
                }}
                sx={{
                  minWidth: {
                    xs: "100%",
                    lg: 160,
                  },
                }}
              />
            </Stack>

            <Stack
              direction={{
                xs: "column",
                md: "row",
              }}
              spacing={1.5}
              mt={1.5}
            >
              <FormControl
                size="small"
                sx={{
                  minWidth: {
                    xs: "100%",
                    md: 180,
                  },
                }}
              >
                <InputLabel>Status</InputLabel>

                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value
                    )
                  }
                >
                  <MenuItem value="all">
                    All statuses
                  </MenuItem>

                  {statusOptions.map(
                    (status) => (
                      <MenuItem
                        key={status}
                        value={status}
                      >
                        {formatStatus(status)}
                      </MenuItem>
                    )
                  )}
                </Select>
              </FormControl>

              <FormControl
                size="small"
                sx={{
                  minWidth: {
                    xs: "100%",
                    md: 180,
                  },
                }}
              >
                <InputLabel>
                  Gate photo
                </InputLabel>

                <Select
                  value={photoFilter}
                  label="Gate photo"
                  onChange={(event) =>
                    setPhotoFilter(
                      event.target.value
                    )
                  }
                >
                  <MenuItem value="all">
                    All visits
                  </MenuItem>

                  <MenuItem value="with_photo">
                    With photo
                  </MenuItem>

                  <MenuItem value="without_photo">
                    Missing photo
                  </MenuItem>
                </Select>
              </FormControl>

              <FormControl
                size="small"
                sx={{
                  minWidth: {
                    xs: "100%",
                    md: 190,
                  },
                }}
              >
                <InputLabel>
                  WYSIWASH
                </InputLabel>

                <Select
                  value={wysiwashFilter}
                  label="WYSIWASH"
                  onChange={(event) =>
                    setWysiwashFilter(
                      event.target.value
                    )
                  }
                >
                  <MenuItem value="all">
                    All visits
                  </MenuItem>

                  <MenuItem value="used">
                    Applied
                  </MenuItem>

                  <MenuItem value="not_used">
                    Not applied
                  </MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="outlined"
                startIcon={<FilterAltIcon />}
                onClick={resetFilters}
                sx={{
                  minWidth: {
                    xs: "100%",
                    md: 140,
                  },
                }}
              >
                Reset
              </Button>
            </Stack>
          </Box>

          <Box
            sx={{
              width: "100%",
              minHeight: 460,
            }}
          >
            {loading ? (
              <Stack
                alignItems="center"
                justifyContent="center"
                spacing={2}
                sx={{
                  minHeight: 460,
                }}
              >
                <CircularProgress
                  sx={{
                    color: BRAND_GREEN,
                  }}
                />

                <Typography color="text.secondary">
                  Loading service history…
                </Typography>
              </Stack>
            ) : (
              <DataGrid
                rows={filteredRecords}
                columns={columns}
                getRowId={(row) => row.id}
                onRowClick={(params) =>
                  setSelectedRecord(
                    params.row
                  )
                }
                rowHeight={68}
                columnHeaderHeight={54}
                pageSizeOptions={[
                  10,
                  25,
                  50,
                  100,
                ]}
                initialState={{
                  pagination: {
                    paginationModel: {
                      pageSize: 25,
                      page: 0,
                    },
                  },
                  sorting: {
                    sortModel: [
                      {
                        field:
                          "service_date",
                        sort: "desc",
                      },
                    ],
                  },
                }}
                disableRowSelectionOnClick
                sx={{
                  border: 0,

                  "& .MuiDataGrid-row": {
                    cursor: "pointer",
                  },

                  "& .MuiDataGrid-row:hover": {
                    backgroundColor:
                      "#F4FAF4",
                  },

                  "& .MuiDataGrid-columnHeaders": {
                    backgroundColor:
                      "#F7F9F7",
                  },

                  "& .MuiDataGrid-cell": {
                    display: "flex",
                    alignItems: "center",
                  },
                }}
                slots={{
                  noRowsOverlay: () => (
                    <Stack
                      alignItems="center"
                      justifyContent="center"
                      spacing={1}
                      sx={{
                        height: "100%",
                        minHeight: 260,
                        px: 3,
                        textAlign: "center",
                      }}
                    >
                      <EventBusyIcon
                        sx={{
                          fontSize: 48,
                          color:
                            "text.disabled",
                        }}
                      />

                      <Typography
                        variant="h6"
                        fontWeight={750}
                      >
                        No service records found
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Try changing the date range
                        or filters.
                      </Typography>
                    </Stack>
                  ),
                }}
              />
            )}
          </Box>
        </Paper>
      </Box>

      <Drawer
        anchor="right"
        open={Boolean(selectedRecord)}
        onClose={() =>
          setSelectedRecord(null)
        }
        PaperProps={{
          sx: {
            width: {
              xs: "100%",
              sm: 460,
            },
            maxWidth: "100vw",
          },
        }}
      >
        {selectedRecord && (
          <Box
            sx={{
              minHeight: "100%",
              backgroundColor:
                PAGE_BACKGROUND,
            }}
          >
            <Box
              sx={{
                position: "sticky",
                top: 0,
                zIndex: 2,
                p: {
                  xs: 2,
                  sm: 2.5,
                },
                pt: {
                  xs: "max(16px, env(safe-area-inset-top))",
                  sm: 2.5,
                },
                backgroundColor: "white",
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Stack
                direction="row"
                alignItems="flex-start"
                spacing={1.5}
              >
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    backgroundColor:
                      "#E8F5E9",
                    color: BRAND_GREEN,
                    fontWeight: 850,
                    fontSize: 18,
                  }}
                >
                  {getInitials(
                    selectedRecord
                  )}
                </Box>

                <Box
                  flex={1}
                  minWidth={0}
                >
                  <Typography
                    variant="h6"
                    fontWeight={850}
                    noWrap
                  >
                    {getCustomerName(
                      selectedRecord
                    )}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    {formatDate(
                      getServiceDate(
                        selectedRecord
                      )
                    )}
                  </Typography>

                  <Chip
                    size="small"
                    label={formatStatus(
                      selectedRecord.status
                    )}
                    color={getStatusColor(
                      selectedRecord.status
                    )}
                    sx={{
                      mt: 1,
                      fontWeight: 700,
                    }}
                  />
                </Box>

                <IconButton
                  aria-label="Close service details"
                  onClick={() =>
                    setSelectedRecord(
                      null
                    )
                  }
                >
                  <CloseIcon />
                </IconButton>
              </Stack>
            </Box>

            <Box
              sx={{
                p: {
                  xs: 2,
                  sm: 2.5,
                },
                pb: {
                  xs: "max(24px, env(safe-area-inset-bottom))",
                  sm: 3,
                },
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 3,
                }}
              >
                <Typography
                  variant="subtitle1"
                  fontWeight={800}
                  mb={0.5}
                >
                  Visit Details
                </Typography>

                <DetailRow
                  icon={
                    <CalendarMonthIcon fontSize="small" />
                  }
                  label="Service date"
                  value={formatDate(
                    getServiceDate(
                      selectedRecord
                    )
                  )}
                />

                <Divider />

                <DetailRow
                  icon={
                    <CheckCircleOutlineIcon fontSize="small" />
                  }
                  label="Completed at"
                  value={formatDateTime(
                    getCompletedAt(
                      selectedRecord
                    )
                  )}
                />

                <Divider />

                <DetailRow
                  icon={
                    <RouteIcon fontSize="small" />
                  }
                  label="Route / service day"
                  value={getRouteDay(
                    selectedRecord
                  )}
                />

                <Divider />

                <DetailRow
                  icon={
                    <PersonOutlineIcon fontSize="small" />
                  }
                  label="Driver"
                  value={getDriverName(
                    selectedRecord
                  )}
                />
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  mt: 2,
                  p: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 3,
                }}
              >
                <Typography
                  variant="subtitle1"
                  fontWeight={800}
                  mb={0.5}
                >
                  Service Verification
                </Typography>

                <DetailRow
                  icon={
                    <ShieldOutlinedIcon fontSize="small" />
                  }
                  label="Gate confirmed"
                  value={
                    getGateConfirmed(
                      selectedRecord
                    )
                      ? "Yes"
                      : "Not recorded"
                  }
                />

                <Divider />

                <DetailRow
                  icon={
                    <GrassIcon fontSize="small" />
                  }
                  label="WYSIWASH applied"
                  value={
                    getWysiwashUsed(
                      selectedRecord
                    )
                      ? "Yes"
                      : "No"
                  }
                />
              </Paper>

              {getGatePhotoUrl(
                selectedRecord
              ) && (
                <Paper
                  elevation={0}
                  sx={{
                    mt: 2,
                    p: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 3,
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    fontWeight={800}
                    mb={1.5}
                  >
                    Gate Photo
                  </Typography>

                  <Box
                    component="a"
                    href={getGatePhotoUrl(
                      selectedRecord
                    )}
                    target="_blank"
                    rel="noreferrer"
                    sx={{
                      display: "block",
                      borderRadius: 2,
                      overflow: "hidden",
                      lineHeight: 0,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Box
                      component="img"
                      src={getGatePhotoUrl(
                        selectedRecord
                      )}
                      alt="Gate verification"
                      loading="lazy"
                      sx={{
                        display: "block",
                        width: "100%",
                        maxHeight: 360,
                        objectFit: "cover",
                      }}
                    />
                  </Box>

                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={
                      <ImageOutlinedIcon />
                    }
                    href={getGatePhotoUrl(
                      selectedRecord
                    )}
                    target="_blank"
                    rel="noreferrer"
                    sx={{
                      mt: 1.5,
                    }}
                  >
                    Open Full Photo
                  </Button>
                </Paper>
              )}

              <Paper
                elevation={0}
                sx={{
                  mt: 2,
                  p: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 3,
                }}
              >
                <Typography
                  variant="subtitle1"
                  fontWeight={800}
                  mb={0.5}
                >
                  Notes
                </Typography>

                <DetailRow
                  icon={
                    <NotesIcon fontSize="small" />
                  }
                  label="Service notes"
                  value={
                    cleanText(
                      selectedRecord.notes
                    ) || "No notes recorded"
                  }
                />
              </Paper>

              <Alert
                severity="info"
                sx={{
                  mt: 2,
                  borderRadius: 2,
                }}
              >
                Service History is a permanent
                operational record. Customer edits do
                not alter completed visit details.
              </Alert>
            </Box>
          </Box>
        )}
      </Drawer>
    </>
  );
}
