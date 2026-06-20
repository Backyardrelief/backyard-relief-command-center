import { useState, useEffect } from "react";
import { Box, Typography, Button } from "@mui/material";

import CustomerTable from "../components/customers/CustomerTable";
import CustomerDialog from "../components/customers/CustomerDialog";

const emptyCustomer = {
  firstName: "",
  lastName: "",
  address: "",
  city: "",
  phone: "",
  email: "",
  package: "Basic Care",
  frequency: "Biweekly",
  dogs: 1,
  yardSize: "Under 1/8 Acre",
  wasteDisposal: false,
  deodorizing: false,
  gateCode: "",
  notes: "",
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState(emptyCustomer);

  useEffect(() => {
    const saved = localStorage.getItem("customers");

    if (saved) {
      setCustomers(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("customers", JSON.stringify(customers));
  }, [customers]);

  const addCustomer = () => {
    setCustomers([
      ...customers,
      {
        id: Date.now(),
        ...customer,
      },
    ]);

    setCustomer(emptyCustomer);
    setOpen(false);
  };

  return (
    <Box p={4}>
      <Typography variant="h4" mb={3}>
        Customers
      </Typography>

      <Button
        variant="contained"
        color="success"
        onClick={() => setOpen(true)}
        sx={{ mb: 3 }}
      >
        Add Customer
      </Button>

      <CustomerTable customers={customers} />

      <CustomerDialog
        open={open}
        setOpen={setOpen}
        customer={customer}
        setCustomer={setCustomer}
        addCustomer={addCustomer}
      />
    </Box>
  );
}