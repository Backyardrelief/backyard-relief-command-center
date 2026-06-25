import { useEffect, useState } from "react";

import {
  Box,
  Typography,
  Button,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";

import { supabase } from "../lib/supabase";

import CustomerTable from "../components/customers/CustomerTable";
import CustomerDialog from "../components/customers/CustomerDialog";
import CustomerDetailsDrawer from "../components/customers/CustomerDetailsDrawer";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);

  const [open, setOpen] = useState(false);

  const [selectedCustomer, setSelectedCustomer] =
    useState(null);

  const [dialogMode, setDialogMode] =
    useState("add");

  const [drawerOpen, setDrawerOpen] =
    useState(false);

  const [
    selectedViewCustomer,
    setSelectedViewCustomer,
  ] = useState(null);

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      return;
    }

    setCustomers(data || []);
  };

  const deleteCustomer = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this customer?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    setCustomers((prev) =>
      prev.filter(
        (customer) => customer.id !== id
      )
    );
  };

  const handleAddCustomer = () => {
    setDialogMode("add");
    setSelectedCustomer(null);
    setOpen(true);
  };

  const handleEditCustomer = (
    customer
  ) => {
    setDialogMode("edit");
    setSelectedCustomer(customer);
    setOpen(true);
  };

  const handleViewCustomer = (
    customer
  ) => {
    setSelectedViewCustomer(customer);
    setDrawerOpen(true);
  };

  const handleCustomerSaved = (
    savedCustomer
  ) => {
    if (dialogMode === "edit") {
      setCustomers((prev) =>
        prev.map((customer) =>
          customer.id === savedCustomer.id
            ? savedCustomer
            : customer
        )
      );
    } else {
      setCustomers((prev) => [
        savedCustomer,
        ...prev,
      ]);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography
          variant="h4"
          fontWeight="bold"
        >
          Relief Club Members
        </Typography>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddCustomer}
        >
          Add Customer
        </Button>
      </Box>

      <CustomerTable
        customers={customers}
        onDelete={deleteCustomer}
        onEdit={handleEditCustomer}
        onView={handleViewCustomer}
      />

      <CustomerDialog
        open={open}
        onClose={() =>
          setOpen(false)
        }
        customer={selectedCustomer}
        mode={dialogMode}
        onAdded={handleCustomerSaved}
      />

      <CustomerDetailsDrawer
        open={drawerOpen}
        onClose={() =>
          setDrawerOpen(false)
        }
        customer={
          selectedViewCustomer
        }
      />
    </Box>
  );
}