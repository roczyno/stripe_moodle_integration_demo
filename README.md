# Moodle + Stripe Next.js Demo

Minimal Next.js app to sell subscriptions via Stripe and enrol users into Moodle categories' courses.

## Prerequisites

- Node 18+
- Stripe account with Prices created (monthly/yearly for Starter/Pro)
- Moodle with Web Services enabled and token

## Environment

Create a `.env.local` with:

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...

# Optional: Stripe Payment Links (used by the frontend if provided)
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_STARTER_MONTHLY=https://buy.stripe.com/test_14A6oA5xi5lVbjE8VzfAc03
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_STARTER_YEARLY=https://buy.stripe.com/test_9B65kw7Fq8y7fzU3BffAc02
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PRO_MONTHLY=https://buy.stripe.com/test_4gMbIU3pa7u373ogo1fAc01
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PRO_YEARLY=https://buy.stripe.com/test_eVq6oA5xiaGf9bw7RvfAc00

MOODLE_URL=https://your-moodle.com
MOODLE_TOKEN=abc123...
STUDENT_ROLE_ID=5
MOODLE_AUTH_METHOD=email # 'email' to let Moodle email confirmation; 'manual' to set password

CAT_FREEMIUM_ID=10
CAT_STARTER_ID=11
CAT_PRO_ID=12

# Email delivery is handled by Moodle; no email provider is required in this app
```

## Run

```
npm install
npm run dev
```

## Testing with Stripe

Use these test card numbers in Stripe Checkout:

### Successful Payments

- **Card:** `4242 4242 4242 4242`
- **Expiry:** Any future date (e.g., `12/25`)
- **CVC:** Any 3 digits (e.g., `123`)
- **ZIP:** Any 5 digits (e.g., `12345`)

### Declined Cards (for testing failures)

- **Card:** `4000 0000 0000 0002` (generic decline)
- **Card:** `4000 0000 0000 9995` (insufficient funds)

### Test Email

Use any email address (e.g., `test@example.com`) - Stripe will accept it in test mode.

**Note:** All test cards work with any name, address, and future expiry date when using Stripe test keys.

## Stripe Webhook

**⚠️ Webhooks don't work directly on localhost** - Stripe needs a publicly accessible URL.

### For Local Development (Recommended)

Use Stripe CLI to forward webhooks to your local server:

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:3000/api/stripe-webhook`
4. Copy the webhook signing secret (starts with `whsec_`) and add to `.env.local` as `STRIPE_WEBHOOK_SECRET`
5. In another terminal, trigger test events: `stripe trigger checkout.session.completed`

### For Production

In Stripe Dashboard → Developers → Webhooks → Add endpoint:

- URL: `https://your-app.onrender.com/api/stripe-webhook`
- Events: `checkout.session.completed`, `customer.subscription.deleted`
- Copy the signing secret to `STRIPE_WEBHOOK_SECRET` in your Render environment variables

### Troubleshooting Webhooks

**If you see checkout logs but no webhook logs:**

1. **Check webhook is configured in Stripe:**

   - Go to Stripe Dashboard → Developers → Webhooks
   - Verify the endpoint URL matches your deployed app URL
   - Check that `checkout.session.completed` event is enabled

2. **Verify webhook secret:**

   - In Stripe Dashboard → Webhooks → click your endpoint → "Signing secret"
   - Ensure this matches `STRIPE_WEBHOOK_SECRET` in your Render environment

3. **Check webhook delivery logs:**

   - In Stripe Dashboard → Webhooks → click your endpoint → "Recent events"
   - Look for failed attempts (red) and click to see error details

4. **Test endpoint accessibility:**

   - Visit: `https://your-app.onrender.com/api/webhook-test`
   - Should return JSON with status and configuration

5. **Trigger a test webhook:**
   - In Stripe Dashboard → Webhooks → click your endpoint → "Send test webhook"
   - Select `checkout.session.completed` event
   - Check your Render logs for the webhook receipt

## Deployment (Render)

**Important:** Deploy as a **Web Service**, not a Static Site.

1. Push your code to GitHub
2. In Render Dashboard → New → Web Service
3. Connect your repository
4. Configure:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Environment:** `Node`
5. Add all environment variables from `.env.local` in Render's Environment section
6. After deployment, update Stripe webhook URL to: `https://your-app.onrender.com/api/stripe-webhook`

The `render.yaml` file is included for automatic configuration if using Render's Blueprint feature.

## Flow

- Freemium: calls `/api/freemium` → ensure Moodle user → enrol courses from `CAT_FREEMIUM_ID`.
- Paid: `/api/create-checkout` sends to Stripe Checkout. Webhook `/api/stripe-webhook` ensures user, enrols based on `PLAN_CATS`, and links customer to `moodle_userid`.

## Manage Subscription (Customer Portal)

- Navigate to `/manage` and enter the email used at checkout
- The app verifies the Moodle user, finds/creates the Stripe customer, creates a Billing Portal session, and redirects you to Stripe to manage (upgrade/downgrade/cancel)
- Webhooks keep Moodle enrolments in sync after changes

# Stripe_payment_demo

# stripe_moodle_integration_demo

# stripe_moodle_integration_demo

# stripe_moodle_integration_demo
