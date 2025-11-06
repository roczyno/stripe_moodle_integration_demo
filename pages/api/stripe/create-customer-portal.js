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
      // Create customer and link Moodle user id if available
      let moodleUserId;
      try {
        const users = await getUserByEmail(email);
        moodleUserId = Array.isArray(users) && users[0]?.id ? users[0].id : undefined;
      } catch {}

      customer = await stripe.customers.create({
        email,
        metadata: moodleUserId ? { moodle_userid: String(moodleUserId) } : undefined,
      });
      logger.info('Created Stripe customer for portal', { email, customer: customer.id, moodleUserId });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: returnUrl || process.env.NEXT_PUBLIC_MOODLE_URL || `${req.headers.origin}/`
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    logger.error('Create customer portal error', { message: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
}


