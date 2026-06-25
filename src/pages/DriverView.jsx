import { useEffect, useState } from "react";
import { Box, Paper, Typography, Button } from "@mui/material";

const depot = {
  lat: 39.6433,
  lng: -104.9878,
};

/**
 * Simulated assigned route for ONE technician
 * (later this will come from your multi-tech system)
 */
const assignedJobs = [
  {
    id: 1,
    name: "John Smith",
    serviceTime: "8:00 AM",
    lat: 39.6500,
    lng: -104.9900,
    status: "pending",
  },
  {
    id: 2,
    name: "Sarah Johnson",
    serviceTime: "10:30 AM",
    lat: 39.6600,
    lng: -105.0000,
    status: "pending",
  },
  {
    id: 3,
    name: "Mike Davis",
    serviceTime: "1:00 PM",
    lat: 39.6400,
    lng: -104.9800,
    status: "pending",
  },
];

export default function DriverView() {
  const [jobs, setJobs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setJobs(assignedJobs);
  }, []);

  const completeJob = (id) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === id ? { ...job, status: "completed" } : job
      )
    );

    setCurrentIndex((prev) => prev + 1);
  };

  const openNavigation = (job) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${job.lat},${job.lng}`;
    window.open(url, "_blank");
  };

  if (!jobs.length) return <div>Loading route...</div>;

  const currentJob = jobs[currentIndex];

  return (
    <Box sx={{ p: 2, maxWidth: 500, margin: "0 auto" }}>
      <Typography variant="h5" fontWeight="bold">
        🚐 Driver Route
      </Typography>

      {/* NEXT JOB */}
      {currentJob && (
        <Paper sx={{ p: 3, mt: 3, borderRadius: 3 }}>
          <Typography variant="h6">
            Next Stop #{currentIndex + 1}
          </Typography>

          <Typography sx={{ mt: 1 }}>
            🐾 {currentJob.name}
          </Typography>

          <Typography>
            🕒 {currentJob.serviceTime}
          </Typography>

          <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => openNavigation(currentJob)}
            >
              Navigate
            </Button>

            <Button
              variant="contained"
              color="success"
              onClick={() => completeJob(currentJob.id)}
            >
              Complete
            </Button>
          </Box>
        </Paper>
      )}

      {/* UPCOMING STOPS */}
      <Typography sx={{ mt: 4, fontWeight: "bold" }}>
        Upcoming Stops
      </Typography>

      {jobs.slice(currentIndex + 1).map((job) => (
        <Paper key={job.id} sx={{ p: 2, mt: 2, opacity: 0.7 }}>
          🐾 {job.name} — {job.serviceTime}
        </Paper>
      ))}

      {/* COMPLETED */}
      <Typography sx={{ mt: 4, fontWeight: "bold" }}>
        Completed
      </Typography>

      {jobs
        .filter((j) => j.status === "completed")
        .map((job) => (
          <Paper key={job.id} sx={{ p: 2, mt: 2, opacity: 0.4 }}>
            ✔ {job.name}
          </Paper>
        ))}
    </Box>
  );
}
useEffect(() => {
  const interval = setInterval(() => {
    const fakeLocation = {
      lat: 39.6500 + Math.random() * 0.01,
      lng: -104.9900 + Math.random() * 0.01,
    };

    // simulate sending to backend
    localStorage.setItem("driverLocation", JSON.stringify(fakeLocation));
  }, 3000);

  return () => clearInterval(interval);
}, []);