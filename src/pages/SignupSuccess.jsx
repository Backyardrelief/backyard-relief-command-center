import { Box, Card, CardContent, Typography, Button } from "@mui/material";

export default function SignupSuccess() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        p: 3,
      }}
    >
      <Card sx={{ maxWidth: 700, width: "100%" }}>
        <CardContent sx={{ textAlign: "center", p: 5 }}>
          <Typography
            variant="h3"
            fontWeight="bold"
            color="success.main"
            gutterBottom
          >
            Welcome To The Relief Club!
          </Typography>

          <Typography variant="h5" gutterBottom>
            Your membership has been activated.
          </Typography>

          <Typography sx={{ mt: 3 }}>
            Thank you for choosing Backyard Relief Pet Waste Solutions.
          </Typography>

          <Typography sx={{ mt: 2 }}>
            We have received your signup and your service schedule has been
            assigned inside our system.
          </Typography>

          <Typography sx={{ mt: 2 }}>
            You will receive service-related notifications regarding:
          </Typography>

          <Box sx={{ mt: 2 }}>
            <Typography>✓ Arrival Notifications</Typography>
            <Typography>✓ Service Completion Notifications</Typography>
            <Typography>✓ Gate Security Confirmations</Typography>
            <Typography>✓ Scheduling Updates</Typography>
          </Box>

          <Typography sx={{ mt: 4 }}>
            Questions?
          </Typography>

          <Typography fontWeight="bold">
            Call or Text: (720) YOUR-NUMBER
          </Typography>

          <Typography sx={{ mt: 4 }}>
            We look forward to keeping your yard clean and your pets happy.
          </Typography>

          <Button
            variant="contained"
            size="large"
            sx={{ mt: 4 }}
            href="https://www.backyardrelief.com"
          >
            Return To Website
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}