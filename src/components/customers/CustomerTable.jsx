import { DataGrid } from "@mui/x-data-grid";
import { Box } from "@mui/material";

export default function CustomerTable({ customers }) {
  const columns = [
    { field: "firstName", headerName: "First Name", flex: 1 },
    { field: "lastName", headerName: "Last Name", flex: 1 },
    { field: "city", headerName: "City", flex: 1 },
  ];

  return (
    <Box sx={{ height: 500, width: "100%" }}>
      <DataGrid
        rows={(customers ?? []).map((c, i) => ({
          id: c.id ?? i,
          ...c,
        }))}
        columns={columns}
        pageSizeOptions={[5, 10, 25]}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 10 },
          },
        }}
        checkboxSelection
      />
    </Box>
  );
}