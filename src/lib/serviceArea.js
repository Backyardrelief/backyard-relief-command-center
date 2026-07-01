// src/lib/serviceArea.js

// ======================
// SERVICE AREA ZIPS
// ======================

export const ALLOWED_ZIPS = [
  "80110",
  "80113",
  "80120",
  "80121",
  "80122",
  "80123",
  "80126",
  "80128",
  "80129",
  "80130",
  "80161",
  "80162",
  "80163",
  "80166",
  "80235",
  "80236",
];

// ======================
// ZIP -> ZONE
// ======================

export const ZIP_TO_ZONE = {
  // MONDAY
  "80123": "ZONE_A",
  "80235": "ZONE_A",
  "80236": "ZONE_A",

  // TUESDAY
  "80128": "ZONE_B",
  "80162": "ZONE_B",

  // WEDNESDAY
  "80129": "ZONE_C",
  "80126": "ZONE_C",
  "80130": "ZONE_C",
  "80163": "ZONE_C",

  // THURSDAY
  "80121": "ZONE_D",
  "80122": "ZONE_D",
  "80161": "ZONE_D",
  "80166": "ZONE_D",

  // FRIDAY
  "80120": "ZONE_E",
  "80110": "ZONE_E",
  "80113": "ZONE_E",
};

// ======================
// ZONE -> PRIMARY DAY
// ======================

export const ZONE_TO_DAY = {
  ZONE_A: "Monday",
  ZONE_B: "Tuesday",
  ZONE_C: "Wednesday",
  ZONE_D: "Thursday",
  ZONE_E: "Friday",
};

// ======================
// ELITE (TWICE WEEKLY)
// ======================

export const ZONE_TO_ELITE_DAYS = {
  ZONE_A: ["Monday", "Thursday"],
  ZONE_B: ["Tuesday", "Friday"],
  ZONE_C: ["Wednesday", "Monday"],
  ZONE_D: ["Thursday", "Tuesday"],
  ZONE_E: ["Friday", "Wednesday"],
};

// ======================
// HELPERS
// ======================

export function isZipInServiceArea(zip) {
  return ALLOWED_ZIPS.includes(String(zip).trim());
}

export function getZoneFromZip(zip) {
  return ZIP_TO_ZONE[String(zip).trim()] || null;
}

// ======================
// SCHEDULE BUILDER
// ======================

export function getServiceSchedule(zip, plan) {
  const zone = getZoneFromZip(zip);

  if (!zone) return null;

  // BASIC RELIEF
  if (plan === "Basic") {
    return {
      frequency: "biweekly",
      days: [ZONE_TO_DAY[zone]],
      week_offset: 0,
    };
  }

  // ELITE
  if (plan === "Elite") {
    return {
      frequency: "twice_weekly",
      days: ZONE_TO_ELITE_DAYS[zone],
      week_offset: 0,
    };
  }

  // STANDARD / PLUS / PREMIUM
  return {
    frequency: "weekly",
    days: [ZONE_TO_DAY[zone]],
    week_offset: 0,
  };
}

// ======================
// MAIN LOOKUP
// ======================

export function getServiceAreaResult(zip, plan) {
  const allowed = isZipInServiceArea(zip);

  if (!allowed) {
    return {
      allowed: false,
      zone: null,
      service_schedule: null,
      message:
        "Sorry, Backyard Relief does not currently service your area.",
    };
  }

  const zone = getZoneFromZip(zip);

  const service_schedule = getServiceSchedule(zip, plan);

  return {
    allowed: true,
    zone,
    service_schedule,
    message: `Your service schedule will be ${service_schedule.days.join(
      " & "
    )}.`,
  };
}