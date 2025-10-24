import express from 'express';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { query, callProcedure } from '../db.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const [hackathon] = await query('SELECT * FROM hackathon WHERE hackathon_id = 1');
    return res.json(hackathon || null);
  } catch (err) {
    console.error('Failed to load hackathon', err);
    return res.status(500).json({ error: 'Failed to load hackathon' });
  }
});

router.put('/', requireAuth, requireRoles('admin'), async (req, res) => {
  const { name, description, start_at, end_at, reg_start_at, reg_end_at, min_team_size, max_team_size, published } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  try {
    await callProcedure('CALL sp_upsert_hackathon(?,?,?,?,?,?,?,?,?)', [
      name,
      description,
      start_at,
      end_at,
      reg_start_at,
      reg_end_at,
      min_team_size,
      max_team_size,
      published ? 1 : 0
    ]);

    const [hackathon] = await query('SELECT * FROM hackathon WHERE hackathon_id = 1');
    return res.json(hackathon);
  } catch (err) {
    console.error('Failed to update hackathon', err);
    return res.status(500).json({ error: 'Failed to update hackathon' });
  }
});

export default router;
