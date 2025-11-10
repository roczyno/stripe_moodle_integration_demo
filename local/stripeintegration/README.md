# Stripe Integration Plugin for Moodle

This plugin moves all Stripe billing logic into Moodle while your Next.js site remains the presentation layer (plan buttons and links). Users click a plan in Next.js → Stripe Payment Link handles checkout → Stripe webhooks hit Moodle → the plugin enrols/unenrols users in the correct courses.

---

## Files supplied

```
local/stripeintegration/
├─ version.php
├─ settings.php
├─ db/access.php
├─ composer.json          (installs stripe/stripe-php)
├─ lang/en/local_stripeintegration.php
├─ classes/helper.php     (shared helper functions)
├─ webhook.php            (Stripe webhook endpoint)
├─ portal.php             (Customer Portal entry point)
└─ README.md
```

---

## Installation

1. Copy the `local/stripeintegration` folder into your Moodle codebase (`moodle/local/`).
2. From inside that folder, run `composer install --no-dev --prefer-dist`. If you cannot run composer on the server, run it locally and upload the generated `vendor/` directory alongside the plugin.
3. Visit *Site administration → Notifications* to let Moodle detect and install the plugin.
4. Create a custom user profile field (Text input) with shortname `stripe_customer_id` (Site administration → Users → Accounts → User profile fields).
5. Configure the plugin via *Site administration → Plugins → Local plugins → Stripe Integration*:
   - Stripe secret key (test or live)
   - Stripe webhook signing secret
   - Return URL (where Stripe Customer Portal sends users after exit)
   - Plans page URL (Next.js plans page, used when a user has no subscription)
   - Category IDs for Freemium/Starter/Pro
   - Student role ID
   - Auth method (`email` = Moodle emails password, `manual` = plugin sets password)
   - Stripe price IDs for each plan
6. In Stripe Dashboard, change your webhook endpoint to point to Moodle:
   - `https://YOUR_MOODLE_DOMAIN/local/stripeintegration/webhook.php`
   - Enable events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Paste the signing secret into the plugin settings.
7. Update your Next.js UI so:
   - Freemium button points to `https://YOUR_MOODLE_DOMAIN/login/index.php`
   - Starter/Pro buttons point to Stripe Payment Links
   - “Manage my subscription” button links to `https://YOUR_MOODLE_DOMAIN/local/stripeintegration/portal.php`
8. Test in Stripe test mode (see below) before switching to live keys.

---

## Behaviour

### Webhook (`webhook.php`)
- `checkout.session.completed`
  - Determines plan from metadata or price ID
  - Looks up or creates a Moodle user
  - Enrols the user in the appropriate categories (Freemium always included)
  - Stores `moodle_userid` on the Stripe customer metadata
  - Saves `stripe_customer_id` to the Moodle custom profile field
- `customer.subscription.updated`
  - Syncs enrolments for plan changes (adds new category courses, removes old ones)
- `customer.subscription.deleted`
  - Unenrols paid categories while keeping Freemium

### Portal (`portal.php`)
- Ensures a Stripe customer exists (creates one if missing)
- If no active subscription, notifies the user and redirects them to the plans page
- Otherwise creates a Stripe Customer Portal session and redirects there

---

## Testing checklist

1. Set Moodle debugging to DEVELOPER during testing (Site admin → Development → Debugging).
2. Use Stripe test mode:
   - Source card: `4242 4242 4242 4242`, future expiry, any CVC/ZIP.
3. Purchase Starter → confirm user creation and course enrolment in Moodle.
4. Upgrade via Customer Portal to Pro → confirm `customer.subscription.updated` adjusts enrolments.
5. Downgrade to Starter → confirm Pro courses removed.
6. Cancel subscription in Portal → verify only Freemium remains.
7. Click “Manage my subscription” as a user with no active subscription → should be redirected to plans page.
8. Switch to live keys and webhook secret when ready for production.

---

## Deploying to production

- Ensure Moodle runs over HTTPS (Stripe requires TLS 1.2+).
- Cron should run regularly for Moodle emails (if using `auth = email`).
- Keep Stripe keys secure; do not store them in version control.
- After switching to live mode, update the plugin settings with live keys and webhook secret, and update the Stripe Dashboard endpoint accordingly.

---

## Packaging

To distribute the plugin as a zip:
```
cd moodle/local
zip -r stripeintegration.zip stripeintegration
```
Provide this zip to the client or deploy directly to production.

---

## Support

- Stripe PHP SDK: https://github.com/stripe/stripe-php
- Moodle Web Services: https://docs.moodle.org/dev/Web_service_API_functions
- Stripe Webhooks: https://stripe.com/docs/webhooks

For questions or updates, document changes here and notify the team managing the Next.js plans page.

