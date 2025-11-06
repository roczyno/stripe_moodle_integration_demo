import { stripe } from '../../lib/stripe';
import { getUserByEmail } from '../../lib/moodle';
import { logger } from '../../lib/logger';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { email } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!email) return res.status(400).json({ error: 'Missing email' });

    logger.info('Portal request received', { email });

    // 1) Ensure Moodle user exists
    const users = await getUserByEmail(email);
    if (!users || users.length === 0) {
      logger.warn('Portal request: moodle user not found', { email });
      return res.status(404).json({ error: 'User not found in Moodle' });
    }
    const userid = users[0].id;

    // 2) Find or create Stripe customer
    let customer;
    try {
      const search = await stripe.customers.search({
        query: `metadata['moodle_userid']:'${userid}' OR email:'${email}'`
      });
      if (search.data && search.data.length) {
        customer = search.data[0];
      }
    } catch (e) {
      logger.warn('Stripe customer search failed; will attempt create', { message: e.message });
    }

    if (!customer) {
      customer = await stripe.customers.create({
        email,
        metadata: { moodle_userid: String(userid) }
      });
    }

    // 3) Create Billing Portal session
    const returnUrl = `${req.headers.origin || ''}/success`;
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: returnUrl
    });

    logger.info('Portal session created', { customer: customer.id });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    logger.error('Portal creation error', { message: err.message, stack: err.stack });
    return res.status(500).json({ error: err.message });
  }
}


