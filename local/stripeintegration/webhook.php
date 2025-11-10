<?php
define('NO_MOODLE_COOKIE', true);
require_once(__DIR__ . '/../../config.php');

use local_stripeintegration\helper;

header('Content-Type: application/json');

try {
    helper::init_stripe();
    $signingsecret = helper::cfg('webhook_secret');
    if (!$signingsecret) {
        throw new Exception('Webhook signing secret not configured');
    }

    $payload = file_get_contents('php://input');
    $sigheader = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';
    $event = \Stripe\Webhook::constructEvent($payload, $sigheader, $signingsecret);

    switch ($event->type) {
        case 'checkout.session.completed':
            handle_checkout_session_completed($event->data->object);
            break;
        case 'customer.subscription.updated':
            handle_subscription_updated($event->data->object);
            break;
        case 'customer.subscription.deleted':
            handle_subscription_deleted($event->data->object);
            break;
        default:
            // Ignore other events
    }

    http_response_code(200);
    echo json_encode(['received' => true]);
} catch (\UnexpectedValueException $e) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid payload']);
} catch (\Stripe\Exception\SignatureVerificationException $e) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid signature']);
} catch (Exception $e) {
    debugging('Stripe webhook error: ' . $e->getMessage(), DEBUG_DEVELOPER);
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}

function handle_checkout_session_completed($session) {
    helper::init_stripe();
    $plan = $session->metadata->plan ?? null;
    $email = $session->metadata->email ?? ($session->customer_details->email ?? '');
    $name = $session->metadata->name ?? ($session->customer_details->name ?? '');
    [$firstname, $lastname] = split_name($name);

    if (!$plan) {
        $full = \Stripe\Checkout\Session::retrieve([
            'id' => $session->id,
            'expand' => ['line_items.data.price'],
        ]);
        $priceid = $full->line_items->data[0]->price->id ?? null;
        $plan = $priceid ? helper::plan_from_price($priceid) : null;
        if (!$plan) {
            throw new Exception('Unable to determine plan');
        }
    }

    $user = helper::user_by_email($email) ?? helper::create_user($email, $firstname, $lastname);

    $catids = helper::plan_categories($plan);
    $courseids = helper::course_ids_for_categories($catids);
    helper::enrol($user->id, $courseids);

    if (!empty($session->customer)) {
        \Stripe\Customer::update($session->customer, [
            'metadata' => ['moodle_userid' => (string)$user->id],
        ]);
        $field = helper::cfg('profile_field', 'stripe_customer_id');
        helper::update_custom_field($user->id, $field, (string)$session->customer);
    }
}

function handle_subscription_updated($subscription) {
    helper::init_stripe();
    $priceid = $subscription->items->data[0]->price->id ?? null;
    $plan = $priceid ? helper::plan_from_price($priceid) : null;
    $customerid = $subscription->customer ?? null;
    if (!$plan || !$customerid) {
        return;
    }

    $customer = \Stripe\Customer::retrieve($customerid);
    $userid = isset($customer->metadata->moodle_userid) ? (int)$customer->metadata->moodle_userid : 0;
    if (!$userid) {
        return;
    }

    $desiredcats = helper::plan_categories($plan);
    $freemium = (int)helper::cfg('cat_freemium', 2);
    $desiredpaid = array_diff($desiredcats, [$freemium]);
    $allpaid = array_unique([
        (int)helper::cfg('cat_starter', 4),
        (int)helper::cfg('cat_pro', 5),
    ]);
    $removecats = array_diff($allpaid, $desiredpaid);

    if (!empty($desiredpaid)) {
        $courses = helper::course_ids_for_categories($desiredpaid);
        helper::enrol($userid, $courses);
    }
    if (!empty($removecats)) {
        $courses = helper::course_ids_for_categories($removecats);
        helper::unenrol($userid, $courses);
    }
}

function handle_subscription_deleted($subscription) {
    helper::init_stripe();
    $customerid = $subscription->customer ?? null;
    if (!$customerid) {
        return;
    }

    $customer = \Stripe\Customer::retrieve($customerid);
    $userid = isset($customer->metadata->moodle_userid) ? (int)$customer->metadata->moodle_userid : 0;
    if (!$userid) {
        return;
    }

    $starter = (int)helper::cfg('cat_starter', 4);
    $pro = (int)helper::cfg('cat_pro', 5);
    $courses = helper::course_ids_for_categories([$starter, $pro]);
    helper::unenrol($userid, $courses);
}

function split_name(string $name): array {
    if (!$name) {
        return ['First', 'Last'];
    }
    $parts = preg_split('/\s+/', trim($name), 2);
    return [$parts[0], $parts[1] ?? ''];
}

