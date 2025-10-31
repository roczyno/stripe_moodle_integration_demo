import { logger } from '../../lib/logger';

export default async function handler(req, res) {
  logger.info('Webhook test endpoint hit', { 
    method: req.method,
    headers: Object.keys(req.headers),
    hasStripeSignature: !!req.headers['stripe-signature']
  });
  
  res.json({ 
    status: 'ok',
    endpoint: '/api/stripe-webhook',
    webhookSecretConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
    timestamp: new Date().toISOString()
  });
}

