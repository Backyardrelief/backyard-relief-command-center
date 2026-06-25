import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
} from "@mui/material";

import {
  GoogleMap,
  LoadScript,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";

import { supabase } from "../lib/supabase";

const containerStyle = {
  width: "100%",
  height: "75vh",
};

const center = {
  lat: 39.6133,
  lng: -105.0166,
};

export default function Map() {
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .not("lat", "is", null)
      .not("lng", "is", null);

    if (error) {
      console.error(error);
      return;
    }

    setCustomers(data || []);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h4"
        fontWeight="bold"
        sx={{ mb: 3 }}
      >
        Customer Map
      </Typography>

      <Paper
        sx={{
          p: 2,
          borderRadius: 3,
        }}
      >
        <LoadScript
          googleMapsApiKey={
            import.meta.env.VITE_GOOGLE_MAPS_KEY
          }
        >
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={11}
          >
            {customers.map((customer) => (
              <Marker
                key={customer.id}
                position={{
                  lat: Number(customer.lat),
                  lng: Number(customer.lng),
                }}
                onClick={() =>
                  setSelected(customer)
                }
              />
            ))}

            {selected && (
              <InfoWindow
                position={{
                  lat: Number(selected.lat),
                  lng: Number(selected.lng),
                }}
                onCloseClick={() =>
                  setSelected(null)
                }
              >
                <div>
                  <h3>
                    {selected.first_name}{" "}
                    {selected.last_name}
                  </h3>

                  <p>{selected.address}</p>

                  <p>
                    {selected.service_plan}
                  </p>

                  <p>
                    {selected.service_day}
                  </p>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </LoadScript>
      </Paper>
    </Box>
  );
}