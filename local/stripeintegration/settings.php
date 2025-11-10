<?php
defined('MOODLE_INTERNAL') || die();

if ($hassiteconfig) {
    $settings = new admin_settingpage('local_stripeintegration',
        get_string('pluginname', 'local_stripeintegration'));

    $settings->add(new admin_setting_configpasswordunmask(
        'local_stripeintegration/secret_key',
        get_string('secret_key', 'local_stripeintegration'),
        '',
        ''
    ));

    $settings->add(new admin_setting_configpasswordunmask(
        'local_stripeintegration/webhook_secret',
        get_string('webhook_secret', 'local_stripeintegration'),
        '',
        ''
    ));

    $settings->add(new admin_setting_configtext(
        'local_stripeintegration/return_url',
        get_string('return_url', 'local_stripeintegration'),
        '',
        $CFG->wwwroot . '/my/'
    ));

    $settings->add(new admin_setting_configtext(
        'local_stripeintegration/plans_url',
        get_string('plans_url', 'local_stripeintegration'),
        '',
        $CFG->wwwroot
    ));

    $settings->add(new admin_setting_configtext(
        'local_stripeintegration/cat_freemium',
        get_string('cat_freemium', 'local_stripeintegration'),
        '',
        '2'
    ));

    $settings->add(new admin_setting_configtext(
        'local_stripeintegration/cat_starter',
        get_string('cat_starter', 'local_stripeintegration'),
        '',
        '4'
    ));

    $settings->add(new admin_setting_configtext(
        'local_stripeintegration/cat_pro',
        get_string('cat_pro', 'local_stripeintegration'),
        '',
        '5'
    ));

    $settings->add(new admin_setting_configtext(
        'local_stripeintegration/student_role',
        get_string('student_role', 'local_stripeintegration'),
        '',
        '5'
    ));

    $settings->add(new admin_setting_configselect(
        'local_stripeintegration/auth_method',
        get_string('auth_method', 'local_stripeintegration'),
        '',
        'email',
        ['email' => 'email', 'manual' => 'manual']
    ));

    $settings->add(new admin_setting_configtext(
        'local_stripeintegration/profile_field',
        get_string('profile_field', 'local_stripeintegration'),
        '',
        'stripe_customer_id'
    ));

    $settings->add(new admin_setting_configtext(
        'local_stripeintegration/price_starter_monthly',
        'Stripe Price ID: Starter Monthly',
        '',
        ''
    ));

    $settings->add(new admin_setting_configtext(
        'local_stripeintegration/price_starter_yearly',
        'Stripe Price ID: Starter Yearly',
        '',
        ''
    ));

    $settings->add(new admin_setting_configtext(
        'local_stripeintegration/price_pro_monthly',
        'Stripe Price ID: Pro Monthly',
        '',
        ''
    ));

    $settings->add(new admin_setting_configtext(
        'local_stripeintegration/price_pro_yearly',
        'Stripe Price ID: Pro Yearly',
        '',
        ''
    ));

    $ADMIN->add('localplugins', $settings);
}


