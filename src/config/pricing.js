// src/config/pricing.js

export const PLANS = [
  {
    key: "Basic",
    name: "Basic Relief",
    price: 70,
    frequency: "biweekly",
    stripePriceId: "price_1Tr4E5RtjZ6dFcKR834JLF1E",
  },

  {
    key: "Standard",
    name: "Standard Relief",
    price: 90,
    frequency: "weekly",
    stripePriceId: "price_1Tr4UrRtjZ6dFcKR8dudmVI8",
  },

  {
    key: "Plus",
    name: "Relief Plus",
    price: 110,
    frequency: "weekly",
    stripePriceId: "price_1Tr4VHRtjZ6dFcKRnTsEvHtm",
  },

  {
    key: "Premium",
    name: "Relief Premium",
    price: 125,
    frequency: "weekly",
    stripePriceId: "price_1Tr4VfRtjZ6dFcKR2GqNn7t7",
  },

  {
    key: "Elite",
    name: "Relief Elite",
    price: 150,
    frequency: "twice_weekly",
    stripePriceId: "price_1Tr4WIRtjZ6dFcKRLHSO6S7r",
  },
];

export const ADD_ONS = [
  {
    key: "offsite_disposal",
    label: "Off-site Disposal",
    price: 15,
    stripePriceId: "price_1Tr4XDRtjZ6dFcKRybHrW7Cd",
  },

  {
    key: "yard_deodorizing_monthly",
    label: "Monthly Yard Deodorizing",
    price: 35,
    stripePriceId: "price_1Tr4aWRtjZ6dFcKRnLEKYD7O",
  },

  {
    key: "yard_deodorizing_weekly",
    label: "Weekly Yard Deodorizing",
    price: 80,
    stripePriceId: "price_1Tr4c3RtjZ6dFcKRrHjhB8yG",
  },

  {
    key: "yard_deodorizing_biweekly",
    label: "BiWeekly Yard Deodorizing",
    price: 40,
    stripePriceId: "price_1Tr4bSRtjZ6dFcKRfoUFsNZN",
  },

  {
    key: "additional_dog",
    label: "Additional Dog",
    price: 16,
    stripePriceId: "price_1Tr4cORtjZ6dFcKRPaVpk9vV",
  },
];

export function getPlan(planKey) {
  return PLANS.find((p) => p.key === planKey);
}

export const PLAN_VALUES = PLANS.reduce((acc, plan) => {
  acc[plan.key] = plan.price;
  return acc;
}, {});