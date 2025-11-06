import { stripe } from '../../lib/stripe';
import { logger } from '../../lib/logger';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    const { customerId } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    if (!customerId) {
      return res.status(400).json({ error: 'Missing customerId' });
    }

    logger.info('Creating portal session', { customerId });

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.headers.origin}/`,
    });

    logger.info('Portal session created', { sessionId: session.id });
    res.status(200).json({ url: session.url });
  } catch (err) {
    logger.error('Portal session creation error', { message: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
}

