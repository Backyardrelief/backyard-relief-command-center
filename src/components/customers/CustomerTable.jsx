import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

import {
  Box,
  Button,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Drawer,
  Typography,
  Divider,
  Chip,
  Switch,
  FormControlLabel,
  Alert,
} from "@mui/material";

import { DataGrid } from "@mui/x-data-grid";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";

import { useNavigate } from "react-router-dom";

import CustomerDialog from "./CustomerDialog";
import { eventBus } from "../../lib/eventBus";

const normalizeCustomer = (customer) => ({
  ...customer,
  name: `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim(),
});

const normalizeServiceDays = (customer) => {
  if (
    Array.isArray(customer?.service_days) &&
    customer.service_days.length > 0
  ) {
    return [...new Set(customer.service_days)].filter(Boolean);
  }

  if (customer?.service_day) {
    return [customer.service_day];
  }

  return [];
};

const formatServiceDays = (customer) => {
  const serviceDays = normalizeServiceDays(customer);

  if (serviceDays.length === 0) {
    return "Unassigned";
  }

  return serviceDays.join(" & ");
};

const formatCurrency = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "$0.00";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

const formatDate = (value) => {
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
};

const formatStatus = (value) => {
  if (!value) {
    return "Not Connected";
  }

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getStatusColor = (status) => {
  const normalizedStatus = String(status || "").toLowerCase();

  if (
    normalizedStatus === "active" ||
    normalizedStatus === "trialing"
  ) {
    return "success";
  }

  if (
    normalizedStatus === "past_due" ||
    normalizedStatus === "unpaid"
  ) {
    return "warning";
  }

  if (
    normalizedStatus === "canceled" ||
    normalizedStatus === "cancelled"
  ) {
    return "error";
  }

  return "default";
};

export default function CustomerTable() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [drawerCustomer, setDrawerCustomer] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [savingSmsConsent, setSavingSmsConsent] = useState(false);
  const [smsMessage, setSmsMessage] = useState("");
  const [smsError, setSmsError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase fetch error:", error);
      setLoading(false);
      return;
    }

    setCustomers((data || []).map(normalizeCustomer));
    setLoading(false);
  };

  const handleOpenAdd = () => {
    setSelectedCustomer(null);
    setOpen(true);
  };

  const handleEdit = (customer) => {
    if (!customer) {
      return;
    }

    setSelectedCustomer(customer);
    setOpen(true);
  };

  const handleSave = async (form) => {
    const serviceDays =
      Array.isArray(form.service_days) &&
      form.service_days.length > 0
        ? [...new Set(form.service_days)].filter(Boolean)
        : form.service_day
          ? [form.service_day]
          : [];

    const primaryServiceDay =
      form.service_day || serviceDays[0] || null;

    const payload = {
      first_name: (form.first_name || "").trim(),
      last_name: (form.last_name || "").trim(),
      phone: (form.phone || "").trim(),
      email: (form.email || "").trim(),

      service_plan: form.service_plan || "Relief Plus",

      /*
        Manually created customers need to be active so they
        appear immediately on Routes and Schedule.

        Existing customers keep their current status when edited.
      */
      status:
        form.status ||
        selectedCustomer?.status ||
        "active",

      address: (form.address || "").trim(),
      city: (form.city || "").trim(),
      state: (form.state || "").trim(),
      zip: (form.zip || "").trim(),

      lat:
        form.lat == null || form.lat === ""
          ? null
          : Number(form.lat),

      lng:
        form.lng == null || form.lng === ""
          ? null
          : Number(form.lng),

      zone: form.zone || null,
      zone_id: form.zone_id || null,

      service_day: primaryServiceDay,
      service_days: serviceDays,

      dog_names: (form.dog_names || "").trim(),
      gate_code: (form.gate_code || "").trim(),

      access_instructions: (
        form.access_instructions || ""
      ).trim(),

      notes: (form.notes || "").trim(),

      deodorizer_enabled: Boolean(
        form.deodorizer_enabled
      ),

      deodorizer_frequency:
        form.deodorizer_enabled
          ? form.deodorizer_frequency || "monthly"
          : null,

      last_deodorizer_date:
        form.last_deodorizer_date || null,

      next_deodorizer_date:
        form.deodorizer_enabled
          ? form.next_deodorizer_date || null
          : null,
    };

    if (selectedCustomer) {
      const { data: updated, error } = await supabase
        .from("customers")
        .update(payload)
        .eq("id", selectedCustomer.id)
        .select()
        .single();

      if (error) {
        console.error("Update error:", error);
        throw error;
      }

      const normalized = normalizeCustomer(updated);

      setCustomers((previousCustomers) =>
        previousCustomers.map((customer) =>
          customer.id === selectedCustomer.id
            ? normalized
            : customer
        )
      );

      setDrawerCustomer(normalized);

      eventBus.emit("customersUpdated", updated);
    } else {
      const { data: inserted, error } = await supabase
        .from("customers")
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error("Create error:", error);
        throw error;
      }

      const normalized = normalizeCustomer(inserted);

      setCustomers((previousCustomers) => [
        normalized,
        ...previousCustomers,
      ]);

      eventBus.emit("customersUpdated", inserted);
    }

    setSelectedCustomer(null);
    setOpen(false);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) {
      return;
    }

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", deleteTarget.id);

    if (error) {
      console.error("Delete error:", error);
      return;
    }

    setCustomers((previousCustomers) =>
      previousCustomers.filter(
        (customer) => customer.id !== deleteTarget.id
      )
    );

    if (drawerCustomer?.id === deleteTarget.id) {
      setDrawerCustomer(null);
    }

    setDeleteTarget(null);

    eventBus.emit("customersUpdated");
  };

  const handleSmsConsentChange = async (event) => {
    if (!drawerCustomer) {
      return;
    }

    const enabled = event.target.checked;
    const previousValue = Boolean(drawerCustomer.sms_consent);

    setSmsMessage("");
    setSmsError("");
    setSavingSmsConsent(true);

    setDrawerCustomer((currentCustomer) => ({
      ...currentCustomer,
      sms_consent: enabled,
    }));

    try {
      const now = new Date().toISOString();

      const updates = enabled
        ? {
            sms_consent: true,
            sms_consent_source: "manual_crm",
            sms_consent_at: now,
            sms_consent_timestamp: now,
          }
        : {
            sms_consent: false,
          };

      const { data: updated, error } = await supabase
        .from("customers")
        .update(updates)
        .eq("id", drawerCustomer.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const normalized = normalizeCustomer(updated);

      setDrawerCustomer(normalized);

      setCustomers((previousCustomers) =>
        previousCustomers.map((customer) =>
          customer.id === normalized.id
            ? normalized
            : customer
        )
      );

      setSmsMessage(
        enabled
          ? "SMS service notifications enabled."
          : "SMS service notifications disabled."
      );

      eventBus.emit("customersUpdated", updated);
    } catch (error) {
      console.error("SMS consent update error:", error);

      setDrawerCustomer((currentCustomer) => ({
        ...currentCustomer,
        sms_consent: previousValue,
      }));

      setSmsError(
        error?.message ||
          "SMS settings could not be updated."
      );
    } finally {
      setSavingSmsConsent(false);
    }
  };

  function openCustomerMessages(customer) {
  if (!customer?.id) return;

  setDrawerCustomer(null);

  navigate(
    `/messages?customer=${customer.id}&phone=${encodeURIComponent(
      customer.phone || ""
    )}`
  );
}

  const columns = [
    {
      field: "name",
      headerName: "Name",
      flex: 1.2,
      minWidth: 160,
    },
    {
      field: "phone",
      headerName: "Phone",
      flex: 1,
      minWidth: 120,
    },
    {
      field: "city",
      headerName: "City",
      flex: 1,
      minWidth: 120,
    },
    {
      field: "service_plan",
      headerName: "Plan",
      flex: 1,
      minWidth: 140,
    },
    {
      field: "service_days",
      headerName: "Days",
      flex: 1.2,
      minWidth: 170,
      sortable: false,
      valueGetter: (_value, row) =>
        formatServiceDays(row),
    },
    {
      field: "zone",
      headerName: "Zone",
      flex: 1,
      minWidth: 110,
      valueGetter: (value) => value || "Unassigned",
    },
    {
      field: "subscription_status",
      headerName: "Billing",
      flex: 1,
      minWidth: 130,
      valueGetter: (value) => formatStatus(value),
    },
  ];

  return (
    <Box
      sx={{
        width: "100%",
        minWidth: 0,
      }}
    >
      <Stack
        direction={{
          xs: "column",
          sm: "row",
        }}
        justifyContent="space-between"
        alignItems={{
          xs: "stretch",
          sm: "center",
        }}
        spacing={1.5}
        mb={2}
      >
        <Typography
          component="h2"
          variant="h5"
          fontWeight="bold"
        >
          Customers
        </Typography>

        <Button
          variant="contained"
          onClick={handleOpenAdd}
          sx={{
            width: {
              xs: "100%",
              sm: "auto",
            },
          }}
        >
          Add Customer
        </Button>
      </Stack>

      <Box
        sx={{
          height: 540,
          width: "100%",
          minWidth: 0,
        }}
      >
        <DataGrid
          rows={customers}
          columns={columns}
          loading={loading}
          pageSizeOptions={[5, 10, 25]}
          onRowClick={(params) => {
            setDrawerCustomer(params.row);
            setSmsMessage("");
            setSmsError("");
          }}
          sx={{
            minWidth: 0,

            "& .MuiDataGrid-row": {
              cursor: "pointer",
            },
          }}
        />
      </Box>

      <Drawer
        anchor="right"
        open={Boolean(drawerCustomer)}
        onClose={() => setDrawerCustomer(null)}
        ModalProps={{
          keepMounted: true,
        }}
        PaperProps={{
          sx: {
            width: {
              xs: "100vw",
              sm: 420,
            },
            maxWidth: "100vw",
            height: {
              xs: "100dvh",
              sm: "100%",
            },
            overflow: "hidden",
            boxSizing: "border-box",
          },
        }}
      >
        <Box
          sx={{
            width: "100%",
            height: "100%",
            minWidth: 0,
            overflowY: "auto",
            overflowX: "hidden",
            boxSizing: "border-box",
            p: {
              xs: 2,
              sm: 3,
            },
            pb: {
              xs: "calc(24px + env(safe-area-inset-bottom))",
              sm: 3,
            },
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            spacing={1}
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
                }}
              >
                {drawerCustomer?.name || "Customer"}
              </Typography>

              <Typography
                color="text.secondary"
                sx={{
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                }}
              >
                {drawerCustomer?.email || "No email"}
              </Typography>
            </Box>

            <IconButton
              aria-label="Close customer details"
              onClick={() => setDrawerCustomer(null)}
              sx={{
                flexShrink: 0,
              }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>

          <Box sx={{ mt: 1 }}>
            <Chip
              label={
                drawerCustomer?.status
                  ? formatStatus(drawerCustomer.status)
                  : "Unknown"
              }
              color={
                String(
                  drawerCustomer?.status || ""
                ).toLowerCase() === "active"
                  ? "success"
                  : "default"
              }
              size="small"
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography
            variant="subtitle2"
            color="text.secondary"
          >
            Phone
          </Typography>

          <Typography
            sx={{
              mb: 2,
              overflowWrap: "anywhere",
            }}
          >
            {drawerCustomer?.phone || "—"}
          </Typography>

          <Typography
            variant="subtitle2"
            color="text.secondary"
          >
            Address
          </Typography>

          <Typography
            sx={{
              mb: 2,
              overflowWrap: "anywhere",
            }}
          >
            {drawerCustomer?.address || "—"}

            {(drawerCustomer?.city ||
              drawerCustomer?.state ||
              drawerCustomer?.zip) && (
              <>
                <br />

                {[
                  drawerCustomer?.city,
                  drawerCustomer?.state,
                  drawerCustomer?.zip,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </>
            )}
          </Typography>

          <Typography
            variant="subtitle2"
            color="text.secondary"
          >
            Plan
          </Typography>

          <Typography sx={{ mb: 2 }}>
            {drawerCustomer?.service_plan || "—"}
          </Typography>

          <Typography
            variant="subtitle2"
            color="text.secondary"
          >
            Route Assignment
          </Typography>

          <Typography sx={{ mb: 2 }}>
            {formatServiceDays(drawerCustomer)}
            {" · "}
            {drawerCustomer?.zone || "Unassigned"}
          </Typography>

          {normalizeServiceDays(drawerCustomer).length > 1 && (
            <Chip
              size="small"
              color="secondary"
              label={`Twice weekly: ${formatServiceDays(
                drawerCustomer
              )}`}
              sx={{ mb: 2 }}
            />
          )}

          <Divider sx={{ my: 2 }} />

          <Typography
            variant="h6"
            fontWeight="bold"
            gutterBottom
          >
            Billing
          </Typography>

          <Typography
            variant="subtitle2"
            color="text.secondary"
          >
            Subscription Status
          </Typography>

          <Box sx={{ mb: 2, mt: 0.5 }}>
            <Chip
              label={formatStatus(
                drawerCustomer?.subscription_status
              )}
              color={getStatusColor(
                drawerCustomer?.subscription_status
              )}
              size="small"
            />
          </Box>

          <Typography
            variant="subtitle2"
            color="text.secondary"
          >
            Monthly Amount
          </Typography>

          <Typography sx={{ mb: 2 }}>
            {formatCurrency(
              drawerCustomer?.monthly_amount
            )}
          </Typography>

          <Typography
            variant="subtitle2"
            color="text.secondary"
          >
            Next Billing Date
          </Typography>

          <Typography sx={{ mb: 2 }}>
            {formatDate(
              drawerCustomer?.next_billing_date
            )}
          </Typography>

          <Typography
            variant="subtitle2"
            color="text.secondary"
          >
            Lifetime Revenue
          </Typography>

          <Typography sx={{ mb: 2 }}>
            {formatCurrency(
              drawerCustomer?.lifetime_revenue
            )}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Typography
            variant="h6"
            fontWeight="bold"
            gutterBottom
          >
            Customer Communications
          </Typography>

          <Box
            sx={{
              p: 2,
              mb: 2,
              border: 1,
              borderColor: drawerCustomer?.sms_consent
                ? "success.main"
                : "divider",
              borderRadius: 2,
              bgcolor: "background.default",
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(
                    drawerCustomer?.sms_consent
                  )}
                  onChange={handleSmsConsentChange}
                  disabled={
                    savingSmsConsent ||
                    !drawerCustomer?.phone
                  }
                  color="success"
                />
              }
              label={
                <Box>
                  <Typography fontWeight="bold">
                    SMS Service Notifications
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Arrival, completion, scheduling,
                    gate, and account-related service
                    texts
                  </Typography>
                </Box>
              }
              sx={{
                m: 0,
                width: "100%",
                alignItems: "flex-start",
                "& .MuiSwitch-root": {
                  mr: 1,
                  mt: -0.25,
                },
              }}
            />

            <Chip
              label={
                drawerCustomer?.sms_consent
                  ? "SMS Enabled"
                  : "SMS Disabled"
              }
              color={
                drawerCustomer?.sms_consent
                  ? "success"
                  : "default"
              }
              variant={
                drawerCustomer?.sms_consent
                  ? "filled"
                  : "outlined"
              }
              size="small"
              sx={{ mt: 2 }}
            />

            {!drawerCustomer?.phone && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Add a phone number before enabling SMS.
              </Alert>
            )}

            {savingSmsConsent && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1.5 }}
              >
                Saving SMS preference...
              </Typography>
            )}

            {smsMessage && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {smsMessage}
              </Alert>
            )}

            {smsError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {smsError}
              </Alert>
            )}

            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              sx={{
                mt: 1.5,
                lineHeight: 1.45,
              }}
            >
              Only enable this after the customer has
              clearly agreed to receive service-related
              text messages.
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography
            variant="subtitle2"
            color="text.secondary"
          >
            Dog Names
          </Typography>

          <Typography
            sx={{
              mb: 2,
              overflowWrap: "anywhere",
            }}
          >
            {drawerCustomer?.dog_names || "—"}
          </Typography>

          <Typography
            variant="subtitle2"
            color="text.secondary"
          >
            Gate Code
          </Typography>

          <Typography
            sx={{
              mb: 2,
              overflowWrap: "anywhere",
            }}
          >
            {drawerCustomer?.gate_code || "—"}
          </Typography>

          <Typography
            variant="subtitle2"
            color="text.secondary"
          >
            Access Instructions
          </Typography>

          <Typography
            sx={{
              mb: 2,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
            }}
          >
            {drawerCustomer?.access_instructions || "—"}
          </Typography>

          <Typography
            variant="subtitle2"
            color="text.secondary"
          >
            Notes
          </Typography>

          <Typography
            sx={{
              mb: 3,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
            }}
          >
            {drawerCustomer?.notes || "—"}
          </Typography>

          <>
  <Stack
    direction="row"
    spacing={1}
    sx={{ mb: 2 }}
  >
    <Button
      fullWidth
      variant="outlined"
      startIcon={<PhoneIcon />}
      href={
        drawerCustomer?.phone
          ? `tel:${drawerCustomer.phone}`
          : undefined
      }
      disabled={!drawerCustomer?.phone}
    >
      Call
    </Button>

    <Button
      fullWidth
      variant="contained"
      color="success"
      startIcon={<ChatBubbleOutlineIcon />}
      onClick={() =>
        openCustomerMessages(drawerCustomer)
      }
      disabled={!drawerCustomer?.phone}
    >
      Text
    </Button>

    <Button
      fullWidth
      variant="outlined"
      startIcon={<EmailIcon />}
      href={
        drawerCustomer?.email
          ? `mailto:${drawerCustomer.email}`
          : undefined
      }
      disabled={!drawerCustomer?.email}
    >
      Email
    </Button>
  </Stack>

  <Stack
    direction={{
      xs: "column",
      sm: "row",
    }}
    spacing={1}
  >
    <Button
      variant="contained"
      startIcon={<EditIcon />}
      onClick={() =>
        handleEdit(drawerCustomer)
      }
      fullWidth
    >
      Edit
    </Button>

    <Button
      color="error"
      variant="outlined"
      startIcon={<DeleteIcon />}
      onClick={() =>
        setDeleteTarget(drawerCustomer)
      }
      fullWidth
    >
      Delete
    </Button>
  </Stack>
</>
        </Box>
      </Drawer>

      <CustomerDialog
        open={open}
        onClose={() => {
          setOpen(false);
          setSelectedCustomer(null);
        }}
        initialData={selectedCustomer}
        onSave={handleSave}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete Customer?</DialogTitle>

        <DialogContent>
          Are you sure you want to delete{" "}
          <strong>{deleteTarget?.name}</strong>?
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteConfirmed}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}