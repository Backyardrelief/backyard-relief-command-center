import useDriverGPS from "../hooks/useDriverGPS";

export default function DriverDashboard() {
  // 👇 THIS IS WHERE IT RUNS
  useDriverGPS("tech1");

  return (
    <div style={{ padding: 20 }}>
      <h2>🚚 Driver Active</h2>
      <p>GPS tracking is running for tech1</p>
    </div>
  );
}