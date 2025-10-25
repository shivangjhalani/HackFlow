import express from 'express';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { query } from '../db.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    return res.json(await query(
      `SELECT a.*, u.username AS author_username
       FROM announcement a
       LEFT JOIN user u ON u.user_id = a.author_user_id
       ORDER BY a.created_at DESC`
    ));
  } catch (err) {
    console.error('Failed to load announcements', err);
    return res.status(500).json({ error: 'Failed to load announcements' });
  }
});

router.post('/', requireAuth, requireRoles('admin', 'organizer'), async (req, res) => {
  const { title, content } = req.body;
  if (!title?.trim() || !content?.trim()) {
    return res.status(400).json({ error: 'title and content are required' });
  }

  try {
    await query('INSERT INTO announcement (title, content, author_user_id) VALUES (?,?,?)', [
      title,
      content,
      req.sessionUser.userId
    ]);
    const [announcement] = await query('SELECT * FROM announcement WHERE announcement_id = LAST_INSERT_ID()');
    return res.status(201).json(announcement);
  } catch (err) {
    console.error('Failed to create announcement', err);
    return res.status(500).json({ error: 'Failed to create announcement' });
  }
});

export default router;
