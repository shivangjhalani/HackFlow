import express from 'express';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { query, callProcedure } from '../db.js';

const router = express.Router();

router.get('/', requireAuth, requireRoles('admin', 'organizer'), async (req, res) => {
  try {
    const teams = await query(
      `SELECT
         t.team_id,
         t.team_name,
         t.owner_user_id,
         t.created_at,
         u.username AS owner_username,
         COUNT(DISTINCT tm.user_id) AS member_count,
         p.project_id
       FROM team t
       JOIN user u ON u.user_id = t.owner_user_id
       LEFT JOIN team_member tm ON tm.team_id = t.team_id
       LEFT JOIN project p ON p.team_id = t.team_id
       GROUP BY t.team_id
       ORDER BY t.created_at DESC`
    );
    return res.json(teams);
  } catch (err) {
    console.error('Failed to load teams', err);
    return res.status(500).json({ error: 'Failed to load teams' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    // Get user's team
    const [team] = await query(
      `SELECT t.*
       FROM team_member tm
       JOIN team t ON t.team_id = tm.team_id
       WHERE tm.user_id = ?`,
      [req.sessionUser.userId]
    );

    if (!team) {
      return res.json(null);
    }

    // Get team members
    const members = await query(
      `SELECT u.user_id, u.username
       FROM team_member tm
       JOIN user u ON u.user_id = tm.user_id
       WHERE tm.team_id = ?
       ORDER BY tm.joined_at`,
      [team.team_id]
    );

    // Get project for this team
    const [project] = await query(
      `SELECT * FROM project WHERE team_id = ?`,
      [team.team_id]
    );

    // Get pending invites
    const invites = await query(
      `SELECT * FROM team_invite
       WHERE team_id = ? AND status = 'pending'`,
      [team.team_id]
    );

    return res.json({ team, members, invites, project: project || null });
  } catch (err) {
    console.error('Failed to load team', err);
    return res.status(500).json({ error: 'Failed to load team' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { team_name: teamName } = req.body;
  if (!teamName?.trim()) {
    return res.status(400).json({ error: 'team_name is required' });
  }

  try {
    const result = await callProcedure('CALL sp_create_team(?, ?)', [req.sessionUser.userId, teamName]);
    const [team] = await query('SELECT * FROM team WHERE team_id = ?', [result[0].team_id]);
    return res.status(201).json(team);
  } catch (err) {
    console.error('Failed to create team', err);
    return res.status(400).json({ error: err.message || 'Failed to create team' });
  }
});

router.post('/:teamId/invites', requireAuth, async (req, res) => {
  const { teamId } = req.params;
  const { username } = req.body;
  if (!username?.trim()) {
    return res.status(400).json({ error: 'username is required' });
  }

  try {
    const result = await callProcedure('CALL sp_invite_user(?, ?, ?)', [req.sessionUser.userId, teamId, username]);
    const [invite] = await query('SELECT * FROM team_invite WHERE token = ?', [result[0].token]);
    return res.status(201).json(invite);
  } catch (err) {
    console.error('Failed to invite user', err);
    return res.status(400).json({ error: err.message || 'Failed to invite user' });
  }
});

router.post('/invites/accept', requireAuth, async (req, res) => {
  const { token } = req.body;
  if (!token?.trim()) {
    return res.status(400).json({ error: 'token is required' });
  }

  try {
    await callProcedure('CALL sp_accept_invite(?, ?)', [token, req.sessionUser.userId]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Failed to accept invite', err);
    return res.status(400).json({ error: err.message || 'Failed to accept invite' });
  }
});

router.get('/invites/pending', requireAuth, async (req, res) => {
  try {
    const [user] = await query('SELECT username FROM user WHERE user_id = ?', [req.sessionUser.userId]);

    if (!user) {
      return res.json([]);
    }

    const invites = await query(
      `SELECT ti.*, t.team_name
       FROM team_invite ti
       JOIN team t ON t.team_id = ti.team_id
       WHERE ti.status = 'pending' AND ti.invitee_username = ?
       ORDER BY ti.created_at DESC`,
      [user.username]
    );

    return res.json(invites);
  } catch (err) {
    console.error('Failed to load pending invites', err);
    return res.status(500).json({ error: 'Failed to load pending invites' });
  }
});

export default router;
