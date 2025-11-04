import { logger } from './logger';

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
  const finalUrl = `${url}?${form.toString()}`;
  logger.info('Moodle request', { functionName, url: url, params });
  const res = await fetch(finalUrl);
  const text = await res.text();
  if (!res.ok) {
    logger.error('Moodle error response', { status: res.status, body: text });
    throw new Error(`Moodle error (${res.status})`);
  }
  try {
    const json = JSON.parse(text);
    logger.info('Moodle response', { functionName, ok: true });
    return json;
  } catch (e) {
    logger.error('Moodle JSON parse error', { body: text });
    throw e;
  }
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

// Recursively collect course IDs from categories (including subcategories)
export async function getCoursesByCats(catIds) {
  const visitedCats = new Set();
  const collectedCourseIds = new Set();

  async function fetchCoursesInCategory(categoryId) {
    // Fetch direct courses in this category
    const result = await callMoodle('core_course_get_courses_by_field', {
      field: 'category',
      value: String(categoryId)
    });
    const courses = result?.courses || [];
    logger.info('Courses fetched for category', { categoryId, count: courses.length });
    for (const c of courses) collectedCourseIds.add(c.id);
  }

  async function fetchChildrenCategories(parentId) {
    // Get subcategories of a category
    const criteria = { criteria: [{ key: 'parent', value: String(parentId) }] };
    const subcats = await callMoodle('core_course_get_categories', criteria);
    return Array.isArray(subcats) ? subcats : [];
  }

  async function traverse(categoryId) {
    if (visitedCats.has(categoryId)) return;
    visitedCats.add(categoryId);
    await fetchCoursesInCategory(categoryId);
    const children = await fetchChildrenCategories(categoryId);
    for (const child of children) {
      await traverse(child.id);
    }
  }

  for (const id of catIds) {
    await traverse(id);
  }

  return Array.from(collectedCourseIds);
}


