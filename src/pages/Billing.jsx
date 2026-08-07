import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Alert,
  Box,
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

import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import CloseIcon from "@mui/icons-material/Close";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import GroupsIcon from "@mui/icons-material/Groups";
import PaidIcon from "@mui/icons-material/Paid";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

import { DataGrid } from "@mui/x-data-grid";
import { useSearchParams } from "react-router-dom";

import { supabase } from "../lib/supabase";

const BRAND_GREEN = "#1B5E20";
const PAGE_BACKGROUND = "#f5f7fa";

const ACTIVE_STATUSES = new Set([
  "active",
  "trialing",
]);

const FAILED_STATUSES = new Set([
  "past_due",
  "unpaid",
  "incomplete",
  "incomplete_expired",
]);

const CANCELED_STATUSES = new Set([
  "canceled",
  "cancelled",
  "inactive",
]);

function cleanText(value) {
  return String(value ?? "").trim();
}

function toNumber(value) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
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

  if (ACTIVE_STATUSES.has(status)) {
    return "success";
  }

  if (FAILED_STATUSES.has(status)) {
    return "warning";
  }

  if (CANCELED_STATUSES.has(status)) {
    return "error";
  }

  return "default";
}

function getCustomerName(customer) {
  const name = [
    customer?.first_name,
    customer?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || "Unnamed Customer";
}

function getInitials(customer) {
  const name = getCustomerName(customer);

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function SummaryCard({
  title,
  value,
  helper,
  icon,
  tone = "default",
}) {
  const toneStyles = {
    default: {
      color: "#173b20",
      backgroundColor: "white",
      iconBackground: "#E8F5E9",
      iconColor: BRAND_GREEN,
    },
    warning: {
      color: "#7A4200",
      backgroundColor: "#FFF8E8",
      iconBackground: "#FFE8B0",
      iconColor: "#A65A00",
    },
    error: {
      color: "#7A1C1C",
      backgroundColor: "#FFF0F0",
      iconBackground: "#FFD7D7",
      iconColor: "#B3261E",
    },
  };

  const styles =
    toneStyles[tone] ||
    toneStyles.default;

  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        backgroundColor:
          styles.backgroundColor,
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
              color={styles.color}
              mt={0.5}
              sx={{
                overflowWrap: "anywhere",
              }}
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
              flexShrink: 0,
              display: "grid",
              placeItems: "center",
              backgroundColor:
                styles.iconBackground,
              color: styles.iconColor,
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
  label,
  value,
  highlight = false,
}) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="flex-start"
      spacing={2}
      sx={{
        py: 1.1,
      }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
      >
        {label}
      </Typography>

      <Typography
        variant="body2"
        fontWeight={highlight ? 800 : 650}
        textAlign="right"
        sx={{
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

export default function Billing() {
  const theme = useTheme();
  const mobileLayout = useMediaQuery(
    theme.breakpoints.down("md")
  );

  const [searchParams] =
    useSearchParams();

  const failedOnly =
    searchParams.get("filter") === "failed";

  const [customers, setCustomers] =
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
    useState(
      failedOnly
        ? "failed"
        : "all"
    );

  const [
    selectedCustomer,
    setSelectedCustomer,
  ] = useState(null);

  const loadCustomers = useCallback(
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
        .from("customers")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (queryError) {
        console.error(
          "Could not load billing customers:",
          queryError
        );

        setError(
          queryError.message ||
            "Billing information could not be loaded."
        );
      } else {
        setCustomers(data ?? []);
      }

      setLoading(false);
      setRefreshing(false);
    },
    []
  );

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const billingCustomers = useMemo(
    () =>
      customers.filter((customer) => {
        return Boolean(
          cleanText(
            customer.stripe_customer_id
          ) ||
            cleanText(
              customer.stripe_subscription_id
            ) ||
            cleanText(
              customer.subscription_status
            ) ||
            toNumber(
              customer.monthly_amount
            ) > 0 ||
            toNumber(
              customer.lifetime_revenue
            ) > 0
        );
      }),
    [customers]
  );

  const summary = useMemo(() => {
    const activeCustomers =
      billingCustomers.filter((customer) =>
        ACTIVE_STATUSES.has(
          normalizeStatus(
            customer.subscription_status
          )
        )
      );

    const failedCustomers =
      billingCustomers.filter((customer) =>
        FAILED_STATUSES.has(
          normalizeStatus(
            customer.subscription_status
          )
        )
      );

    const canceledCustomers =
      billingCustomers.filter((customer) =>
        CANCELED_STATUSES.has(
          normalizeStatus(
            customer.subscription_status
          )
        )
      );

    const monthlyRecurringRevenue =
      activeCustomers.reduce(
        (total, customer) =>
          total +
          toNumber(
            customer.monthly_amount
          ),
        0
      );

    const lifetimeRevenue =
      billingCustomers.reduce(
        (total, customer) =>
          total +
          toNumber(
            customer.lifetime_revenue
          ),
        0
      );

    const averageRevenue =
      activeCustomers.length > 0
        ? monthlyRecurringRevenue /
          activeCustomers.length
        : 0;

    return {
      monthlyRecurringRevenue,
      activeCount:
        activeCustomers.length,
      failedCount:
        failedCustomers.length,
      canceledCount:
        canceledCustomers.length,
      lifetimeRevenue,
      averageRevenue,
    };
  }, [billingCustomers]);

  const filteredCustomers = useMemo(() => {
    const search = searchValue
      .trim()
      .toLowerCase();

    return billingCustomers.filter(
      (customer) => {
        const status = normalizeStatus(
          customer.subscription_status
        );

        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" &&
            ACTIVE_STATUSES.has(
              status
            )) ||
          (statusFilter === "failed" &&
            FAILED_STATUSES.has(
              status
            )) ||
          (statusFilter === "canceled" &&
            CANCELED_STATUSES.has(
              status
            )) ||
          (statusFilter === "unknown" &&
            !status);

        if (!matchesStatus) {
          return false;
        }

        if (!search) {
          return true;
        }

        const searchableText = [
          getCustomerName(customer),
          customer.email,
          customer.phone,
          customer.service_plan,
          customer.subscription_status,
          customer.stripe_customer_id,
          customer.stripe_subscription_id,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(
          search
        );
      }
    );
  }, [
    billingCustomers,
    searchValue,
    statusFilter,
  ]);

  const columns = useMemo(
    () => [
      {
        field: "name",
        headerName: "Customer",
        minWidth: 190,
        flex: 1.5,
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
              noWrap
              display="block"
            >
              {params.row.email ||
                params.row.phone ||
                "No contact information"}
            </Typography>
          </Box>
        ),
      },
      {
        field: "service_plan",
        headerName: "Plan",
        minWidth: 150,
        flex: 1,
        valueGetter: (value) =>
          value || "No plan",
      },
      {
        field: "subscription_status",
        headerName: "Status",
        minWidth: 140,
        flex: 0.9,
        renderCell: (params) => (
          <Chip
            label={formatStatus(
              params.value
            )}
            color={getStatusColor(
              params.value
            )}
            size="small"
            sx={{
              fontWeight: 700,
            }}
          />
        ),
      },
      {
        field: "monthly_amount",
        headerName: "Monthly",
        minWidth: 120,
        flex: 0.8,
        align: "right",
        headerAlign: "right",
        valueFormatter: (value) =>
          formatCurrency(value),
      },
      {
        field: "next_billing_date",
        headerName: "Next Billing",
        minWidth: 145,
        flex: 1,
        valueFormatter: (value) =>
          formatDate(value),
      },
      {
        field: "lifetime_revenue",
        headerName: "Lifetime",
        minWidth: 125,
        flex: 0.9,
        align: "right",
        headerAlign: "right",
        valueFormatter: (value) =>
          formatCurrency(value),
      },
    ],
    []
  );

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
              Billing
            </Typography>

            <Typography
              color="text.secondary"
              mt={0.5}
            >
              Subscription health, recurring revenue,
              and customer billing details.
            </Typography>
          </Box>

          <Tooltip title="Refresh billing data">
            <span>
              <IconButton
                onClick={() =>
                  loadCustomers({
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

        {failedOnly && (
          <Alert
            severity="warning"
            sx={{
              mb: 2.5,
              borderRadius: 2,
            }}
          >
            Showing customers requiring billing
            attention.
          </Alert>
        )}

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
              xl: "repeat(3, minmax(0, 1fr))",
            },
            gap: 2,
            mb: 2.5,
          }}
        >
          <SummaryCard
            title="Monthly Recurring Revenue"
            value={formatCurrency(
              summary.monthlyRecurringRevenue
            )}
            helper="Active and trialing subscriptions"
            icon={<TrendingUpIcon />}
          />

          <SummaryCard
            title="Active Subscriptions"
            value={summary.activeCount}
            helper="Currently generating recurring revenue"
            icon={<AutorenewIcon />}
          />

          <SummaryCard
            title="Billing Attention"
            value={summary.failedCount}
            helper="Past due, unpaid, or incomplete"
            icon={<ErrorOutlineIcon />}
            tone={
              summary.failedCount > 0
                ? "warning"
                : "default"
            }
          />

          <SummaryCard
            title="Canceled / Inactive"
            value={summary.canceledCount}
            helper="No longer active"
            icon={<CancelOutlinedIcon />}
            tone={
              summary.canceledCount > 0
                ? "error"
                : "default"
            }
          />

          <SummaryCard
            title="Lifetime Revenue"
            value={formatCurrency(
              summary.lifetimeRevenue
            )}
            helper="Recorded across billing customers"
            icon={<PaidIcon />}
          />

          <SummaryCard
            title="Average Active Revenue"
            value={formatCurrency(
              summary.averageRevenue
            )}
            helper="Average monthly amount per active customer"
            icon={<GroupsIcon />}
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
          <Stack
            direction={{
              xs: "column",
              md: "row",
            }}
            spacing={1.5}
            alignItems={{
              xs: "stretch",
              md: "center",
            }}
            sx={{
              p: {
                xs: 1.5,
                sm: 2,
              },
              borderBottom: "1px solid",
              borderColor: "divider",
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
              placeholder="Search customer, plan, phone, email, or Stripe ID"
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

            <FormControl
              size="small"
              sx={{
                minWidth: {
                  xs: "100%",
                  md: 210,
                },
              }}
            >
              <InputLabel>
                Subscription status
              </InputLabel>

              <Select
                value={statusFilter}
                label="Subscription status"
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
              >
                <MenuItem value="all">
                  All billing customers
                </MenuItem>

                <MenuItem value="active">
                  Active / Trialing
                </MenuItem>

                <MenuItem value="failed">
                  Needs attention
                </MenuItem>

                <MenuItem value="canceled">
                  Canceled / Inactive
                </MenuItem>

                <MenuItem value="unknown">
                  Unknown status
                </MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <Box
            sx={{
              width: "100%",
              minHeight: 420,
            }}
          >
            {loading ? (
              <Stack
                alignItems="center"
                justifyContent="center"
                spacing={2}
                sx={{
                  minHeight: 420,
                }}
              >
                <CircularProgress
                  sx={{
                    color: BRAND_GREEN,
                  }}
                />

                <Typography color="text.secondary">
                  Loading billing information…
                </Typography>
              </Stack>
            ) : (
              <DataGrid
                rows={filteredCustomers}
                columns={columns}
                getRowId={(row) => row.id}
                onRowClick={(params) =>
                  setSelectedCustomer(
                    params.row
                  )
                }
                rowHeight={68}
                columnHeaderHeight={54}
                pageSizeOptions={[
                  10,
                  25,
                  50,
                ]}
                initialState={{
                  pagination: {
                    paginationModel: {
                      pageSize: 10,
                      page: 0,
                    },
                  },
                  sorting: {
                    sortModel: [
                      {
                        field:
                          "next_billing_date",
                        sort: "asc",
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
                        minHeight: 240,
                        px: 3,
                        textAlign: "center",
                      }}
                    >
                      <CreditCardIcon
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
                        No billing customers found
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Try changing the search or
                        subscription-status filter.
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
        open={Boolean(
          selectedCustomer
        )}
        onClose={() =>
          setSelectedCustomer(null)
        }
        PaperProps={{
          sx: {
            width: {
              xs: "100%",
              sm: 440,
            },
            maxWidth: "100vw",
          },
        }}
      >
        {selectedCustomer && (
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
                    selectedCustomer
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
                      selectedCustomer
                    )}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    noWrap
                  >
                    {selectedCustomer.service_plan ||
                      "No service plan"}
                  </Typography>

                  <Chip
                    size="small"
                    label={formatStatus(
                      selectedCustomer.subscription_status
                    )}
                    color={getStatusColor(
                      selectedCustomer.subscription_status
                    )}
                    sx={{
                      mt: 1,
                      fontWeight: 700,
                    }}
                  />
                </Box>

                <IconButton
                  aria-label="Close billing details"
                  onClick={() =>
                    setSelectedCustomer(
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
                  Subscription Overview
                </Typography>

                <DetailRow
                  label="Monthly amount"
                  value={formatCurrency(
                    selectedCustomer.monthly_amount
                  )}
                  highlight
                />

                <Divider />

                <DetailRow
                  label="Next billing date"
                  value={formatDate(
                    selectedCustomer.next_billing_date
                  )}
                />

                <Divider />

                <DetailRow
                  label="Lifetime revenue"
                  value={formatCurrency(
                    selectedCustomer.lifetime_revenue
                  )}
                  highlight
                />

                <Divider />

                <DetailRow
                  label="Service plan"
                  value={
                    selectedCustomer.service_plan ||
                    "Not available"
                  }
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
                  Stripe References
                </Typography>

                <DetailRow
                  label="Customer ID"
                  value={
                    selectedCustomer.stripe_customer_id ||
                    "Not available"
                  }
                />

                <Divider />

                <DetailRow
                  label="Subscription ID"
                  value={
                    selectedCustomer.stripe_subscription_id ||
                    "Not available"
                  }
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
                  Customer Contact
                </Typography>

                <DetailRow
                  label="Email"
                  value={
                    selectedCustomer.email ||
                    "Not available"
                  }
                />

                <Divider />

                <DetailRow
                  label="Phone"
                  value={
                    selectedCustomer.phone ||
                    "Not available"
                  }
                />
              </Paper>

              <Alert
                severity="info"
                icon={<AttachMoneyIcon />}
                sx={{
                  mt: 2,
                  borderRadius: 2,
                }}
              >
                Refunds, subscription changes, and
                payment-method management remain in
                Stripe for added safety.
              </Alert>
            </Box>
          </Box>
        )}
      </Drawer>
    </>
  );
}
