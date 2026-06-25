import { DataGrid } from "@mui/x-data-grid";
import {
  Paper,
  IconButton,
  Stack,
} from "@mui/material";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

export default function CustomerTable({
  customers,
  onDelete,
  onEdit,
  onView,
}) {
  const columns = [
    {
      field: "customer",
      headerName: "Customer",
      flex: 1.5,
      renderCell: (params) => (
        <span
          style={{
            cursor: "pointer",
            fontWeight: 600,
          }}
          onClick={() => onView(params.row)}
        >
          {params.row.first_name}{" "}
          {params.row.last_name}
        </span>
      ),
    },
    {
      field: "phone",
      headerName: "Phone",
      flex: 1,
    },
    {
      field: "city",
      headerName: "City",
      flex: 1,
    },
    {
      field: "dogs",
      headerName: "Dogs",
      width: 90,
    },
    {
      field: "service_plan",
      headerName: "Membership",
      flex: 1,
    },
    {
      field: "service_frequency",
      headerName: "Frequency",
      width: 120,
    },
    {
      field: "service_day",
      headerName: "Day",
      width: 120,
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 130,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row">
          <IconButton
            color="primary"
            onClick={() => onEdit(params.row)}
          >
            <EditIcon />
          </IconButton>

          <IconButton
            color="error"
            onClick={() =>
              onDelete(params.row.id)
            }
          >
            <DeleteIcon />
          </IconButton>
        </Stack>
      ),
    },
  ];

  return (
    <Paper sx={{ p: 2, borderRadius: 3 }}>
      <div
        style={{
          height: 650,
          width: "100%",
        }}
      >
        <DataGrid
          rows={customers}
          columns={columns}
          getRowId={(row) => row.id}
          pageSizeOptions={[10, 25, 50]}
        />
      </div>
    </Paper>
  );
}