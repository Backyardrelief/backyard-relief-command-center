import { useState, useEffect } from "react";
import {
  Box,
  TextField,
  MenuItem,
  Button,
  Stack
} from "@mui/material";

const defaultValues = {
  name: "",
  email: "",
  phone: "",
  address: "",
  plan: "Standard Relief",
  status: "active"
};

export default function CustomerForm({ initialData, onSubmit, onCancel }) {
  const [values, setValues] = useState(defaultValues);

  useEffect(() => {
    if (initialData) {
      setValues(initialData);
    }
  }, [initialData]);

  const handleChange = (e) => {
    setValues({
      ...values,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <TextField
          label="Full Name"
          name="name"
          value={values.name}
          onChange={handleChange}
          fullWidth
        />

        <TextField
          label="Email"
          name="email"
          value={values.email}
          onChange={handleChange}
          fullWidth
        />

        <TextField
          label="Phone"
          name="phone"
          value={values.phone}
          onChange={handleChange}
          fullWidth
        />

        <TextField
          label="Address"
          name="address"
          value={values.address}
          onChange={handleChange}
          fullWidth
        />

        <TextField
          select
          label="Plan"
          name="plan"
          value={values.plan}
          onChange={handleChange}
        >
          <MenuItem value="Standard Relief">Standard Relief</MenuItem>
          <MenuItem value="Relief Plus">Relief Plus</MenuItem>
          <MenuItem value="Relief Premium">Relief Premium</MenuItem>
          <MenuItem value="Relief Elite">Relief Elite</MenuItem>
        </TextField>

        <TextField
          select
          label="Status"
          name="status"
          value={values.status}
          onChange={handleChange}
        >
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="paused">Paused</MenuItem>
          <MenuItem value="canceled">Canceled</MenuItem>
        </TextField>

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="contained" type="submit">
            Save
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}