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

MOODLE_URL=https://your-moodle.com
MOODLE_TOKEN=abc123...
STUDENT_ROLE_ID=5

CAT_FREEMIUM_ID=10
CAT_STARTER_ID=11
CAT_PRO_ID=12

RESEND_API_KEY=
FROM_EMAIL=notifications@example.com
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

- URL: `https://yourapp.vercel.app/api/stripe-webhook`
- Events: `checkout.session.completed`, `customer.subscription.deleted`
- Copy the signing secret to `STRIPE_WEBHOOK_SECRET`.

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

# Stripe_payment_demo

# stripe_moodle_integration_demo

# stripe_moodle_integration_demo

# stripe_moodle_integration_demo
