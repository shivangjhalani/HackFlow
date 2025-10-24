import express from 'express';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { query, callProcedure } from '../db.js';

const router = express.Router();

router.get('/queue', requireAuth, requireRoles('judge'), async (req, res) => {
  try {
    // Get unscored submissions assigned to this judge
    const queue = await query(
      `SELECT
         s.submission_id, s.project_id, s.round_id,
         s.submitted_at, s.sub_version, s.notes,
         t.team_id, t.team_name,
         p.title, p.abstract, p.repo_url, p.demo_url,
         r.name AS round_name, r.seq_no AS round_seq,
         ja.assignment_id
       FROM submission s
       JOIN project p ON p.project_id = s.project_id
       JOIN team t ON t.team_id = p.team_id
       JOIN judging_round r ON r.round_id = s.round_id
       JOIN judge_assignment ja ON ja.team_id = t.team_id AND ja.judge_user_id = ?
       WHERE NOT EXISTS (
         SELECT 1 FROM score sc
         WHERE sc.submission_id = s.submission_id AND sc.judge_user_id = ?
       )
       ORDER BY s.submitted_at DESC`,
      [req.sessionUser.userId, req.sessionUser.userId]
    );

    return res.json(queue);
  } catch (err) {
    console.error('Failed to load judge queue', err);
    return res.status(500).json({ error: 'Failed to load queue' });
  }
});

router.post('/score', requireAuth, requireRoles('judge'), async (req, res) => {
  const { submission_id, score, feedback } = req.body;
  if (!submission_id || typeof score !== 'number') {
    return res.status(400).json({ error: 'submission_id and numeric score are required' });
  }

  try {
    await callProcedure('CALL sp_record_score(?,?,?,?)', [req.sessionUser.userId, submission_id, score, feedback]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Failed to record score', err);
    return res.status(400).json({ error: err.message || 'Failed to record score' });
  }
});

router.get('/assignments', requireAuth, requireRoles('admin', 'organizer'), async (_req, res) => {
  try {
    const assignments = await query(
      `SELECT
         ja.assignment_id,
         ja.judge_user_id,
         u.username AS judge_username,
         ja.team_id,
         t.team_name,
         ja.assigned_at
       FROM judge_assignment ja
       JOIN user u ON u.user_id = ja.judge_user_id
       JOIN team t ON t.team_id = ja.team_id
       ORDER BY ja.assigned_at DESC`
    );

    return res.json(assignments);
  } catch (err) {
    console.error('Failed to list judge assignments', err);
    return res.status(500).json({ error: 'Failed to list judge assignments' });
  }
});

router.post('/assignments', requireAuth, requireRoles('admin', 'organizer'), async (req, res) => {
  const { team_id, judge_user_id } = req.body;
  if (!team_id || !judge_user_id) {
    return res.status(400).json({ error: 'team_id and judge_user_id are required' });
  }

  try {
    await callProcedure('CALL sp_assign_judge(?, ?, ?)', [team_id, judge_user_id, req.sessionUser.userId]);
    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Failed to assign judge', err);
    return res.status(400).json({ error: err.message || 'Failed to assign judge' });
  }
});

router.delete('/assignments', requireAuth, requireRoles('admin', 'organizer'), async (req, res) => {
  const { team_id, judge_user_id } = req.body;
  if (!team_id || !judge_user_id) {
    return res.status(400).json({ error: 'team_id and judge_user_id are required' });
  }

  try {
    await callProcedure('CALL sp_remove_judge_assignment(?, ?, ?)', [team_id, judge_user_id, req.sessionUser.userId]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Failed to remove judge assignment', err);
    return res.status(400).json({ error: err.message || 'Failed to remove judge assignment' });
  }
});

export default router;
