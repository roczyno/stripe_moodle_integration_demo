# Handoff Guide: Stripe ↔ Next.js ↔ Moodle Integration

This document explains exactly what the Moodle team (backend LMS) must provide and what the Next.js/Stripe team must configure, with concrete examples, API notes, and troubleshooting.

---

## 1) Responsibilities

### Moodle Team (You)

Provide and maintain:

- MOODLE_URL: e.g., `https://academy.cyberlynk.io`
- MOODLE_TOKEN: Web service token that can call required functions
- STUDENT_ROLE_ID: Numeric role ID for students (e.g., `5`)
- Category IDs:
  - CAT_FREEMIUM_ID (e.g., `2`)
  - CAT_STARTER_ID (e.g., `4`)
  - CAT_PRO_ID (e.g., `5`)
- MOODLE_AUTH_METHOD:
  - `email` for email-based auth (Moodle emails confirmation)
  - `manual` for manual auth (app sets a compliant password)
- Moodle Web Service configuration:
  - External service containing functions and proper restrictions/permissions
  - SMTP configured if using `email` auth method

### Next.js/Stripe Team

Implement and deploy:

- Stripe Checkout and webhook endpoint
- Environment variables (Stripe, Moodle, categories)
- Webhook logic to enrol/unenrol based on subscription lifecycle
- Optional: Stripe Customer Portal link for manage/cancel

---

## 2) Environment Variables (Examples)

Place these in `.env.local` locally and in your host (e.g., Render/Vercel) environment:

```
# Stripe
STRIPE_SECRET_KEY=sk_test_123...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_123...
STRIPE_WEBHOOK_SECRET=whsec_123...

# Stripe Price IDs (from Stripe Dashboard)
STRIPE_PRICE_STARTER_MONTHLY=price_123...
STRIPE_PRICE_STARTER_YEARLY=price_456...
STRIPE_PRICE_PRO_MONTHLY=price_789...
STRIPE_PRICE_PRO_YEARLY=price_abc...

# Moodle
MOODLE_URL=https://academy.cyberlynk.io
MOODLE_TOKEN=abc123...
STUDENT_ROLE_ID=5
MOODLE_AUTH_METHOD=email

# Categories (from Moodle)
CAT_FREEMIUM_ID=2
CAT_STARTER_ID=4
CAT_PRO_ID=5
```

---

## 3) Stripe Setup

1. Create Products in Stripe:
   - Starter (Monthly) → recurring monthly price
   - Starter (Yearly) → recurring yearly price
   - Pro (Monthly) → recurring monthly price
   - Pro (Yearly) → recurring yearly price
2. Copy Price IDs into env variables above.
3. Webhook endpoint in Stripe:
   - URL: `https://YOUR_APP_DOMAIN/api/stripe-webhook`
   - Events (required):
     - `checkout.session.completed`
     - `customer.subscription.deleted`
   - Events (recommended):
     - `customer.subscription.updated`
     - `invoice.payment_failed`
     - `invoice.payment_succeeded`
   - Copy signing secret to `STRIPE_WEBHOOK_SECRET`.
4. Optional: Enable Stripe Customer Portal (self-serve manage/cancel). Create a Portal configuration in the Stripe Dashboard and in your app add a button that creates a portal session server-side.

---

## 4) Moodle Web Service Configuration

In Site administration → Server → Web services → External services:

- Ensure your service includes these functions:
  - `core_user_get_users_by_field`
  - `core_user_create_users`
  - `core_course_get_courses_by_field`
  - `core_course_get_categories`
  - `enrol_manual_enrol_users`
  - `enrol_manual_unenrol_users`
- Ensure service restrictions allow the token to be used:
  - If user-restricted → add the token’s user
  - If IP-restricted → add server egress IPs
  - If time-restricted → extend validity
- Token’s user permissions/role must allow:
  - `enrol/manual:enrol`
  - `enrol/manual:unenrol`
  - `moodle/role:assign` (to assign Student role)
  - `moodle/course:view`
- Enrolment plugin:
  - Plugins → Enrolments → enable “Manual enrolments”
  - In each course → Participants → Enrolment methods → enable “Manual enrolments”
- If using `MOODLE_AUTH_METHOD=email`:
  - Configure SMTP (Server → Email)
  - Ensure Email-based self-registration/auth is enabled and confirmation emails are sent

---

## 5) Plan-to-Category Mapping (Already Implemented)

In `lib/stripe.js`:

- Starter (Monthly/Yearly): Freemium + Starter categories
- Pro (Monthly/Yearly): Freemium + Starter + Pro categories

The webhook resolves courses for all mapped categories (recursively includes subcategories) and enrols the user.

---

## 6) Lifecycle Flows

### Purchase

- Event: `checkout.session.completed`
- Steps:
  1. Lookup Moodle user by email
  2. If not found → create user
     - manual: strong policy-compliant password (local generation)
     - email: createpassword=1 so Moodle emails the user
  3. Determine plan from metadata and enrol into mapped categories
  4. Link Stripe customer with `moodle_userid`

### Cancellation / Non-Renewal

- Event: `customer.subscription.deleted`
- Steps:
  - Unenrol from paid categories (Starter/Pro)
  - Keep Freemium access intact

### Upgrades / Downgrades (optional)

- Event: `customer.subscription.updated`
- Steps (suggested):
  - If upgrade Starter→Pro: enrol into additional Pro category (keep others)
  - If downgrade Pro→Starter: unenrol Pro category, keep Starter + Freemium
  - If `cancel_at_period_end=true`: do nothing yet; wait for `customer.subscription.deleted` at period end

### Payment Failures (optional policy)

- Event: `invoice.payment_failed`
  - Optionally log/notify; do not unenrol until Stripe cancels the subscription (or implement your own grace policy)
- Event: `invoice.payment_succeeded`
  - Optionally re-affirm enrolments

---

## 7) API Reference (Moodle Calls Used)

- `core_user_get_users_by_field` (field=email): returns user array
- `core_user_create_users` (users=[…]): creates users
  - manual auth → requires `password`
  - email auth → set `auth='email'` and `createpassword=1`
- `core_course_get_courses_by_field` (field=category, value={catId}): list courses in a category
- `core_course_get_categories` (criteria: parent=catId): list subcategories
- `enrol_manual_enrol_users` (enrolments=[{ roleid, userid, courseid }])
- `enrol_manual_unenrol_users` (enrolments=[…])

The integration logs every request and surfaces Moodle error structures (`exception`, `errorcode`).

---

## 8) Example Logs (Success Paths)

Purchase → user created → enrolled:

```
Checkout completed { plan: 'starter_yearly', email: 'user@example.com' }
Moodle create user response { id: 50, username: 'user@example.com' }
Resolving courses for plan { plan: 'starter_yearly', catIds: [2,4] }
Courses resolved from categories { courseIds: [11,12] }
Webhook enrolment completed { userid: 50, courseIds: [11,12] }
```

Cancellation:

```
Subscription deleted { customer: 'cus_...' , userid: 50 }
User unenrolled due to subscription deletion { userid: 50, courseIds: [11,12] }
```

---

## 9) Troubleshooting

- Webhook doesn’t fire

  - Verify Stripe webhook endpoint URL and events
  - Check signing secret in `STRIPE_WEBHOOK_SECRET`
  - Use Stripe CLI `stripe listen --forward-to localhost:3000/api/stripe-webhook`

- “Access control exception” on Moodle API

  - The service linked to the token is missing required functions or access
  - Add functions listed in Section 4 and ensure token user/restrictions are correct

- “wsusercannotassign” on enrol

  - Token’s user lacks permission to assign `STUDENT_ROLE_ID`
  - Ensure `moodle/role:assign` and enrol/manual permissions; enable manual enrolments

- No email received (email auth)

  - Ensure SMTP is configured and email auth is enabled in Moodle
  - Check spam folder; verify `MOODLE_AUTH_METHOD=email`

- Duplicate user error
  - We first lookup by email; if Moodle returns a non-standard shape, ensure `core_user_get_users_by_field` returns a plain array

---

## 10) Optional: Customer Portal (Manage/Cancel)

- Enable in Stripe Dashboard
- Add a “Manage subscription” button that creates a Portal session server-side and redirects the user
- Webhooks keep Moodle enrolments in sync automatically

---

## 11) Quick Test Plan

- Use Stripe test card `4242 4242 4242 4242` (any future expiry, any CVC)
- Complete checkout for Starter Monthly
- Verify in logs:
  - webhook verified → user lookup → (create if missing) → enrolment
- In Moodle:
  - user exists (per auth method)
  - user enrolled in Freemium + Starter courses
- Cancel subscription in Stripe → verify unenrolment from Starter (Freemium remains)

---

If your security policy limits functions, tell the Next.js team which Moodle endpoints are allowed, and they’ll adapt course resolution to fit (e.g., pre-provided course IDs by category).
