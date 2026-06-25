import { useEffect, useState } from "react";
import { Paper, Typography, Box } from "@mui/material";
import RouteMap from "./RouteMap";

/**
 * TECHNICIANS (your fleet)
 */
const technicians = [
  {
    id: "tech1",
    name: "Truck 1 - Jake",
    color: "#1976D2",
  },
  {
    id: "tech2",
    name: "Truck 2 - Mike",
    color: "#2E7D32",
  },
];

/**
 * JOBS (CRM DATA)
 */
const customers = [
  {
    id: 1,
    name: "John Smith",
    serviceTime: "8:00 AM",
    lat: 39.6500,
    lng: -104.9900,
  },
  {
    id: 2,
    name: "Sarah Johnson",
    serviceTime: "10:30 AM",
    lat: 39.6600,
    lng: -105.0000,
  },
  {
    id: 3,
    name: "Mike Davis",
    serviceTime: "1:00 PM",
    lat: 39.6400,
    lng: -104.9800,
  },
  {
    id: 4,
    name: "Emily Brown",
    serviceTime: "3:00 PM",
    lat: 39.6550,
    lng: -104.9750,
  },
];

/**
 * SIMPLE LOAD BALANCER
 * (splits jobs evenly between techs)
 */
function assignJobsToTechs(jobs, techs) {
  const assignments = {};

  techs.forEach((t) => (assignments[t.id] = []));

  jobs.forEach((job, index) => {
    const tech = techs[index % techs.length];
    assignments[tech.id].push(job);
  });

  return assignments;
}

export default function TodaySchedule() {
  const [routes, setRoutes] = useState({});
  const [activeTech, setActiveTech] = useState("tech1");

  /**
   * BUILD MULTI-TECH ROUTES
   */
  useEffect(() => {
    const assigned = assignJobsToTechs(customers, technicians);
    setRoutes(assigned);
  }, []);

  return (
    <Paper sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="h6" fontWeight="bold">
        🚐 Multi-Technician Routes
      </Typography>

      {/* TECH SELECTOR */}
      <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
        {technicians.map((tech) => (
          <button
            key={tech.id}
            onClick={() => setActiveTech(tech.id)}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #ccc",
              background:
                activeTech === tech.id ? tech.color : "transparent",
              color: activeTech === tech.id ? "#fff" : "#000",
              cursor: "pointer",
            }}
          >
            {tech.name}
          </button>
        ))}
      </Box>

      {/* MAP (ACTIVE TECH ONLY) */}
      <Box sx={{ mt: 3, mb: 3 }}>
        <RouteMap jobs={routes[activeTech] || []} />
      </Box>

      {/* JOB LIST */}
      {(routes[activeTech] || []).map((job, index) => (
        <Typography key={job.id} sx={{ mt: 2 }}>
          #{index + 1} 🐾 {job.name} — {job.serviceTime}
        </Typography>
      ))}
    </Paper>
  );
}