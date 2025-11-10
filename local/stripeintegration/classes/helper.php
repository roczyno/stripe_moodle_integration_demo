<?php
namespace local_stripeintegration;

defined('MOODLE_INTERNAL') || die();

require_once($GLOBALS['CFG']->dirroot . '/user/profile/lib.php');
require_once($GLOBALS['CFG']->dirroot . '/course/externallib.php');
require_once($GLOBALS['CFG']->dirroot . '/user/externallib.php');
require_once($GLOBALS['CFG']->dirroot . '/enrol/manual/externallib.php');

class helper {
    public static function cfg(string $name, $default = null) {
        $value = get_config('local_stripeintegration', $name);
        return ($value !== null && $value !== '') ? $value : $default;
    }

    public static function init_stripe(): void {
        $secret = self::cfg('secret_key');
        if (!$secret) {
            throw new \moodle_exception('Stripe secret not configured');
        }
        \Stripe\Stripe::setApiKey($secret);
    }

    public static function generate_password(int $length = 16): string {
        $low = 'abcdefghijklmnopqrstuvwxyz';
        $up  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $num = '0123456789';
        $sym = '!@#$%^&*()-_=+[]{};:,.?/';
        $all = $low . $up . $num . $sym;

        $pick = function (string $set) {
            return $set[random_int(0, strlen($set) - 1)];
        };

        $chars = [
            $pick($low),
            $pick($up),
            $pick($num),
            $pick($sym),
        ];
        while (count($chars) < $length) {
            $chars[] = $pick($all);
        }
        shuffle($chars);
        return implode('', $chars);
    }

    public static function plan_from_price(?string $priceid): ?string {
        $map = [
            self::cfg('price_starter_monthly') => 'starter_monthly',
            self::cfg('price_starter_yearly')  => 'starter_yearly',
            self::cfg('price_pro_monthly')     => 'pro_monthly',
            self::cfg('price_pro_yearly')      => 'pro_yearly',
        ];
        return $priceid && isset($map[$priceid]) ? $map[$priceid] : null;
    }

    public static function plan_categories(string $plan): array {
        $freemium = (int) self::cfg('cat_freemium', 2);
        $starter  = (int) self::cfg('cat_starter', 4);
        $pro      = (int) self::cfg('cat_pro', 5);

        $map = [
            'starter_monthly' => [$freemium, $starter],
            'starter_yearly'  => [$freemium, $starter],
            'pro_monthly'     => [$freemium, $starter, $pro],
            'pro_yearly'      => [$freemium, $starter, $pro],
        ];
        return $map[$plan] ?? [];
    }

    public static function user_by_email(string $email): ?\stdClass {
        $users = \core_user_external::get_users_by_field('email', [$email]);
        return !empty($users) ? (object) $users[0] : null;
    }

    public static function create_user(string $email, string $first, string $last): \stdClass {
        $auth = self::cfg('auth_method', 'email');
        $user = [
            'username'  => $email,
            'email'     => $email,
            'firstname' => $first,
            'lastname'  => $last,
            'auth'      => $auth,
        ];
        if ($auth === 'email') {
            $user['createpassword'] = 1;
        } else {
            $user['password'] = self::generate_password();
        }
        $created = \core_user_external::create_users([$user]);
        if (empty($created[0]['id'])) {
            throw new \moodle_exception('Failed to create Moodle user');
        }
        return \core_user::get_user($created[0]['id']);
    }

    public static function update_custom_field(int $userid, string $shortname, string $value): void {
        \core_user_external::update_users([[
            'id' => $userid,
            'customfields' => [
                ['type' => $shortname, 'value' => $value]
            ]
        ]]);
    }

    public static function course_ids_for_categories(array $categories): array {
        $visited = [];
        $courseids = [];

        $fetchcourses = function ($categoryid) use (&$courseids) {
            $resp = \core_course_external::get_courses_by_field('category', $categoryid);
            if (!empty($resp['courses'])) {
                foreach ($resp['courses'] as $course) {
                    $courseids[] = $course['id'];
                }
            }
        };

        $fetchchildren = function ($categoryid) {
            return \core_course_external::get_categories([
                ['key' => 'parent', 'value' => (string) $categoryid]
            ]);
        };

        $traverse = function ($categoryid) use (&$traverse, &$visited, $fetchcourses, $fetchchildren) {
            if (in_array($categoryid, $visited, true)) {
                return;
            }
            $visited[] = $categoryid;
            $fetchcourses($categoryid);
            $children = $fetchchildren($categoryid) ?? [];
            foreach ($children as $child) {
                $traverse($child['id']);
            }
        };

        foreach ($categories as $category) {
            $traverse($category);
        }

        return array_values(array_unique($courseids));
    }

    public static function enrol(int $userid, array $courseids): void {
        if (empty($courseids)) {
            return;
        }
        $roleid = (int) self::cfg('student_role', 5);
        $enrolments = [];
        foreach ($courseids as $courseid) {
            $enrolments[] = [
                'roleid' => $roleid,
                'userid' => $userid,
                'courseid' => $courseid,
            ];
        }
        \enrol_manual_external::enrol_users($enrolments);
    }

    public static function unenrol(int $userid, array $courseids): void {
        if (empty($courseids)) {
            return;
        }
        $roleid = (int) self::cfg('student_role', 5);
        $enrolments = [];
        foreach ($courseids as $courseid) {
            $enrolments[] = [
                'roleid' => $roleid,
                'userid' => $userid,
                'courseid' => $courseid,
            ];
        }
        \enrol_manual_external::unenrol_users($enrolments);
    }
}

