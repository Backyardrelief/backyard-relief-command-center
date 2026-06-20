import { useState } from "react";
import { v4 as uuid } from "uuid";

export default function Customers() {
  const [customers, setCustomers] = useState([]);

  const [form, setForm] = useState({
    name: "",
    package: "Basic Care",
    price: 75,
  });

  function addCustomer(e) {
    e.preventDefault();

    if (!form.name.trim()) return;

    setCustomers([
      ...customers,
      {
        id: uuid(),
        ...form,
      },
    ]);

    setForm({
      name: "",
      package: "Basic Care",
      price: 75,
    });
  }

  function packageChanged(e) {
    const pkg = e.target.value;

    let price = 75;

    if (pkg === "Standard Care") price = 98;
    if (pkg === "Complete Care") price = 105;

    setForm({
      ...form,
      package: pkg,
      price,
    });
  }

  const monthlyRevenue = customers.reduce(
    (sum, c) => sum + c.price,
    0
  );

  return (
    <div>

      <h1>Customers</h1>

      <h2>Monthly Revenue: ${monthlyRevenue}</h2>

      <form onSubmit={addCustomer}>

        <input
          placeholder="Customer Name"
          value={form.name}
          onChange={(e) =>
            setForm({
              ...form,
              name: e.target.value,
            })
          }
        />

        <br /><br />

        <select
          value={form.package}
          onChange={packageChanged}
        >
          <option>Basic Care</option>
          <option>Standard Care</option>
          <option>Complete Care</option>
        </select>

        <br /><br />

        <button type="submit">
          Save Customer
        </button>

      </form>

      <hr />

      {customers.map((customer) => (
        <div
          key={customer.id}
          style={{
            background: "#fff",
            marginBottom: 15,
            padding: 15,
            borderRadius: 10,
          }}
        >
          <h3>{customer.name}</h3>

          <p>{customer.package}</p>

          <strong>${customer.price}/month</strong>
        </div>
      ))}

    </div>
  );
}