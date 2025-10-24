import express from 'express';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { query } from '../db.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    return res.json(await query('SELECT * FROM judging_round ORDER BY seq_no ASC'));
  } catch (err) {
    console.error('Failed to load judging rounds', err);
    return res.status(500).json({ error: 'Failed to load judging rounds' });
  }
});

router.post('/', requireAuth, requireRoles('admin', 'organizer'), async (req, res) => {
  const { name, seq_no, start_at, end_at } = req.body;
  if (!name?.trim() || seq_no == null) {
    return res.status(400).json({ error: 'name and seq_no are required' });
  }

  try {
    await query('INSERT INTO judging_round (name, seq_no, start_at, end_at) VALUES (?,?,?,?)', [name, seq_no, start_at, end_at]);
    const [round] = await query('SELECT * FROM judging_round WHERE round_id = LAST_INSERT_ID()');
    return res.status(201).json(round);
  } catch (err) {
    console.error('Failed to create judging round', err);
    return res.status(400).json({ error: err.message || 'Failed to create judging round' });
  }
});

export default router;
