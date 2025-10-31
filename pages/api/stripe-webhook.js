import { buffer } from 'micro';
import { stripe } from '../../lib/stripe';
import { PLAN_CATS } from '../../lib/stripe';
import { getUserByEmail, createUser, getCoursesByCats, enrolUser, unenrolUser } from '../../lib/moodle';
import { Resend } from 'resend';
import { logger } from '../../lib/logger';

export const config = { api: { bodyParser: false } };

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  let event;
  try {
    const sig = req.headers['stripe-signature'];
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
    logger.info('Stripe webhook received', { type: event.type, id: event.id });
  } catch (err) {
    logger.error('Stripe webhook signature error', { message: err.message });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const plan = session.metadata?.plan;
      const email = session.metadata?.email || session.customer_details?.email;
      const name = session.metadata?.name || session.customer_details?.name || '';
      const firstname = name.split(' ')[0] || '';
      const lastname = name.split(' ').slice(1).join(' ') || '';
      logger.info('Checkout completed', { plan, email, sessionId: session.id });

      let users = await getUserByEmail(email);
      let userid;
      if (!users || users.length === 0) {
        const password = Math.random().toString(36).slice(-12);
        const created = await createUser({ email, firstname, lastname, password });
        userid = Array.isArray(created) ? created[0]?.id : created?.[0]?.id;
        logger.info('Moodle user created via webhook', { email, userid });

        if (resend && process.env.FROM_EMAIL) {
          try {
            await resend.emails.send({
              from: process.env.FROM_EMAIL,
              to: email,
              subject: 'Welcome! Your Moodle Login',
              html: `<p>Username: ${email}<br>Password: ${password}<br>Login: ${process.env.MOODLE_URL}</p>`
            });
            logger.info('Welcome email sent via webhook', { to: email });
          } catch {}
        }
      } else {
        userid = users[0].id;
        logger.info('Existing Moodle user resolved via webhook', { email, userid });
      }

      const catIds = PLAN_CATS[plan] || [];
      const courseIds = await getCoursesByCats(catIds);
      if (courseIds.length) {
        await enrolUser(userid, courseIds);
        logger.info('Webhook enrolment completed', { userid, courseIds });
      }

      if (session.customer) {
        await stripe.customers.update(session.customer, {
          metadata: { moodle_userid: String(userid) }
        });
        logger.info('Stripe customer linked', { customer: session.customer, userid });
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const customer = await stripe.customers.retrieve(sub.customer);
      const userid = customer?.metadata?.moodle_userid;
      logger.info('Subscription deleted', { customer: sub.customer, userid });
      if (userid) {
        const paidCats = [parseInt(process.env.CAT_STARTER_ID), parseInt(process.env.CAT_PRO_ID)];
        const courseIds = await getCoursesByCats(paidCats);
        if (courseIds.length) {
          await unenrolUser(parseInt(userid), courseIds);
          logger.info('User unenrolled due to subscription deletion', { userid, courseIds });
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    logger.error('Webhook handler error', { message: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
}


