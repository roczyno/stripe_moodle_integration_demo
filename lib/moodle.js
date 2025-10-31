const MOODLE_URL = process.env.MOODLE_URL;
const TOKEN = process.env.MOODLE_TOKEN;

async function callMoodle(functionName, params) {
  const form = new URLSearchParams();
  form.append('wstoken', TOKEN);
  form.append('wsfunction', functionName);
  form.append('moodlewsrestformat', 'json');

  if (params && typeof params === 'object') {
    // Flatten simple object/array params into query string expected by Moodle
    const appendParam = (prefix, value) => {
      if (Array.isArray(value)) {
        value.forEach((v, i) => appendParam(`${prefix}[${i}]`, v));
      } else if (value !== null && typeof value === 'object') {
        Object.entries(value).forEach(([k, v]) => appendParam(`${prefix}[${k}]`, v));
      } else if (value !== undefined) {
        form.append(prefix, String(value));
      }
    };
    Object.entries(params).forEach(([key, value]) => appendParam(key, value));
  }

  const url = `${MOODLE_URL}/webservice/rest/server.php`;
  const res = await fetch(`${url}?${form.toString()}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Moodle error (${res.status}): ${text}`);
  }
  return res.json();
}

export async function getUserByEmail(email) {
  return callMoodle('core_user_get_users_by_field', {
    field: 'email',
    values: [email]
  });
}

export async function createUser({ email, firstname, lastname, password }) {
  const username = email;
  return callMoodle('core_user_create_users', {
    users: [
      {
        username,
        email,
        firstname,
        lastname,
        password,
        auth: 'manual'
      }
    ]
  });
}

export async function enrolUser(userid, courseids) {
  const roleId = parseInt(process.env.STUDENT_ROLE_ID);
  const enrolments = courseids.map((courseid) => ({
    roleid: roleId,
    userid,
    courseid
  }));
  return callMoodle('enrol_manual_enrol_users', {
    enrolments
  });
}

export async function unenrolUser(userid, courseids) {
  const roleId = parseInt(process.env.STUDENT_ROLE_ID);
  const enrolments = courseids.map((courseid) => ({
    roleid: roleId,
    userid,
    courseid
  }));
  return callMoodle('enrol_manual_unenrol_users', {
    enrolments
  });
}

export async function getCoursesByCats(catIds) {
  // Many Moodle installs support core_course_get_courses_by_field with field 'category'
  // Fallback to listing all courses may be needed in some versions; here we assume by-field works.
  const allCourseIds = [];
  for (const categoryId of catIds) {
    const result = await callMoodle('core_course_get_courses_by_field', {
      field: 'category',
      value: String(categoryId)
    });
    const courses = result?.courses || [];
    for (const c of courses) allCourseIds.push(c.id);
  }
  return Array.from(new Set(allCourseIds));
}


