import express from 'express';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { query, callProcedure } from '../db.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const [prizes, awards] = await Promise.all([
      query('SELECT * FROM prize ORDER BY name'),
      query('SELECT * FROM prize_award')
    ]);
    return res.json({ prizes, awards });
  } catch (err) {
    console.error('Failed to load prizes', err);
    return res.status(500).json({ error: 'Failed to load prizes' });
  }
});

router.post('/', requireAuth, requireRoles('admin', 'organizer'), async (req, res) => {
  const { name, description, quantity, prize_value } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  try {
    await query('INSERT INTO prize (name, description, quantity, prize_value) VALUES (?,?,?,?)', [
      name,
      description,
      quantity ?? 1,
      prize_value
    ]);
    const [prize] = await query('SELECT * FROM prize WHERE prize_id = LAST_INSERT_ID()');
    return res.status(201).json(prize);
  } catch (err) {
    console.error('Failed to create prize', err);
    return res.status(500).json({ error: 'Failed to create prize' });
  }
});

router.post('/:prizeId/award', requireAuth, requireRoles('admin', 'organizer'), async (req, res) => {
  const { prizeId } = req.params;
  const { team_id } = req.body;
  if (!team_id) {
    return res.status(400).json({ error: 'team_id is required' });
  }

  try {
    await callProcedure('CALL sp_award_prize(?,?)', [prizeId, team_id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Failed to award prize', err);
    return res.status(400).json({ error: err.message || 'Failed to award prize' });
  }
});

export default router;
