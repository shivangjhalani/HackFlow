import express from 'express';
import { setSessionCookie, clearSessionCookie, requireAuth, requireRoles } from '../middleware/auth.js';
import { query, callProcedure } from '../db.js';

const router = express.Router();

router.post('/claim', async (req, res) => {
  const { username } = req.body;
  if (!username?.trim()) {
    return res.status(400).json({ error: 'username is required' });
  }

  try {
    const result = await callProcedure('CALL sp_claim_username(?)', [username]);
    const userId = result[0].user_id;

    const [user] = await query('SELECT user_id, username FROM user WHERE user_id = ?', [userId]);
    const roleRows = await query(
      'SELECT r.name FROM user_role ur JOIN role r ON r.role_id = ur.role_id WHERE ur.user_id = ?',
      [userId]
    );

    const payload = {
      userId,
      username: user.username,
      roles: roleRows.map((r) => r.name)
    };
    setSessionCookie(res, payload);
    return res.json(payload);
  } catch (err) {
    console.error('claim username failed', err);
    return res.status(400).json({ error: err.message || 'Unable to claim username' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const roleRows = await query(
      'SELECT r.name FROM user_role ur JOIN role r ON r.role_id = ur.role_id WHERE ur.user_id = ?',
      [req.sessionUser.userId]
    );
    return res.json({ ...req.sessionUser, roles: roleRows.map((r) => r.name) });
  } catch (err) {
    console.error('fetch me failed', err);
    return res.status(500).json({ error: 'Failed to load user' });
  }
});

router.post('/logout', requireAuth, (req, res) => {
  clearSessionCookie(res);
  return res.json({ ok: true });
});

router.get('/users', requireAuth, requireRoles('admin'), async (req, res) => {
  try {
    const users = await query('SELECT user_id, username, created_at FROM user ORDER BY created_at ASC');
    const roleRows = await query('SELECT ur.user_id, r.name FROM user_role ur JOIN role r ON r.role_id = ur.role_id');

    const rolesByUser = {};
    for (const row of roleRows) {
      if (!rolesByUser[row.user_id]) rolesByUser[row.user_id] = [];
      rolesByUser[row.user_id].push(row.name);
    }

    return res.json(users.map((u) => ({ ...u, roles: rolesByUser[u.user_id] || [] })));
  } catch (err) {
    console.error('Failed to list users', err);
    return res.status(500).json({ error: 'Failed to list users' });
  }
});

router.put('/users/:userId/roles', requireAuth, requireRoles('admin'), async (req, res) => {
  const { userId } = req.params;
  const { roles } = req.body;

  if (!Array.isArray(roles)) {
    return res.status(400).json({ error: 'roles must be an array' });
  }

  const uniqueRoles = [...new Set(roles.map((r) => String(r).toLowerCase().trim()).filter(Boolean))];

  try {
    if (Number(userId) === req.sessionUser.userId && !uniqueRoles.includes('admin')) {
      return res.status(400).json({ error: 'Cannot remove your own admin role' });
    }

    const validRoles = await query('SELECT name, role_id FROM role');
    const roleMap = Object.fromEntries(validRoles.map((r) => [r.name, r.role_id]));

    for (const name of uniqueRoles) {
      if (!roleMap[name]) {
        return res.status(400).json({ error: `Unknown role: ${name}` });
      }
    }

    await query('DELETE FROM user_role WHERE user_id = ?', [userId]);

    for (const name of uniqueRoles) {
      await query('INSERT INTO user_role (user_id, role_id) VALUES (?, ?)', [userId, roleMap[name]]);
    }

    const roleRows = await query(
      'SELECT r.name FROM user_role ur JOIN role r ON r.role_id = ur.role_id WHERE ur.user_id = ?',
      [userId]
    );
    return res.json({ userId: Number(userId), roles: roleRows.map((r) => r.name) });
  } catch (err) {
    console.error('Failed to update user roles', err);
    return res.status(500).json({ error: 'Failed to update user roles' });
  }
});

export default router;
