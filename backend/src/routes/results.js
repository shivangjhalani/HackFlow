import express from 'express';
import { query } from '../db.js';

const router = express.Router();

router.get('/overall', async (_req, res) => {
  try {
    return res.json(await query('SELECT * FROM vw_overall_scores ORDER BY total_avg_score DESC'));
  } catch (err) {
    console.error('Failed to load overall scores', err);
    return res.status(500).json({ error: 'Failed to load overall scores' });
  }
});

router.get('/round/:roundId', async (req, res) => {
  try {
    return res.json(await query('SELECT * FROM vw_round_scores WHERE round_id = ? ORDER BY avg_score DESC', [req.params.roundId]));
  } catch (err) {
    console.error('Failed to load round results', err);
    return res.status(500).json({ error: 'Failed to load round results' });
  }
});

router.get('/participation/teams', async (_req, res) => {
  try {
    return res.json(await query('SELECT * FROM vw_team_participation ORDER BY team_name'));
  } catch (err) {
    console.error('Failed to load team participation', err);
    return res.status(500).json({ error: 'Failed to load team participation' });
  }
});

router.get('/participation/judges', async (_req, res) => {
  try {
    return res.json(await query('SELECT * FROM vw_judge_participation ORDER BY username'));
  } catch (err) {
    console.error('Failed to load judge participation', err);
    return res.status(500).json({ error: 'Failed to load judge participation' });
  }
});

export default router;
