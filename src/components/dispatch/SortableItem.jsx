import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Box, Typography, Chip } from "@mui/material";

export default function SortableItem({ id, customer }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: 12,
    marginBottom: 10,
    background: "#f5f5f5",
    borderRadius: 8,
    cursor: "grab",
  };

  return (
    <Box ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Typography fontWeight="bold">
        {customer.first_name} {customer.last_name}
      </Typography>

      <Typography variant="body2">
        {customer.address}
      </Typography>

      <Chip size="small" label={customer.service_plan} sx={{ mt: 1 }} />
    </Box>
  );
}