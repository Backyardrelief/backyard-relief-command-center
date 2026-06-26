import { Box } from "@mui/material";
import CustomerTable from "../components/customers/CustomerTable";

export default function Customers() {
  return (
    <Box sx={{ width: "100%" }}>
      <CustomerTable />
    </Box>
  );
}