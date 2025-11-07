import { stripe } from '../../../lib/stripe';
import { logger } from '../../../lib/logger';
import { getUserByEmail } from '../../../lib/moodle';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { email, returnUrl } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!email) return res.status(400).json({ error: 'Missing email' });

    logger.info('Create customer portal requested', { email });

    // Attempt to find an existing customer by email (Stripe Search API requires it enabled; works in most accounts)
    let customer;
    try {
      const list = await stripe.customers.search({ query: `email:'${email}'` });
      if (list && list.data && list.data.length) {
        customer = list.data[0];
      }
    } catch {}

    if (!customer) {
      // No customer found - user has never purchased, redirect to plans
      logger.info('No Stripe customer found for email', { email });
      const plansUrl = process.env.NEXT_PUBLIC_PLANS_URL || `${req.headers.origin}/`;
      return res.status(200).json({ 
        redirectToPlans: true, 
        plansUrl 
      });
    }

    // Check if customer has any active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1
    });

    if (!subscriptions.data || subscriptions.data.length === 0) {
      // No active subscription - redirect to plans page
      logger.info('Customer has no active subscription', { email, customer: customer.id });
      const plansUrl = process.env.NEXT_PUBLIC_PLANS_URL || `${req.headers.origin}/`;
      return res.status(200).json({ 
        redirectToPlans: true, 
        plansUrl 
      });
    }

    // Customer has active subscription - create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: returnUrl || process.env.NEXT_PUBLIC_MOODLE_URL || `${req.headers.origin}/`
    });

    logger.info('Customer portal session created', { email, customer: customer.id });
    res.status(200).json({ url: session.url });
  } catch (err) {
    logger.error('Create customer portal error', { message: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
}


