import { Card, CardContent, Typography, Box } from "@mui/material";

export default function DashboardCard({
  title,
  value,
  subtitle,
  color = "#2E7D32",
}) {
  return (
    <Card
      elevation={4}
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        height: "100%",
      }}
    >
      <Box
        sx={{
          height: 8,
          backgroundColor: color,
        }}
      />

      <CardContent>
        <Typography
          variant="body2"
          color="text.secondary"
          gutterBottom
        >
          {title}
        </Typography>

        <Typography
          variant="h3"
          fontWeight="bold"
          sx={{ mb: 1 }}
        >
          {value}
        </Typography>

        <Typography
          variant="body2"
          color="success.main"
        >
          {subtitle}
        </Typography>
      </CardContent>
    </Card>
  );
}