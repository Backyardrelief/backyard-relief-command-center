import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Stack,
} from "@mui/material";

export default function CustomerForm({ customer, setCustomer }) {
  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      <TextField
        label="First Name"
        value={customer.firstName}
        onChange={(e) =>
          setCustomer({ ...customer, firstName: e.target.value })
        }
        fullWidth
      />

      <TextField
        label="Last Name"
        value={customer.lastName}
        onChange={(e) =>
          setCustomer({ ...customer, lastName: e.target.value })
        }
        fullWidth
      />

      <TextField
        label="Address"
        value={customer.address}
        onChange={(e) =>
          setCustomer({ ...customer, address: e.target.value })
        }
        fullWidth
      />

      <TextField
        label="City"
        value={customer.city}
        onChange={(e) =>
          setCustomer({ ...customer, city: e.target.value })
        }
        fullWidth
      />

      <TextField
        label="Phone"
        value={customer.phone}
        onChange={(e) =>
          setCustomer({ ...customer, phone: e.target.value })
        }
        fullWidth
      />

      <FormControl fullWidth>
        <InputLabel>Package</InputLabel>

        <Select
          value={customer.package}
          label="Package"
          onChange={(e) =>
            setCustomer({ ...customer, package: e.target.value })
          }
        >
          <MenuItem value="Basic Care">Basic Care ($75)</MenuItem>
          <MenuItem value="Standard Care">Standard Care ($98)</MenuItem>
          <MenuItem value="Complete Care">Complete Care ($105)</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth>
        <InputLabel>Frequency</InputLabel>

        <Select
          value={customer.frequency}
          label="Frequency"
          onChange={(e) =>
            setCustomer({ ...customer, frequency: e.target.value })
          }
        >
          <MenuItem value="Weekly">Weekly</MenuItem>
          <MenuItem value="Biweekly">Biweekly</MenuItem>
          <MenuItem value="Monthly">Monthly</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth>
        <InputLabel>Dogs</InputLabel>

        <Select
          value={customer.dogs}
          label="Dogs"
          onChange={(e) =>
            setCustomer({ ...customer, dogs: e.target.value })
          }
        >
          <MenuItem value={1}>1</MenuItem>
          <MenuItem value={2}>2</MenuItem>
          <MenuItem value={3}>3</MenuItem>
          <MenuItem value={4}>4+</MenuItem>
        </Select>
      </FormControl>

      <FormControlLabel
        control={
          <Switch
            checked={customer.wasteDisposal}
            onChange={(e) =>
              setCustomer({
                ...customer,
                wasteDisposal: e.target.checked,
              })
            }
          />
        }
        label="Off-Site Waste Disposal"
      />

      <FormControlLabel
        control={
          <Switch
            checked={customer.deodorizing}
            onChange={(e) =>
              setCustomer({
                ...customer,
                deodorizing: e.target.checked,
              })
            }
          />
        }
        label="Monthly Yard Deodorizing"
      />
    </Stack>
  );
}