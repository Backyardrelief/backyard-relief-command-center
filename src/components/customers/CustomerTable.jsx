import { DataGrid } from "@mui/x-data-grid";
import { Box } from "@mui/material";

export default function CustomerTable({ customers }) {
  const columns = [
    { field: "firstName", headerName: "First Name", flex: 1 },
    { field: "lastName", headerName: "Last Name", flex: 1 },
    { field: "city", headerName: "City", flex: 1 },
    { field: "package", headerName: "Package", flex: 1 },
    { field: "frequency", headerName: "Frequency", flex: 1 },
    { field: "dogs", headerName: "Dogs", width: 90 },
  ];

  return (
    <Box sx={{ height: 500, width: "100%" }}>
      <DataGrid
        rows={customers}
        columns={columns}
        pageSizeOptions={[10, 25, 50]}
        initialState={{
          pagination: {
            paginationModel: {
              pageSize: 10,
            },
          },
        }}
      />
    </Box>
  );
}