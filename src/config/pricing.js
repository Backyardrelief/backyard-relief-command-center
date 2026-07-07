// src/config/pricing.js

export const PLANS = [
  {
    key: "Basic",
    name: "Basic Relief",
    price: 60,
    frequency: "biweekly",
    stripePriceId: "price_1ToC1RRtjZ6dFcKRsXhinee3",
  },

  {
    key: "Standard",
    name: "Standard Relief",
    price: 80,
    frequency: "weekly",
    stripePriceId: "price_1ToC29RtjZ6dFcKRLM42iG7S",
  },

  {
    key: "Plus",
    name: "Relief Plus",
    price: 100,
    frequency: "weekly",
    stripePriceId: "price_1ToC2eRtjZ6dFcKRASqQhOWs",
  },

  {
    key: "Premium",
    name: "Relief Premium",
    price: 120,
    frequency: "weekly",
    stripePriceId: "price_1ToC37RtjZ6dFcKRScpODy5R",
  },

  {
    key: "Elite",
    name: "Relief Elite",
    price: 144,
    frequency: "twice_weekly",
    stripePriceId: "price_1ToC3ZRtjZ6dFcKRO4V7kH7b",
  },
];

export const ADD_ONS = [
  {
    key: "offsite_disposal",
    label: "Off-site Disposal",
    price: 15,
    stripePriceId: "price_1ToC48RtjZ6dFcKRQRAEW3NI",
  },

  {
    key: "yard_deodorizing_monthly",
    label: "Monthly Yard Deodorizing",
    price: 35,
    stripePriceId: "price_1ToC4wRtjZ6dFcKROJbg3jMv",
  },

  {
    key: "yard_deodorizing_visit",
    label: "Weekly Yard Deodorizing",
    price: 80,
    stripePriceId: "price_1ToC9wRtjZ6dFcKRAbuf6WSy",
  },

  {
    key: "yard_deodorizing_visit",
    label: "BiWeekly Yard Deodorizing",
    price: 40,
    stripePriceId: "price_1ToC9wRtjZ6dFcKRAbuf6WSy",
  },

  {
    key: "additional_dog",
    label: "Additional Dog",
    price: 16,
    stripePriceId: "price_1ToC5ORtjZ6dFcKRw8obYrqV",
  },
];

export function getPlan(planKey) {
  return PLANS.find((p) => p.key === planKey);
}

export const PLAN_VALUES = PLANS.reduce((acc, plan) => {
  acc[plan.key] = plan.price;
  return acc;
}, {});