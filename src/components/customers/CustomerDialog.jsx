import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";

import CustomerForm from "./CustomerForm";

export default function CustomerDialog({
  open,
  setOpen,
  customer,
  setCustomer,
  addCustomer,
}) {
  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Add Customer</DialogTitle>

      <DialogContent>
        <CustomerForm
          customer={customer}
          setCustomer={setCustomer}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={() => setOpen(false)}>
          Cancel
        </Button>

        <Button
          variant="contained"
          color="success"
          onClick={addCustomer}
        >
          Save Customer
        </Button>
      </DialogActions>
    </Dialog>
  );
}