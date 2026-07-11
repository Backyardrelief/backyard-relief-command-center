// src/lib/serviceArea.js

// -----------------------------------------------------------------------------
// PRODUCTION SERVICE AREA
// -----------------------------------------------------------------------------

export const ALLOWED_ZIPS = [
  // Zone A — Monday
  "80123",
  "80236",

  // Zone B — Tuesday
  "80127",
  "80128",

  // Zone C — Wednesday
  "80120",
  "80121",

  // Zone D — Thursday
  "80122",
  "80129",

  // Zone E — Friday
  "80125",
  "80126",
  "80130",
];

// Monday–Friday are the automatic ZIP-assigned service days.
export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

// Premium and Elite customers may choose Saturday during signup.
export const PRIORITY_SIGNUP_DAYS = [
  ...WEEKDAYS,
  "Saturday",
];

// Days available for manual scheduling inside the CRM.
export const INTERNAL_WORKING_DAYS = [
  ...WEEKDAYS,
  "Saturday",
];

// -----------------------------------------------------------------------------
// ZIP → ZONE
// -----------------------------------------------------------------------------

export const ZIP_TO_ZONE = {
  // Zone A — Monday
  "80123": "Zone A",
  "80236": "Zone A",

  // Zone B — Tuesday
  "80127": "Zone B",
  "80128": "Zone B",

  // Zone C — Wednesday
  "80120": "Zone C",
  "80121": "Zone C",

  // Zone D — Thursday
  "80122": "Zone D",
  "80129": "Zone D",

  // Zone E — Friday
  "80125": "Zone E",
  "80126": "Zone E",
  "80130": "Zone E",
};

// -----------------------------------------------------------------------------
// ZONE → AUTOMATIC SERVICE DAY
// -----------------------------------------------------------------------------

export const ZONE_TO_DAY = {
  "Zone A": "Monday",
  "Zone B": "Tuesday",
  "Zone C": "Wednesday",
  "Zone D": "Thursday",
  "Zone E": "Friday",
};

// Default Elite schedules.
//
// These are used only when two valid priority days have not been supplied.
// Saturday is never assigned automatically.
export const ZONE_TO_ELITE_DAYS = {
  "Zone A": ["Monday", "Thursday"],
  "Zone B": ["Tuesday", "Friday"],
  "Zone C": ["Wednesday", "Monday"],
  "Zone D": ["Thursday", "Tuesday"],
  "Zone E": ["Friday", "Wednesday"],
};

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function cleanZipCode(zip) {
  return String(zip || "")
    .replace(/\D/g, "")
    .slice(0, 5);
}

function normalizePlanKey(plan) {
  return String(plan || "").trim().toLowerCase();
}

function sanitizePrioritySelectedDays(selectedDays = []) {
  if (!Array.isArray(selectedDays)) {
    return [];
  }

  return [
    ...new Set(
      selectedDays.filter((day) =>
        PRIORITY_SIGNUP_DAYS.includes(day)
      )
    ),
  ];
}

export function isZipInServiceArea(zip) {
  const cleanZip = cleanZipCode(zip);
  return ALLOWED_ZIPS.includes(cleanZip);
}

export function getZoneFromZip(zip) {
  const cleanZip = cleanZipCode(zip);
  return ZIP_TO_ZONE[cleanZip] || null;
}

export function isPriorityPlan(plan) {
  const planKey = normalizePlanKey(plan);

  return planKey === "premium" || planKey === "elite";
}

export function getRequiredServiceDayCount(plan) {
  const planKey = normalizePlanKey(plan);

  return planKey === "elite" ? 2 : 1;
}

// -----------------------------------------------------------------------------
// SERVICE SCHEDULE
// -----------------------------------------------------------------------------

export function getServiceSchedule(
  zip,
  plan,
  selectedDays = []
) {
  const zone = getZoneFromZip(zip);

  if (!zone) {
    return null;
  }

  const planKey = normalizePlanKey(plan);
  const validSelectedDays =
    sanitizePrioritySelectedDays(selectedDays);

  if (planKey === "premium") {
    return {
      frequency: "weekly",
      days:
        validSelectedDays.length >= 1
          ? validSelectedDays.slice(0, 1)
          : [ZONE_TO_DAY[zone]],
      week_offset: 0,
      priority_scheduling: true,
    };
  }

  if (planKey === "elite") {
    return {
      frequency: "twice_weekly",
      days:
        validSelectedDays.length >= 2
          ? validSelectedDays.slice(0, 2)
          : [...ZONE_TO_ELITE_DAYS[zone]],
      week_offset: 0,
      priority_scheduling: true,
    };
  }

  if (planKey === "basic") {
    return {
      frequency: "biweekly",
      days: [ZONE_TO_DAY[zone]],
      week_offset: 0,
      priority_scheduling: false,
    };
  }

  // Standard and Relief Plus are weekly and assigned by ZIP.
  return {
    frequency: "weekly",
    days: [ZONE_TO_DAY[zone]],
    week_offset: 0,
    priority_scheduling: false,
  };
}

// -----------------------------------------------------------------------------
// COMPLETE SERVICE-AREA RESULT
// -----------------------------------------------------------------------------

export function getServiceAreaResult(
  zip,
  plan,
  selectedDays = []
) {
  const cleanZip = cleanZipCode(zip);

  if (!isZipInServiceArea(cleanZip)) {
    return {
      allowed: false,
      zone: null,
      service_schedule: null,
      message:
        "Sorry, Backyard Relief does not currently service your area.",
    };
  }

  const zone = getZoneFromZip(cleanZip);

  const serviceSchedule = getServiceSchedule(
    cleanZip,
    plan,
    selectedDays
  );

  if (!zone || !serviceSchedule) {
    return {
      allowed: false,
      zone: null,
      service_schedule: null,
      message:
        "We were unable to determine your service schedule. Please contact Backyard Relief.",
    };
  }

  return {
    allowed: true,
    zone,
    service_schedule: serviceSchedule,
    message: `Your service schedule will be ${serviceSchedule.days.join(
      " & "
    )}.`,
  };
}