# CyLynk Stripe ↔ Next.js ↔ Moodle Integration – Handoff Guide

This document captures everything the Next.js/Stripe developers need to operate and extend the subscription integration. It covers environment variables, Stripe requirements, Moodle expectations, API endpoints, lifecycle flows, logging, testing and deployment.

---

## 1. System Overview

- **Frontend:** Next.js app (Plans page) deployed on Render. Users pick plans (Freemium/Starter/Pro). Paid plans redirect straight to Stripe Payment Links; portal links let users manage subscriptions.
- **Backend APIs:** Next.js API routes handle checkout session creation (legacy), Stripe webhook processing, freemium enrolment, and Stripe Customer Portal session creation.
- **Moodle LMS:** Acts as course store. REST Web Services are used to look up/create users, enrol/unenrol them, resolve categories/courses, and save Stripe customer IDs.
- **Stripe:** Source of truth for billing. Webhooks drive Moodle enrolments and plan changes. Customer Portal sits in Moodle for self-service subscription management.

---

## 2. Environment Variables (.env.local)

Create `.env.local` (and mirror values in Render’s Environment settings):

```
# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (from Stripe Dashboard)
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...

# Optional: Stripe Payment Links (frontend defaults if not provided)
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_STARTER_MONTHLY=https://buy.stripe.com/test_...
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_STARTER_YEARLY=https://buy.stripe.com/test_...
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PRO_MONTHLY=https://buy.stripe.com/test_...
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PRO_YEARLY=https://buy.stripe.com/test_...

# Freemium redirect (Moodle login)
NEXT_PUBLIC_FREEMIUM_URL=https://learn.cylynk.com/login/index.php

# Plans URL (used when portal is accessed without active subscription)
NEXT_PUBLIC_PLANS_URL=https://your-nextjs-domain/

# Moodle REST API
MOODLE_URL=https://learn.cylynk.com
MOODLE_TOKEN=abc123...
STUDENT_ROLE_ID=5
MOODLE_AUTH_METHOD=email   # 'email' -> Moodle emails password; 'manual' -> app sets password
MOODLE_STRIPE_PROFILE_FIELD=stripe_customer_id   # custom profile field shortname

# Course category IDs
CAT_FREEMIUM_ID=2
CAT_STARTER_ID=4
CAT_PRO_ID=5

# Email delivery handled by Moodle
```

---

## 3. Stripe Configuration Checklist

1. **Products & Prices:** Create Products for Starter/Pro with recurring monthly & yearly prices. Record the Price IDs in `.env`.
2. **Payment Links (optional):** Generate Payment Links for each price in Stripe Dashboard (test/live). Populate `NEXT_PUBLIC_STRIPE_PAYMENT_LINK_*` to override defaults.
3. **Webhook Endpoint:**
   - URL: `https://YOUR_NEXTJS_DOMAIN/api/stripe-webhook`
   - Enabled events (required):
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Recommended additional events: `invoice.payment_succeeded`, `invoice.payment_failed`
   - Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. **Customer Portal:** Enable in Stripe Dashboard. Allow plan upgrades/downgrades and cancellation. Return URL should be Moodle (the endpoint also accepts `returnUrl`).

---

## 4. Moodle Requirements

### 4.1 Web Service Permissions

External service linked to `MOODLE_TOKEN` must include:

- `core_user_get_users_by_field`
- `core_user_create_users`
- `core_user_update_users`
- `core_course_get_courses_by_field`
- `core_course_get_categories`
- `enrol_manual_enrol_users`
- `enrol_manual_unenrol_users`

Token user must have permissions:

- `enrol/manual:enrol`
- `enrol/manual:unenrol`
- `moodle/role:assign` (so Student role can be assigned)
- `moodle/course:view`

### 4.2 Enrolment Plugin

- Enable “Manual enrolments” globally.
- Ensure each relevant course has Manual enrolments enabled (Participants → Enrolment methods).

### 4.3 Custom Profile Field

- Create a Text custom user profile field with shortname `stripe_customer_id`. The webhook will store the Stripe customer ID here for future portal lookups.

### 4.4 Customer Portal Relay Page

- Place a PHP page in Moodle (e.g. `local/manage_subscription/index.php`) that:
  - Requires login
  - Loads custom profile fields
  - Calls `https://YOUR_NEXTJS_DOMAIN/api/stripe/create-customer-portal` with `{ email, customerId, returnUrl }`
  - If `redirectToPlans` returned → redirect to `plansUrl`
  - Otherwise redirect to the Stripe portal URL

```php
<?php
require_once(__DIR__ . '/../../config.php');
require_login();

$PAGE->set_url('/local/manage_subscription/index.php');
$PAGE->set_context(context_system::instance());

require_once($CFG->libdir . '/filelib.php');
require_once($CFG->dirroot . '/user/profile/lib.php');

profile_load_custom_fields($USER);

$email = $USER->email ?? '';
$stripecustomerid = $USER->profile['stripe_customer_id'] ?? null;

$endpoint = 'https://YOUR_NEXTJS_DOMAIN/api/stripe/create-customer-portal';
$returnurl = $CFG->wwwroot . '/my/';

if (empty($email)) {
    \core\notification::error('Your account email is missing.');
    redirect(new moodle_url('/my/'));
}

$payload = json_encode([
    'email' => $email,
    'customerId' => $stripecustomerid,
    'returnUrl' => $returnurl,
]);

$curl = new curl();
$response = $curl->post($endpoint, $payload, [
    'CURLOPT_HTTPHEADER' => ['Content-Type: application/json'],
    'CURLOPT_TIMEOUT' => 15,
]);

if ($curl->get_errno()) {
    \core\notification::error('Unable to reach subscription service. Please try again later.');
    redirect(new moodle_url('/my/'));
}

$data = json_decode($response);
if (empty($data)) {
    debugging('Stripe portal response: ' . $response, DEBUG_DEVELOPER);
    \core\notification::error('Could not create Stripe portal session. Please contact support.');
    redirect(new moodle_url('/my/'));
}

if (!empty($data->redirectToPlans) && !empty($data->plansUrl)) {
    \core\notification::info('You do not have an active subscription. Redirecting to plans…');
    redirect($data->plansUrl);
}

if (!empty($data->url)) {
    redirect($data->url);
}

\core\notification::error('Could not create Stripe portal session. Please contact support.');
redirect(new moodle_url('/my/'));
```

Add a custom menu item or navbar link in Moodle pointing to `/local/manage_subscription/`.

---

## 5. Next.js API Endpoints

| Route                                     | Purpose                                | Notes                                                                      |
| ----------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------- |
| `POST /api/stripe-webhook`                | Handles Stripe webhooks                | Validates raw body, maps plans, enrols/unenrols, saves Stripe customer ID. |
| `POST /api/stripe/create-customer-portal` | Creates Stripe Customer Portal session | Returns `{url}` or `{redirectToPlans, plansUrl}`.                          |

All routes use the shared `logger` for structured logs.

---

## 6. Frontend (Plans Page)

- `components/Plans.js` renders four cards:
  - Freemium → `NEXT_PUBLIC_FREEMIUM_URL`
  - Starter Monthly → Payment Link
  - Starter Yearly → Payment Link
  - Pro Monthly → Payment Link
  - Pro Yearly → Payment Link
- The page can be restyled easily; Payment Links keep the integration simple.

---

## 7. Plan ↔ Category Mapping

Defined in `lib/stripe.js`:

- **Starter** → Freemium + Starter categories (`CAT_FREEMIUM_ID`, `CAT_STARTER_ID`)
- **Pro** → Freemium + Starter + Pro categories
- Mapping drives enrolment; plan names: `starter_monthly`, `starter_yearly`, `pro_monthly`, `pro_yearly`.

`lib/moodle.js` recursively resolves courses for each category (including subcategories).

---

## 8. Webhook Behaviour

### 8.1 `checkout.session.completed`

1. Determine plan (from metadata or session line item price ID).
2. Lookup Moodle user by email; create if missing.
   - `MOODLE_AUTH_METHOD=email` → auth `email`, `createpassword = 1` (Moodle emails password).
   - `manual` → strong password generated via `generateCompliantPassword` (meets Moodle policy).
3. Enrol into mapped categories.
4. Update Stripe customer metadata with `moodle_userid`.
5. Update Moodle custom user field `stripe_customer_id`.

### 8.2 `customer.subscription.updated`

1. Map new plan via subscription’s price ID.
2. Ensures enrolment into desired paid categories (Starter/Pro).
3. Unenrols user from categories not included in the new plan.
4. Freemium category always retained.

### 8.3 `customer.subscription.deleted`

- Unenrols from paid categories, retains Freemium.

### 8.4 Optional events

- `invoice.payment_failed`: logs (currently no hard unenrol).
- `invoice.payment_succeeded`: logs, can re-affirm enrolments if needed.

---

## 9. Logging

- All API routes use `logger` (`lib/logger.js`) to emit JSON logs with `ts`, `level`, `msg`, and optional `data`.
- Logs are visible in Render’s Logs UI or locally in the terminal.
- Sensitive fields (`token`, `secret`, etc.) are automatically redacted when possible.

---

## 10. Testing Checklist

1. **Test card purchase (Starter):**
   - Use Stripe test card `4242 4242 4242 4242` with future expiry & any CVC.
   - Confirm checkout, webhook enrolment, Moodle user creation, course access.
2. **Upgrade to Pro (Customer Portal):**
   - From Moodle portal link, upgrade plan.
   - Confirm `customer.subscription.updated` logs and course updates.
3. **Downgrade or cancel:**
   - Downgrade Pro → Starter; check unenrol from Pro courses.
   - Cancel; check user retains Freemium only.
4. **Freemium button:**
   - Redirects to Moodle login page (`NEXT_PUBLIC_FREEMIUM_URL`).
5. **Portal with no subscription:**
   - Click Manage Subscription with freemium-only user.
   - Should redirect to plans page with notification.

---

## 11. Deployment Notes (Render)

- `render.yaml` already sets:
  - Build: `npm install && npm run build`
  - Start: `npm start`
- Deploy as a Web Service (not static site).
- After deployment, add env variables via Render dashboard.
- Confirm `STRIPE_WEBHOOK_SECRET` uses the production webhook secret.
- Logs: available via Render Logs; JSON format simplifies parsing.

---

## 12. Extending / Maintenance Tips

- **Customer Portal:** Endpoint already handles returning plans link if no active subscription. You can preload Stripe customer ID from Moodle custom field to avoid search.
- **Metadata:** `stripe.customers.update` stores `moodle_userid` for quick lookups.
- **Course mapping:** Adjust `PLAN_CATS` if category IDs change or you add more tiers.
- **Error handling:** Moodle API errors are logged with function names and debuginfo; refer to logs for troubleshooting.
- **Auth method:** Switch `MOODLE_AUTH_METHOD` to `manual` if you’d rather send credentials yourself (email integration disabled). The webhook already handles the password generation.

---

## 13. Support Resources

- Moodle REST API docs: https://docs.moodle.org/dev/Web_service_API_functions
- Stripe Customer Portal docs: https://stripe.com/docs/customer-management
- Stripe CLI (for local webhook testing): `stripe listen --forward-to localhost:3000/api/stripe-webhook`

Whenever a workflow changes (new plan, new category, different email strategy), update this document and `.env` examples accordingly.
