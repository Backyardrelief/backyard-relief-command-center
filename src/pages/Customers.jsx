import { useState } from "react";
import customersData from "../data/customers";

export default function Customers() {
  const [search, setSearch] = useState("");

  const filteredCustomers = customersData.filter((customer) =>
    customer.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h1>Customers</h1>

      <input
        type="text"
        placeholder="Search customers..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          padding: "10px",
          width: "300px",
          marginBottom: "20px",
          borderRadius: "8px",
          border: "1px solid #ccc",
        }}
      />

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          background: "white",
        }}
      >
        <thead>
          <tr>
            <th align="left">Name</th>
            <th align="left">Package</th>
            <th align="left">Monthly</th>
            <th align="left">City</th>
            <th align="left">Dogs</th>
          </tr>
        </thead>

        <tbody>
          {filteredCustomers.map((customer) => (
            <tr key={customer.id}>
              <td>{customer.name}</td>
              <td>{customer.package}</td>
              <td>${customer.price}</td>
              <td>{customer.city}</td>
              <td>{customer.dogs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}