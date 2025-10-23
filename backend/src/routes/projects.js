import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query, callProcedure } from '../db.js';

const router = express.Router();

router.get('/me', requireAuth, async (req, res) => {
  try {
    const [project] = await query(
      `SELECT p.* FROM project p
       JOIN team_member tm ON tm.team_id = p.team_id
       WHERE tm.user_id = ?`,
      [req.sessionUser.userId]
    );
    return res.json(project || null);
  } catch (err) {
    console.error('Failed to load project', err);
    return res.status(500).json({ error: 'Failed to load project' });
  }
});

router.put('/me', requireAuth, async (req, res) => {
  const { title, abstract, repo_url: repoUrl, demo_url: demoUrl, track_id: trackId } = req.body;
  if (!title?.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }

  try {
    const [team] = await query('SELECT team_id FROM team_member WHERE user_id = ?', [req.sessionUser.userId]);
    if (!team) {
      return res.status(400).json({ error: 'User is not in a team' });
    }

    await callProcedure('CALL sp_submit_project(?,?,?,?,?,?)', [team.team_id, title, abstract, repoUrl, demoUrl, trackId]);
    const [project] = await query('SELECT * FROM project WHERE team_id = ?', [team.team_id]);
    return res.json(project);
  } catch (err) {
    console.error('Failed to submit project', err);
    return res.status(400).json({ error: err.message || 'Failed to submit project' });
  }
});

export default router;
