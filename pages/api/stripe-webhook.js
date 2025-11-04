import { buffer } from "micro";
import { stripe } from "../../lib/stripe";
import { PLAN_CATS } from "../../lib/stripe";
import {
  getUserByEmail,
  createUser,
  getCoursesByCats,
  enrolUser,
  unenrolUser,
} from "../../lib/moodle";
import { logger } from "../../lib/logger";
import { generateCompliantPassword } from "../../lib/password";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  logger.info("Webhook endpoint hit", {
    method: req.method,
    hasSignature: !!req.headers["stripe-signature"],
  });

  if (req.method !== "POST") {
    logger.warn("Webhook called with wrong method", { method: req.method });
    return res.status(405).end();
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    logger.error("STRIPE_WEBHOOK_SECRET missing in environment");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  let event;
  try {
    const sig = req.headers["stripe-signature"];
    if (!sig) {
      logger.error("Missing stripe-signature header");
      return res.status(400).json({ error: "Missing stripe-signature header" });
    }

    const buf = await buffer(req);
    logger.info("Attempting to verify webhook signature", {
      bodyLength: buf.length,
    });

    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    logger.info("Stripe webhook received and verified", {
      type: event.type,
      id: event.id,
    });
  } catch (err) {
    logger.error("Stripe webhook signature error", {
      message: err.message,
      stack: err.stack,
    });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const plan = session.metadata?.plan;
      const email = session.metadata?.email || session.customer_details?.email;
      const name =
        session.metadata?.name || session.customer_details?.name || "";
      const firstname = name.split(" ")[0] || "";
      const lastname = name.split(" ").slice(1).join(" ") || "";
      logger.info("Checkout completed", { plan, email, sessionId: session.id });

      let users = await getUserByEmail(email);
      let userid;
      if (!users || users.length === 0) {
        const password = generateCompliantPassword(16);
        const created = await createUser({
          email,
          firstname,
          lastname,
          password,
        });
        const createdRaw = Array.isArray(created) ? created : [created];
        userid = createdRaw?.[0]?.id;
        logger.info("Moodle create user response", { email, created });

        // Verify user exists after create
        if (!userid) {
          const verify = await getUserByEmail(email);
          if (Array.isArray(verify) && verify[0]?.id) {
            userid = verify[0].id;
            logger.info("Moodle user verified after create", { email, userid });
          } else {
            logger.error(
              "Moodle user creation did not return an id and verify failed",
              { email, created }
            );
            return res
              .status(500)
              .json({ error: "Failed to create Moodle user" });
          }
        } else {
          logger.info("Moodle user created via webhook", { email, userid });
        }
        // Email notifications are handled by Moodle configuration.
      } else {
        userid = users[0].id;
        logger.info("Existing Moodle user resolved via webhook", {
          email,
          userid,
        });
      }

      const catIds = PLAN_CATS[plan] || [];
      logger.info("Resolving courses for plan", { plan, catIds });

      if (!catIds || catIds.length === 0) {
        logger.warn("No category IDs found for plan", {
          plan,
          availablePlans: Object.keys(PLAN_CATS),
        });
      } else {
        const courseIds = await getCoursesByCats(catIds);
        logger.info("Courses resolved from categories", {
          catIds,
          courseCount: courseIds.length,
          courseIds,
        });

        if (courseIds.length) {
          await enrolUser(userid, courseIds);
          logger.info("Webhook enrolment completed", { userid, courseIds });
        } else {
          logger.warn("No courses found in categories", { catIds });
        }
      }

      if (session.customer) {
        await stripe.customers.update(session.customer, {
          metadata: { moodle_userid: String(userid) },
        });
        logger.info("Stripe customer linked", {
          customer: session.customer,
          userid,
        });
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      const customer = await stripe.customers.retrieve(sub.customer);
      const userid = customer?.metadata?.moodle_userid;
      logger.info("Subscription deleted", { customer: sub.customer, userid });
      if (userid) {
        const paidCats = [
          parseInt(process.env.CAT_STARTER_ID),
          parseInt(process.env.CAT_PRO_ID),
        ];
        const courseIds = await getCoursesByCats(paidCats);
        if (courseIds.length) {
          await unenrolUser(parseInt(userid), courseIds);
          logger.info("User unenrolled due to subscription deletion", {
            userid,
            courseIds,
          });
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    logger.error("Webhook handler error", {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ error: err.message });
  }
}
