import { logger } from "./logger";

const MOODLE_URL = process.env.MOODLE_URL;
const TOKEN = process.env.MOODLE_TOKEN;

async function callMoodle(functionName, params) {
  const form = new URLSearchParams();
  form.append("wstoken", TOKEN);
  form.append("wsfunction", functionName);
  form.append("moodlewsrestformat", "json");

  if (params && typeof params === "object") {
    // Flatten simple object/array params into query string expected by Moodle
    const appendParam = (prefix, value) => {
      if (Array.isArray(value)) {
        value.forEach((v, i) => appendParam(`${prefix}[${i}]`, v));
      } else if (value !== null && typeof value === "object") {
        Object.entries(value).forEach(([k, v]) =>
          appendParam(`${prefix}[${k}]`, v)
        );
      } else if (value !== undefined) {
        form.append(prefix, String(value));
      }
    };
    Object.entries(params).forEach(([key, value]) => appendParam(key, value));
  }

  const url = `${MOODLE_URL}/webservice/rest/server.php`;
  const finalUrl = `${url}?${form.toString()}`;
  logger.info("Moodle request", { functionName, url: url, params });
  const res = await fetch(finalUrl);
  const text = await res.text();
  if (!res.ok) {
    logger.error("Moodle error response", { status: res.status, body: text });
    throw new Error(`Moodle error (${res.status})`);
  }
  try {
    const json = JSON.parse(text);
    // Detect Moodle error structures
    if (json && (json.exception || json.errorcode)) {
      logger.error("Moodle API error", { functionName, error: json });
      throw new Error(`Moodle API error: ${json.errorcode || json.exception}`);
    }
    logger.info("Moodle response", { functionName, ok: true });
    return json;
  } catch (e) {
    logger.error("Moodle JSON parse error", { body: text });
    throw e;
  }
}

export async function getUserByEmail(email) {
  const resp = await callMoodle("core_user_get_users_by_field", {
    field: "email",
    values: [email],
  });
  // Normalize to array for robustness (some setups may wrap results)
  let users = [];
  if (Array.isArray(resp)) {
    users = resp;
  } else if (resp && Array.isArray(resp.users)) {
    users = resp.users;
  } else if (resp && typeof resp === "object") {
    // Some Moodle versions return { users: [...] } or wrap differently
    logger.info("Moodle getUserByEmail response structure", {
      resp,
      type: typeof resp,
    });
  }
  logger.info("getUserByEmail result", {
    email,
    count: users.length,
    hasUsers: users.length > 0,
  });
  return users;
}

export async function createUser({ email, firstname, lastname, password }) {
  const username = email;
  const authMethod = (process.env.MOODLE_AUTH_METHOD || "manual").toLowerCase();
  const user = {
    username,
    email,
    firstname,
    lastname,
  };
  if (authMethod === "email") {
    // Let Moodle send confirmation email and handle password setup
    user.auth = "email";
    user.createpassword = 1; // Required if password is omitted
  } else {
    user.auth = "manual";
    if (password) user.password = password;
  }
  return callMoodle("core_user_create_users", { users: [user] });
}

export async function enrolUser(userid, courseids) {
  const roleId = parseInt(process.env.STUDENT_ROLE_ID);
  const enrolments = courseids.map((courseid) => ({
    roleid: roleId,
    userid,
    courseid,
  }));
  return callMoodle("enrol_manual_enrol_users", {
    enrolments,
  });
}

export async function unenrolUser(userid, courseids) {
  const roleId = parseInt(process.env.STUDENT_ROLE_ID);
  const enrolments = courseids.map((courseid) => ({
    roleid: roleId,
    userid,
    courseid,
  }));
  return callMoodle("enrol_manual_unenrol_users", {
    enrolments,
  });
}

// Recursively collect course IDs from categories (including subcategories)
export async function getCoursesByCats(catIds) {
  const visitedCats = new Set();
  const collectedCourseIds = new Set();

  async function fetchCoursesInCategory(categoryId) {
    // Fetch direct courses in this category
    const result = await callMoodle("core_course_get_courses_by_field", {
      field: "category",
      value: String(categoryId),
    });
    const courses = result?.courses || [];
    logger.info("Courses fetched for category", {
      categoryId,
      count: courses.length,
    });
    for (const c of courses) collectedCourseIds.add(c.id);
  }

  async function fetchChildrenCategories(parentId) {
    // Get subcategories of a category
    const criteria = { criteria: [{ key: "parent", value: String(parentId) }] };
    const subcats = await callMoodle("core_course_get_categories", criteria);
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

export async function updateUserCustomFields(userid, customFieldMap) {
  const customfields = Object.entries(customFieldMap).map(
    ([shortname, value]) => ({
      type: shortname,
      value,
    })
  );
  return callMoodle("core_user_update_users", {
    users: [
      {
        id: userid,
        customfields,
      },
    ],
  });
}
