import { TextField } from "@mui/material";

export default function CustomerSearch({
  value,
  onChange,
}) {
  return (
    <TextField
      fullWidth
      placeholder="Search customers..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={{ mb: 3 }}
    />
  );
}