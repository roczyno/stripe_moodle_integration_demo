import { stripe } from '../../lib/stripe';
import { PRICE_IDS } from '../../lib/stripe';
import { logger } from '../../lib/logger';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { plan } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    logger.info('Create checkout called', { plan, origin: req.headers.origin });

    if (!plan || !PRICE_IDS[plan]) {
      logger.warn('Invalid plan specified', { plan });
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_IDS[plan],
          quantity: 1
        }
      ],
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/?canceled=true`,
      metadata: { plan }
    });

    logger.info('Stripe checkout session created', { plan, sessionId: session.id });
    res.status(200).json({ url: session.url });
  } catch (err) {
    logger.error('Create checkout error', { message: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
}


