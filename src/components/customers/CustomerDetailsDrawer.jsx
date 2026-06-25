import {
  Drawer,
  Box,
  Typography,
  Divider,
} from "@mui/material";

export default function CustomerDetailsDrawer({
  open,
  onClose,
  customer,
}) {
  if (!customer) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
    >
      <Box
        sx={{
          width: 400,
          p: 3,
        }}
      >
        <Typography
          variant="h5"
          fontWeight="bold"
        >
          {customer.first_name} {customer.last_name}
        </Typography>

        <Typography color="text.secondary">
          Relief Club Member
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6">
          Contact
        </Typography>

        <Typography>
          📞 {customer.phone || "N/A"}
        </Typography>

        <Typography>
          📧 {customer.email || "N/A"}
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6">
          Property
        </Typography>

        <Typography>
          🏡 {customer.address}
        </Typography>

        <Typography>
          {customer.city} {customer.zip}
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6">
          Dogs
        </Typography>

        <Typography>
          🐶 {customer.dogs}
        </Typography>

        <Typography>
          {customer.dog_names || "None"}
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6">
          Service
        </Typography>

        <Typography>
          ⭐ {customer.service_plan}
        </Typography>

        <Typography>
          📅 {customer.service_frequency}
        </Typography>

        <Typography>
          {customer.service_day}
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6">
          Access
        </Typography>

        <Typography>
          🔐 {customer.gate_code || "N/A"}
        </Typography>

        <Typography>
          {customer.access_instructions ||
            "No instructions"}
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6">
          Notes
        </Typography>

        <Typography>
          {customer.notes || "None"}
        </Typography>
      </Box>
    </Drawer>
  );
}