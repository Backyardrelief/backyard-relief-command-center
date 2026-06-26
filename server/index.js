const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();

// 🔓 Allow your React app to talk to this server
app.use(cors());
app.use(express.json());

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

if (!GOOGLE_MAPS_API_KEY) {
  console.warn("⚠️ Missing GOOGLE_MAPS_API_KEY in .env");
}

/**
 * 🧭 GEOCODING
 * Converts address → lat/lng
 */
app.get("/api/geocode", async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/geocode/json",
      {
        params: {
          address,
          key: GOOGLE_MAPS_API_KEY,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Geocode error:", error.message);
    res.status(500).json({ error: "Geocoding request failed" });
  }
});

/**
 * 🗺️ DIRECTIONS
 * origin → destination route
 */
app.get("/api/directions", async (req, res) => {
  try {
    const { origin, destination } = req.query;

    if (!origin || !destination) {
      return res.status(400).json({
        error: "Origin and destination are required",
      });
    }

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/directions/json",
      {
        params: {
          origin,
          destination,
          key: GOOGLE_MAPS_API_KEY,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Directions error:", error.message);
    res.status(500).json({ error: "Directions request failed" });
  }
});

/**
 * 🧪 HEALTH CHECK (useful for testing)
 */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is running" });
});

// 🚀 Start server
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});