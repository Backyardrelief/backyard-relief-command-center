import {
  Dialog,
  DialogTitle,
  DialogContent
} from "@mui/material";

import CustomerForm from "./CustomerForm";

export default function CustomerDialog({
  open,
  onClose,
  initialData,
  onSave
}) {
  const handleSubmit = async (data) => {
    await onSave(data);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {initialData ? "Edit Customer" : "Add Customer"}
      </DialogTitle>

      <DialogContent>
        <CustomerForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}