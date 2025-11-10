<?php
require_once(__DIR__ . '/../../config.php');

use local_stripeintegration\helper;

require_login();
$PAGE->set_url('/local/stripeintegration/portal.php');
$PAGE->set_context(context_system::instance());

try {
    helper::init_stripe();

    $email = $USER->email ?? '';
    if (!$email) {
        throw new moodle_exception('missingemail', 'error');
    }

    require_once($CFG->dirroot . '/user/profile/lib.php');
    profile_load_custom_fields($USER);

    $shortname = helper::cfg('profile_field', 'stripe_customer_id');
    $customerid = $USER->profile[$shortname] ?? null;

    if ($customerid) {
        $customer = \Stripe\Customer::retrieve($customerid);
    } else {
        $search = \Stripe\Customer::search(['query' => "email:'{$email}'"]);
        if (!empty($search->data)) {
            $customer = $search->data[0];
        } else {
            $customer = \Stripe\Customer::create([
                'email' => $email,
                'metadata' => ['moodle_userid' => (string)$USER->id],
            ]);
        }
        helper::update_custom_field($USER->id, $shortname, $customer->id);
    }

    $subs = \Stripe\Subscription::all([
        'customer' => $customer->id,
        'status' => 'active',
        'limit' => 1,
    ]);

    if (empty($subs->data)) {
        \core\notification::info('No active subscription. Redirecting to plans.');
        redirect(helper::cfg('plans_url', $CFG->wwwroot));
    }

    $session = \Stripe\BillingPortal\Session::create([
        'customer' => $customer->id,
        'return_url' => helper::cfg('return_url', $CFG->wwwroot . '/my/'),
    ]);

    redirect($session->url);

} catch (Exception $e) {
    debugging('Stripe portal error: ' . $e->getMessage(), DEBUG_DEVELOPER);
    \core\notification::error('Unable to open subscription portal. Please try again later.');
    redirect(new moodle_url('/my/'));
}

