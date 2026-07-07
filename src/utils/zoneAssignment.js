export function getZoneAssignment(zip) {
  const cleanZip = String(zip || "").trim().slice(0, 5);

  const zonesByZip = {
    // Zone A — Monday
    "80123": {
      zone: "Zone A",
      zone_id: "A",
      service_day: "Monday",
    },
    "80236": {
      zone: "Zone A",
      zone_id: "A",
      service_day: "Monday",
    },

    // Zone B — Tuesday
    "80127": {
      zone: "Zone B",
      zone_id: "B",
      service_day: "Tuesday",
    },
    "80128": {
      zone: "Zone B",
      zone_id: "B",
      service_day: "Tuesday",
    },

    // Zone C — Wednesday
    "80120": {
      zone: "Zone C",
      zone_id: "C",
      service_day: "Wednesday",
    },
    "80121": {
      zone: "Zone C",
      zone_id: "C",
      service_day: "Wednesday",
    },

    // Zone D — Thursday
    "80122": {
      zone: "Zone D",
      zone_id: "D",
      service_day: "Thursday",
    },
    "80129": {
      zone: "Zone D",
      zone_id: "D",
      service_day: "Thursday",
    },

    // Zone E — Friday
    "80125": {
      zone: "Zone E",
      zone_id: "E",
      service_day: "Friday",
    },
    "80126": {
      zone: "Zone E",
      zone_id: "E",
      service_day: "Friday",
    },
    "80130": {
      zone: "Zone E",
      zone_id: "E",
      service_day: "Friday",
    },
  };

  return (
    zonesByZip[cleanZip] || {
      zone: "Unassigned",
      zone_id: null,
      service_day: null,
    }
  );
}