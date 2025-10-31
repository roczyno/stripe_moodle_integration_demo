import { getUserByEmail, createUser, getCoursesByCats, enrolUser } from '../../lib/moodle';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { email, firstname, lastname } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!email || !firstname || !lastname) {
      return res.status(400).json({ error: 'Missing email/firstname/lastname' });
    }

    let users = await getUserByEmail(email);
    let userid;
    if (!users || users.length === 0) {
      const password = Math.random().toString(36).slice(-12);
      const created = await createUser({ email, firstname, lastname, password });
      userid = Array.isArray(created) ? created[0]?.id : created?.[0]?.id;

      if (resend && process.env.FROM_EMAIL) {
        try {
          await resend.emails.send({
            from: process.env.FROM_EMAIL,
            to: email,
            subject: 'Welcome! Your Moodle Login',
            html: `<p>Username: ${email}<br>Password: ${password}<br>Login: ${process.env.MOODLE_URL}</p>`
          });
        } catch {}
      }
    } else {
      userid = users[0].id;
    }

    const catIds = [parseInt(process.env.CAT_FREEMIUM_ID)];
    const courseIds = await getCoursesByCats(catIds);
    if (courseIds.length) {
      await enrolUser(userid, courseIds);
    }

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}


