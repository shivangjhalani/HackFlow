import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query, callProcedure } from '../db.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const submissions = await query(
      `SELECT s.*, r.name AS round_name, r.seq_no, p.team_id
       FROM submission s
       JOIN project p ON p.project_id = s.project_id
       JOIN team_member tm ON tm.team_id = p.team_id
       JOIN judging_round r ON r.round_id = s.round_id
       WHERE tm.user_id = ?
       ORDER BY r.seq_no DESC, s.submitted_at DESC`,
      [req.sessionUser.userId]
    );
    return res.json(submissions);
  } catch (err) {
    console.error('Failed to load submissions', err);
    return res.status(500).json({ error: 'Failed to load submissions' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { round_id: roundId, notes } = req.body;
  if (!roundId) {
    return res.status(400).json({ error: 'round_id is required' });
  }

  try {
    const [project] = await query(
      `SELECT p.project_id FROM project p
       JOIN team_member tm ON tm.team_id = p.team_id
       WHERE tm.user_id = ?`,
      [req.sessionUser.userId]
    );
    if (!project) {
      return res.status(400).json({ error: 'Project not found for user' });
    }

    const result = await callProcedure('CALL sp_create_submission(?,?,?)', [project.project_id, roundId, notes]);
    const [submission] = await query('SELECT * FROM submission WHERE submission_id = ?', [result[0].submission_id]);
    return res.status(201).json(submission);
  } catch (err) {
    console.error('Failed to create submission', err);
    return res.status(400).json({ error: err.message || 'Failed to create submission' });
  }
});

export default router;
