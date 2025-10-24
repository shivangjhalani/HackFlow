import express from 'express';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { query } from '../db.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    return res.json(await query('SELECT * FROM track ORDER BY name'));
  } catch (err) {
    console.error('Failed to load tracks', err);
    return res.status(500).json({ error: 'Failed to load tracks' });
  }
});

router.post('/', requireAuth, requireRoles('admin', 'organizer'), async (req, res) => {
  const { name, description, max_teams } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  try {
    await query('INSERT INTO track (name, description, max_teams) VALUES (?,?,?)', [name, description, max_teams]);
    const [track] = await query('SELECT * FROM track WHERE track_id = LAST_INSERT_ID()');
    return res.status(201).json(track);
  } catch (err) {
    console.error('Failed to create track', err);
    return res.status(500).json({ error: 'Failed to create track' });
  }
});

export default router;
