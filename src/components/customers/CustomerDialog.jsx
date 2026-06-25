import {
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";

import CustomerForm from "./CustomerForm";

export default function CustomerDialog({
  open,
  onClose,
  onAdded,
  customer,
  mode = "add",
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {mode === "edit"
          ? "Edit Relief Club Member"
          : "Add Relief Club Member"}
      </DialogTitle>

      <DialogContent>
        <CustomerForm
          customer={customer}
          mode={mode}
          onAdded={(savedCustomer) => {
            onAdded(savedCustomer);
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}