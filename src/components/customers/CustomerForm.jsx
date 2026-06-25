import { useState } from "react";

import {
  Box,
  TextField,
  Button,
  Grid,
  MenuItem,
  Typography,
  Divider,
} from "@mui/material";

import { supabase } from "../../lib/supabase";

export default function CustomerForm({
  onAdded,
  customer = null,
  mode = "add",
}) {
  const [form, setForm] = useState(
    customer || {
      first_name: "",
      last_name: "",
      phone: "",
      email: "",

      address: "",
      city: "",
      zip: "",

      lat: null,
      lng: null,

      dogs: 1,
      dog_names: "",

      gate_code: "",
      access_instructions: "",

      service_plan: "Relief Plus",
      service_frequency: "Weekly",
      service_day: "Monday",

      status: "active",

      notes: "",
    }
  );

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const saveCustomer = async () => {
    let lat = form.lat;
    let lng = form.lng;

    try {
      const addressString = `${form.address}, ${form.city}, ${form.zip}`;

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          addressString
        )}&key=${import.meta.env.VITE_GEOCODE_KEY}`
      );

      const geoData = await response.json();

      console.log("Geocode Result:", geoData);

      if (
        geoData.results &&
        geoData.results.length > 0
      ) {
        lat =
          geoData.results[0].geometry.location.lat;

        lng =
          geoData.results[0].geometry.location.lng;
      }
    } catch (err) {
      console.error("Geocoding Error:", err);
    }

    const customerData = {
      ...form,
      lat,
      lng,
    };

    if (mode === "edit") {
      const { data, error } = await supabase
        .from("customers")
        .update(customerData)
        .eq("id", customer.id)
        .select();

      if (error) {
        console.error(error);
        alert(error.message);
        return;
      }

      onAdded?.(data[0]);
      return;
    }

    const { data, error } = await supabase
      .from("customers")
      .insert([customerData])
      .select();

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    onAdded?.(data[0]);
  };

  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="h6" fontWeight="bold">
        Contact Information
      </Typography>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="First Name"
            name="first_name"
            value={form.first_name}
            onChange={handleChange}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Last Name"
            name="last_name"
            value={form.last_name}
            onChange={handleChange}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Phone"
            name="phone"
            value={form.phone}
            onChange={handleChange}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Email"
            name="email"
            value={form.email}
            onChange={handleChange}
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" fontWeight="bold">
        Property Information
      </Typography>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Address"
            name="address"
            value={form.address}
            onChange={handleChange}
          />
        </Grid>

        <Grid item xs={6}>
          <TextField
            fullWidth
            label="City"
            name="city"
            value={form.city}
            onChange={handleChange}
          />
        </Grid>

        <Grid item xs={6}>
          <TextField
            fullWidth
            label="ZIP"
            name="zip"
            value={form.zip}
            onChange={handleChange}
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" fontWeight="bold">
        Pet Information
      </Typography>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={4}>
          <TextField
            fullWidth
            type="number"
            label="Dogs"
            name="dogs"
            value={form.dogs}
            onChange={handleChange}
          />
        </Grid>

        <Grid item xs={8}>
          <TextField
            fullWidth
            label="Dog Names"
            name="dog_names"
            value={form.dog_names}
            onChange={handleChange}
            placeholder="Bella, Cooper"
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" fontWeight="bold">
        Service Information
      </Typography>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={4}>
          <TextField
            select
            fullWidth
            label="Membership"
            name="service_plan"
            value={form.service_plan}
            onChange={handleChange}
          >
            <MenuItem value="Basic Relief">
              Basic Relief
            </MenuItem>
            <MenuItem value="Standard Relief">
              Standard Relief
            </MenuItem>
            <MenuItem value="Relief Plus">
              Relief Plus
            </MenuItem>
            <MenuItem value="Relief Premium">
              Relief Premium
            </MenuItem>
            <MenuItem value="Relief Elite">
              Relief Elite
            </MenuItem>
          </TextField>
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            select
            fullWidth
            label="Frequency"
            name="service_frequency"
            value={form.service_frequency}
            onChange={handleChange}
          >
            <MenuItem value="Weekly">
              Weekly
            </MenuItem>
            <MenuItem value="Biweekly">
              Biweekly
            </MenuItem>
          </TextField>
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            select
            fullWidth
            label="Service Day"
            name="service_day"
            value={form.service_day}
            onChange={handleChange}
          >
            <MenuItem value="Monday">Monday</MenuItem>
            <MenuItem value="Tuesday">Tuesday</MenuItem>
            <MenuItem value="Wednesday">Wednesday</MenuItem>
            <MenuItem value="Thursday">Thursday</MenuItem>
            <MenuItem value="Friday">Friday</MenuItem>
          </TextField>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" fontWeight="bold">
        Access Information
      </Typography>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Gate Code"
            name="gate_code"
            value={form.gate_code}
            onChange={handleChange}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Access Instructions"
            name="access_instructions"
            value={form.access_instructions}
            onChange={handleChange}
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" fontWeight="bold">
        Notes
      </Typography>

      <TextField
        fullWidth
        multiline
        rows={4}
        name="notes"
        value={form.notes}
        onChange={handleChange}
      />

      <Button
        variant="contained"
        size="large"
        sx={{ mt: 3 }}
        onClick={saveCustomer}
      >
        {mode === "edit"
          ? "Update Customer"
          : "Save Customer"}
      </Button>
    </Box>
  );
}