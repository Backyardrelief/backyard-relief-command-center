// src/lib/serviceArea.js

export const ALLOWED_ZIPS = [
  "80235",
  "80236",
  "80121",
  "80122",
  "80120",
  "80123",
  "80127",
  "80128",
  "80129",
  "80126",
  "80130",
];

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export const ZIP_TO_ZONE = {
  "80235": "Zone E",
  "80236": "Zone E",

  "80121": "Zone D",
  "80122": "Zone D",

  "80120": "Zone B",

  "80123": "Zone A",
  "80127": "Zone A",
  "80128": "Zone A",

  "80129": "Zone C",
  "80126": "Zone C",
  "80130": "Zone C",
};

export const ZONE_TO_DAY = {
  "Zone E": "Monday",
  "Zone D": "Tuesday",
  "Zone B": "Wednesday",
  "Zone A": "Thursday",
  "Zone C": "Friday",
};

export const ZONE_TO_ELITE_DAYS = {
  "Zone E": ["Monday", "Thursday"],
  "Zone D": ["Tuesday", "Friday"],
  "Zone B": ["Wednesday", "Monday"],
  "Zone A": ["Thursday", "Monday"],
  "Zone C": ["Friday", "Tuesday"],
};

export function isZipInServiceArea(zip) {
  const cleanZip = String(zip || "").trim().slice(0, 5);
  return ALLOWED_ZIPS.includes(cleanZip);
}

export function getZoneFromZip(zip) {
  const cleanZip = String(zip || "").trim().slice(0, 5);
  return ZIP_TO_ZONE[cleanZip] || null;
}

export function isPriorityPlan(plan) {
  return plan === "Premium" || plan === "Elite";
}

export function getRequiredServiceDayCount(plan) {
  if (plan === "Elite") return 2;
  return 1;
}

export function getServiceSchedule(zip, plan, selectedDays = []) {
  const zone = getZoneFromZip(zip);

  if (!zone) return null;

  if (plan === "Premium") {
    return {
      frequency: "weekly",
      days: selectedDays.length ? selectedDays : [ZONE_TO_DAY[zone]],
      week_offset: 0,
      priority_scheduling: true,
    };
  }

  if (plan === "Elite") {
    return {
      frequency: "twice_weekly",
      days: selectedDays.length ? selectedDays : ZONE_TO_ELITE_DAYS[zone],
      week_offset: 0,
      priority_scheduling: true,
    };
  }

  if (plan === "Basic") {
    return {
      frequency: "biweekly",
      days: [ZONE_TO_DAY[zone]],
      week_offset: 0,
      priority_scheduling: false,
    };
  }

  return {
    frequency: "weekly",
    days: [ZONE_TO_DAY[zone]],
    week_offset: 0,
    priority_scheduling: false,
  };
}

export function getServiceAreaResult(zip, plan, selectedDays = []) {
  const cleanZip = String(zip || "").trim().slice(0, 5);
  const allowed = isZipInServiceArea(cleanZip);

  if (!allowed) {
    return {
      allowed: false,
      zone: null,
      service_schedule: null,
      message: "Sorry, Backyard Relief does not currently service your area.",
    };
  }

  const zone = getZoneFromZip(cleanZip);
  const service_schedule = getServiceSchedule(cleanZip, plan, selectedDays);

  return {
    allowed: true,
    zone,
    service_schedule,
    message: `Your service schedule will be ${service_schedule.days.join(
      " & "
    )}.`,
  };
}