import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const PRICE_IDS = {
  starter_monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
  starter_yearly: process.env.STRIPE_PRICE_STARTER_YEARLY,
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
  pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY,
};

export const PLAN_CATS = {
  starter_monthly: [parseInt(process.env.CAT_STARTER_ID)],
  starter_yearly: [parseInt(process.env.CAT_STARTER_ID)],
  pro_monthly: [
    parseInt(process.env.CAT_STARTER_ID),
    parseInt(process.env.CAT_PRO_ID),
  ],
  pro_yearly: [
    parseInt(process.env.CAT_STARTER_ID),
    parseInt(process.env.CAT_PRO_ID),
  ],
};
