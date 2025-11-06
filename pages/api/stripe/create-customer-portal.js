import { stripe } from '../../../lib/stripe';
import { logger } from '../../../lib/logger';
import { getUserByEmail, updateUserCustomFields } from '../../../lib/moodle';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { email, returnUrl, customerId } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!email) return res.status(400).json({ error: 'Missing email' });

    logger.info('Create customer portal requested', { email, hasCustomerId: !!customerId });

    // Get Moodle user first (needed for saving customer ID)
    let moodleUser;
    try {
      const users = await getUserByEmail(email);
      moodleUser = Array.isArray(users) && users[0] ? users[0] : undefined;
      logger.info('Moodle user lookup', { email, found: !!moodleUser, userid: moodleUser?.id });
    } catch (lookupErr) {
      logger.warn('Moodle user lookup failed', { email, error: lookupErr.message });
    }

    // Try to use provided customerId first, then search by email, then create
    let customer;
    if (customerId) {
      try {
        customer = await stripe.customers.retrieve(customerId);
        logger.info('Retrieved Stripe customer by ID', { customerId: customer.id });
      } catch (retrieveErr) {
        logger.warn('Failed to retrieve customer by ID', { customerId, error: retrieveErr.message });
      }
    }

    if (!customer) {
      // Attempt to find an existing customer by email
      try {
        const list = await stripe.customers.search({ query: `email:'${email}'` });
        if (list && list.data && list.data.length) {
          customer = list.data[0];
          logger.info('Found Stripe customer by email', { customerId: customer.id });
        }
      } catch (searchErr) {
        logger.warn('Customer search failed', { email, error: searchErr.message });
      }
    }

    if (!customer) {
      // Create customer and link Moodle user id if available
      const moodleUserId = moodleUser?.id;
      customer = await stripe.customers.create({
        email,
        metadata: moodleUserId ? { moodle_userid: String(moodleUserId) } : undefined,
      });
      logger.info('Created Stripe customer for portal', { email, customer: customer.id, moodleUserId });
    }

    // Save stripe_customer_id to Moodle user custom field (if user exists)
    if (moodleUser?.id) {
      try {
        const shortname = process.env.MOODLE_STRIPE_PROFILE_FIELD || 'stripe_customer_id';
        const result = await updateUserCustomFields(moodleUser.id, { [shortname]: String(customer.id) });
        logger.info('Saved stripe_customer_id on Moodle user (portal)', { 
          userid: moodleUser.id, 
          shortname, 
          customerId: customer.id,
          result 
        });
      } catch (saveErr) {
        logger.error('Unable to save stripe_customer_id on Moodle user (portal)', { 
          userid: moodleUser.id,
          email,
          customerId: customer.id,
          error: saveErr.message,
          stack: saveErr.stack
        });
        // Don't fail the request - portal can still work
      }
    } else {
      logger.warn('No Moodle user found to save customer ID', { email });
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


