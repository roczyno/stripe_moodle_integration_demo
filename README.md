# Moodle Stripe Plans UI (Next.js)

This project now contains only the **presentation layer** for the subscription chooser. Every billing action (Stripe webhooks, Moodle enrolments, customer portal, plan changes) must be handled by the Moodle plugin you installed (`local/stripeintegration`). Use this app to render the four plan buttons (Freemium / Starter Monthly / Starter Yearly / Pro Monthly / Pro Yearly). Each button simply opens a URL.

---

## 1. Prerequisites

- Node.js 18 or newer
- Stripe Payment Links already created (test or live)
- Moodle site with the Stripe integration plugin managing subscriptions

---

## 2. Environment Variables (`.env.local`)

Create a `.env.local` file in the project root. All values are optional; defaults fall back to the current test links. Update them with your own URLs when ready.

```env
NEXT_PUBLIC_FREEMIUM_URL=https://learn.cylynk.com/login/index.php

NEXT_PUBLIC_STRIPE_PAYMENT_LINK_STARTER_MONTHLY=https://buy.stripe.com/test_14A6oA5xi5lVbjE8VzfAc03
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_STARTER_YEARLY=https://buy.stripe.com/test_9B65kw7Fq8y7fzU3BffAc02
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PRO_MONTHLY=https://buy.stripe.com/test_4gMbIU3pa7u373ogo1fAc01
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PRO_YEARLY=https://buy.stripe.com/test_eVq6oA5xiaGf9bw7RvfAc00
```

No secret keys or tokens are required here.

---

## 3. Run locally

```bash
npm install
npm run dev
```

Visit http://localhost:3000 to preview the plans page.

---

## 4. Deploying

You can deploy this Next.js UI anywhere (Vercel, Render, Netlify, even static hosting via `next export`). Typical workflow:

1. Push the repo to your hosting platform.
2. Set the four `NEXT_PUBLIC_...` variables in the platform’s environment configuration.
3. Build with `npm install && npm run build` (or `next export` for static output).
4. Deploy.

Because this app is purely client-side, no server-side configuration is necessary.

---

## 5. How the full system works

1. User loads this Next.js plans page and clicks a button.
2. Freemium → redirects to Moodle login.
3. Starter/Pro → opens the corresponding Stripe Payment Link.
4. Stripe sends events directly to Moodle’s webhook endpoint (`local/stripeintegration/webhook.php`).
5. The Moodle plugin creates/looks up the user, enrols courses, and exposes the Customer Portal (`/local/stripeintegration/portal.php`).


---

## 6. Related project

- Moodle Stripe integration plugin (handles all logic): see `local/stripeintegration/README.md` in your Moodle codebase.

Keep this repository focused on the UI so you can iterate quickly while letting Moodle enforce the business rules.***

