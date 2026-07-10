import {
  Drawer,
  Box,
  Typography,
  Divider,
  Chip,
  Stack,
  IconButton,
  Button,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import HomeIcon from "@mui/icons-material/Home";
import PetsIcon from "@mui/icons-material/Pets";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import LockIcon from "@mui/icons-material/Lock";
import NotesIcon from "@mui/icons-material/Notes";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";

function formatCurrency(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
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
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatFrequency(value) {
  if (!value) return "Not available";

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getSubscriptionColor(status) {
  switch (String(status || "").toLowerCase()) {
    case "active":
    case "trialing":
      return "success";

    case "past_due":
    case "unpaid":
      return "warning";

    case "canceled":
    case "cancelled":
    case "incomplete_expired":
      return "error";

    default:
      return "default";
  }
}

function DetailRow({ icon, label, value }) {
  return (
    <Stack
      direction="row"
      spacing={1.25}
      alignItems="flex-start"
      sx={{
        py: 0.75,
        width: "100%",
        minWidth: 0,
      }}
    >
      <Box
        sx={{
          color: "text.secondary",
          display: "flex",
          alignItems: "center",
          mt: 0.25,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>

      <Box
        sx={{
          minWidth: 0,
          flex: 1,
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
          variant="body1"
          sx={{
            overflowWrap: "anywhere",
            wordBreak: "break-word",
            minWidth: 0,
          }}
        >
          {value || "Not available"}
        </Typography>
      </Box>
    </Stack>
  );
}

function SectionTitle({ children }) {
  return (
    <Typography
      variant="h6"
      fontWeight="bold"
      sx={{
        mb: 1.25,
        fontSize: {
          xs: "1.05rem",
          sm: "1.25rem",
        },
      }}
    >
      {children}
    </Typography>
  );
}

export default function CustomerDetailsDrawer({
  open,
  onClose,
  customer,
}) {
  if (!customer) return null;

  const fullName =
    `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
    "Customer";

  const subscriptionStatus =
    customer.subscription_status ||
    customer.stripe_subscription_status ||
    "Unknown";

  const nextBillingDate =
    customer.next_billing_date ||
    customer.current_period_end ||
    customer.stripe_current_period_end;

  const monthlyAmount =
    customer.monthly_amount ??
    customer.monthly_total ??
    customer.subscription_amount;

  const lifetimeRevenue =
    customer.lifetime_revenue ??
    customer.total_revenue ??
    customer.total_paid;

  const dogCount =
    customer.dogs ??
    customer.dog_count ??
    "Not available";

  const propertyAddress = [
    customer.address,
    customer.city,
    customer.state,
    customer.zip,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: true,
      }}
      PaperProps={{
        sx: {
          width: {
            xs: "100vw",
            sm: 460,
          },
          maxWidth: "100vw",
          minWidth: 0,
          boxSizing: "border-box",
          overflowX: "hidden",
        },
      }}
      sx={{
        "& .MuiDrawer-paper": {
          left: {
            xs: 0,
            sm: "auto",
          },
          right: 0,
          margin: 0,
        },
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: "100vw",
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          overflowX: "hidden",
          boxSizing: "border-box",
        }}
      >
        <Box
          sx={{
            px: {
              xs: 2,
              sm: 3,
            },
            pt: {
              xs: "max(16px, env(safe-area-inset-top))",
              sm: 3,
            },
            pb: 2,
            position: "sticky",
            top: 0,
            bgcolor: "background.paper",
            zIndex: 2,
            borderBottom: 1,
            borderColor: "divider",
            boxSizing: "border-box",
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            spacing={1.5}
            sx={{
              width: "100%",
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                minWidth: 0,
                flex: 1,
              }}
            >
              <Typography
                variant="h5"
                fontWeight="bold"
                sx={{
                  overflowWrap: "anywhere",
                  lineHeight: 1.2,
                  fontSize: {
                    xs: "1.55rem",
                    sm: "1.75rem",
                  },
                }}
              >
                {fullName}
              </Typography>

              <Typography color="text.secondary">
                Relief Club Member
              </Typography>
            </Box>

            <IconButton
              onClick={onClose}
              aria-label="Close customer details"
              sx={{
                flexShrink: 0,
                mt: -0.5,
                mr: -0.5,
              }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            sx={{
              mt: 2,
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Chip
              label={customer.status || "Active Customer"}
              color={
                String(customer.status || "").toLowerCase() === "active"
                  ? "success"
                  : "default"
              }
              size="small"
            />

            <Chip
              label={customer.service_plan || "No Plan"}
              variant="outlined"
              size="small"
              sx={{
                maxWidth: "100%",
                "& .MuiChip-label": {
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                },
              }}
            />
          </Stack>
        </Box>

        <Box
          sx={{
            px: {
              xs: 2,
              sm: 3,
            },
            pt: 2,
            pb: {
              xs: "max(24px, env(safe-area-inset-bottom))",
              sm: 3,
            },
            flexGrow: 1,
            width: "100%",
            minWidth: 0,
            boxSizing: "border-box",
            overflowX: "hidden",
          }}
        >
          <SectionTitle>Billing & Subscription</SectionTitle>

          <Box
            sx={{
              p: {
                xs: 1.5,
                sm: 2,
              },
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              bgcolor: "background.default",
              width: "100%",
              minWidth: 0,
              boxSizing: "border-box",
            }}
          >
            <Stack
              direction={{
                xs: "column",
                sm: "row",
              }}
              justifyContent="space-between"
              alignItems={{
                xs: "flex-start",
                sm: "center",
              }}
              spacing={1}
              sx={{ mb: 1 }}
            >
              <Typography fontWeight="bold">
                Stripe Subscription
              </Typography>

              <Chip
                label={formatFrequency(subscriptionStatus)}
                color={getSubscriptionColor(subscriptionStatus)}
                size="small"
              />
            </Stack>

            <DetailRow
              icon={<CreditCardIcon fontSize="small" />}
              label="Next Billing Date"
              value={formatDate(nextBillingDate)}
            />

            <DetailRow
              icon={<AttachMoneyIcon fontSize="small" />}
              label="Monthly Amount"
              value={formatCurrency(monthlyAmount)}
            />

            <DetailRow
              icon={<ReceiptLongIcon fontSize="small" />}
              label="Lifetime Revenue"
              value={formatCurrency(lifetimeRevenue)}
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          <SectionTitle>Contact</SectionTitle>

          <DetailRow
            icon={<PhoneIcon fontSize="small" />}
            label="Phone"
            value={customer.phone}
          />

          <DetailRow
            icon={<EmailIcon fontSize="small" />}
            label="Email"
            value={customer.email}
          />

          <Stack
            direction={{
              xs: "column",
              sm: "row",
            }}
            spacing={1}
            sx={{
              mt: 1.5,
              width: "100%",
            }}
          >
            <Button
              fullWidth
              variant="outlined"
              startIcon={<PhoneIcon />}
              href={
                customer.phone
                  ? `tel:${customer.phone}`
                  : undefined
              }
              disabled={!customer.phone}
            >
              Call
            </Button>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<EmailIcon />}
              href={
                customer.email
                  ? `mailto:${customer.email}`
                  : undefined
              }
              disabled={!customer.email}
            >
              Email
            </Button>
          </Stack>

          <Divider sx={{ my: 3 }} />

          <SectionTitle>Property</SectionTitle>

          <DetailRow
            icon={<HomeIcon fontSize="small" />}
            label="Service Address"
            value={propertyAddress}
          />

          <Divider sx={{ my: 3 }} />

          <SectionTitle>Dogs</SectionTitle>

          <DetailRow
            icon={<PetsIcon fontSize="small" />}
            label="Number of Dogs"
            value={String(dogCount)}
          />

          <DetailRow
            icon={<PetsIcon fontSize="small" />}
            label="Dog Names"
            value={customer.dog_names || "None provided"}
          />

          <Divider sx={{ my: 3 }} />

          <SectionTitle>Service</SectionTitle>

          <DetailRow
            icon={<CalendarMonthIcon fontSize="small" />}
            label="Membership Plan"
            value={customer.service_plan}
          />

          <DetailRow
            icon={<CalendarMonthIcon fontSize="small" />}
            label="Frequency"
            value={formatFrequency(customer.service_frequency)}
          />

          <DetailRow
            icon={<CalendarMonthIcon fontSize="small" />}
            label="Service Day"
            value={
              customer.service_days ||
              customer.service_day ||
              "Not assigned"
            }
          />

          {customer.zone && (
            <DetailRow
              icon={<HomeIcon fontSize="small" />}
              label="Route Zone"
              value={customer.zone}
            />
          )}

          <Divider sx={{ my: 3 }} />

          <SectionTitle>Property Access</SectionTitle>

          <DetailRow
            icon={<LockIcon fontSize="small" />}
            label="Gate Code"
            value={customer.gate_code || "None provided"}
          />

          <DetailRow
            icon={<LockIcon fontSize="small" />}
            label="Access Instructions"
            value={
              customer.access_instructions ||
              "No access instructions"
            }
          />

          <Divider sx={{ my: 3 }} />

          <SectionTitle>Notes</SectionTitle>

          <DetailRow
            icon={<NotesIcon fontSize="small" />}
            label="Customer Notes"
            value={customer.notes || "No notes"}
          />

          {customer.stripe_customer_id && (
            <>
              <Divider sx={{ my: 3 }} />

              <Typography
                variant="caption"
                color="text.secondary"
              >
                Stripe Customer ID
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                }}
              >
                {customer.stripe_customer_id}
              </Typography>
            </>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}