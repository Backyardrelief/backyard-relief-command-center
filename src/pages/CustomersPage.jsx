import { Box } from "@mui/material";
import CustomerTable from "../components/customers/CustomerTable";

export default function CustomersPage() {
  return (
    <Box sx={{ width: "100%", p: 2 }}>
      <CustomerTable />
    </Box>
  );
}