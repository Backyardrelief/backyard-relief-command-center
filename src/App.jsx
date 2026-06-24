import CustomerTable from "./components/customers/CustomerTable.jsx";
import DashboardLayout from "./layout/DashboardLayout";

export default function App() {
  const customers = [
    { id: 1, firstName: "John", lastName: "Smith", city: "Denver" },
    { id: 2, firstName: "Sarah", lastName: "Johnson", city: "Aurora" },
  ];

  return (
    <DashboardLayout>
      <h1
        style={{
          marginTop: 0,
          marginBottom: 20,
          fontSize: "32px",
          color: "#1f2937",
        }}
      >
        Backyard Relief CRM
      </h1>

      <CustomerTable customers={customers} />
    </DashboardLayout>
  );
}