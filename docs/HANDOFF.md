# Next.js Plans UI – Handoff Notes

This repository now contains **only the subscription selector UI**. All sensitive logic (Stripe webhooks, Moodle enrolments, Customer Portal) must live in Moodle via the `local/stripeintegration` plugin.

---

## What stays in Next.js

- `components/Plans.js` renders Freemium / Starter Monthly / Starter Yearly / Pro Monthly / Pro Yearly cards.
- Buttons link to the URLs provided via `NEXT_PUBLIC_...` environment variables:
  - Freemium → Moodle login (`NEXT_PUBLIC_FREEMIUM_URL`)
  - Starter/Pro → Stripe Payment Links (`NEXT_PUBLIC_STRIPE_PAYMENT_LINK_*`)
- No backend routes, API keys, or webhooks remain in this project.

### Environment variables

```env
NEXT_PUBLIC_FREEMIUM_URL=https://learn.cylynk.com/login/index.php
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_STARTER_MONTHLY=...
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_STARTER_YEARLY=...
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PRO_MONTHLY=...
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PRO_YEARLY=...
```

Deploy the UI anywhere (Vercel, Render, Netlify, static hosting). Set those variables in the host’s environment configuration.

---

## What must happen in Moodle

All subscription logic runs through the Moodle plugin:

- Stripe secrets stored in Moodle plugin settings
- Webhook endpoint: `https://your-moodle/local/stripeintegration/webhook.php`
- Customer Portal relay: `https://your-moodle/local/stripeintegration/portal.php`
- Moodle REST calls handle user creation, enrolment, plan changes, cancellation, and storing the Stripe customer ID.

Refer to `local/stripeintegration/README.md` in the Moodle repo for the full setup guide.

---

## Team Responsibilities

| Area | Owner |
| --- | --- |
| Plans UI, CSS, button labels | Next.js team |
| Payment Links management | Stripe team (configure links, swap test/live) |
| Stripe webhooks, Moodle enrolment rules, Customer Portal | Moodle plugin (`local/stripeintegration`) |
| “Manage my subscription” button | Moodle (link to `/local/stripeintegration/portal.php`) |

---

## Workflow summary

1. User loads this UI and clicks a plan.
2. Freemium → Moodle login. Starter/Pro → Stripe Payment Link.
3. Stripe Checkout completes → webhook hits Moodle plugin → plugin enrols/updates the user.
4. User manages their plan in Moodle (Customer Portal button).

Keep this document alongside the repo so everyone knows the UI is intentionally thin and all logic lives in Moodle.

