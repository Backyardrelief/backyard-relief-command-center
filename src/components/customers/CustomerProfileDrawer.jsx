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
      spacing={1.5}
      alignItems="flex-start"
      sx={{ py: 0.75 }}
    >
      <Box
        sx={{
          color: "text.secondary",
          display: "flex",
          alignItems: "center",
          mt: 0.25,
        }}
      >
        {icon}
      </Box>

      <Box sx={{ minWidth: 0 }}>
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
      sx={{ mb: 1.25 }}
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
      PaperProps={{
        sx: {
          width: {
            xs: "100%",
            sm: 460,
          },
        },
      }}
    >
      <Box
        sx={{
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            p: 3,
            pb: 2,
            position: "sticky",
            top: 0,
            bgcolor: "background.paper",
            zIndex: 2,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            spacing={2}
          >
            <Box>
              <Typography variant="h5" fontWeight="bold">
                {fullName}
              </Typography>

              <Typography color="text.secondary">
                Relief Club Member
              </Typography>
            </Box>

            <IconButton
              onClick={onClose}
              aria-label="Close customer details"
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
            />
          </Stack>
        </Box>

        <Box
          sx={{
            p: 3,
            pt: 2,
            flexGrow: 1,
          }}
        >
          <SectionTitle>Billing & Subscription</SectionTitle>

          <Box
            sx={{
              p: 2,
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              bgcolor: "background.default",
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              spacing={2}
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
            direction="row"
            spacing={1}
            sx={{ mt: 1.5 }}
          >
            <Button
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
                sx={{ overflowWrap: "anywhere" }}
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