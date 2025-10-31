import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const PRICE_IDS = {
  // Replace with your actual Stripe Price IDs
  starter_monthly: 'price_starter_monthly',
  starter_yearly: 'price_starter_yearly',
  pro_monthly: 'price_pro_monthly',
  pro_yearly: 'price_pro_yearly'
};

export const PLAN_CATS = {
  starter_monthly: [parseInt(process.env.CAT_STARTER_ID)],
  starter_yearly: [parseInt(process.env.CAT_STARTER_ID)],
  pro_monthly: [parseInt(process.env.CAT_STARTER_ID), parseInt(process.env.CAT_PRO_ID)],
  pro_yearly: [parseInt(process.env.CAT_STARTER_ID), parseInt(process.env.CAT_PRO_ID)]
};


