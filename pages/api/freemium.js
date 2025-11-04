import { getUserByEmail, createUser, getCoursesByCats, enrolUser } from '../../lib/moodle';
import { logger } from '../../lib/logger';
import { generateCompliantPassword } from '../../lib/password';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { email, firstname, lastname } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    logger.info('Freemium request received', { email });
    if (!email || !firstname || !lastname) {
      logger.warn('Freemium missing fields', { email, firstname: !!firstname, lastname: !!lastname });
      return res.status(400).json({ error: 'Missing email/firstname/lastname' });
    }

    let users = await getUserByEmail(email);
    logger.info('Moodle user lookup completed', { email, found: users?.length || 0 });
    let userid;
    if (!users || users.length === 0) {
      const authMethod = (process.env.MOODLE_AUTH_METHOD || 'manual').toLowerCase();
      const password = authMethod === 'email' ? undefined : generateCompliantPassword(16);
      const created = await createUser({ email, firstname, lastname, password });
      userid = Array.isArray(created) ? created[0]?.id : created?.[0]?.id;
      logger.info('Moodle user created', { email, userid, authMethod });
      // Email notifications are handled by Moodle configuration.
    } else {
      userid = users[0].id;
      logger.info('Moodle user exists', { email, userid });
    }

    const catIds = [parseInt(process.env.CAT_FREEMIUM_ID)];
    const courseIds = await getCoursesByCats(catIds);
    logger.info('Courses resolved for freemium', { catIds, courseCount: courseIds.length });
    if (courseIds.length) {
      await enrolUser(userid, courseIds);
      logger.info('Freemium enrolment completed', { userid, courseIds });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    logger.error('Freemium handler error', { message: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
}


