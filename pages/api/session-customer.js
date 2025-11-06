import { stripe } from '../../lib/stripe';
import { logger } from '../../lib/logger';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'Missing session_id' });
  try {
    logger.info('Fetching session to resolve customer', { session_id });
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!session?.customer) return res.status(404).json({ error: 'Customer not found on session' });
    return res.status(200).json({ customerId: session.customer });
  } catch (err) {
    logger.error('Error fetching session customer', { message: err.message });
    return res.status(500).json({ error: err.message });
  }
}


