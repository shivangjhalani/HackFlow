import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { requireRole } from '../lib/auth';

const usersAndRolesRoutes: FastifyPluginAsync = async (server) => {
    // POST /users/:username/roles - (Admin-only) Assign 'organizer' or 'judge' role.
    server.post<{ Params: { username: string }, Body: { role: string } }>('/users/:username/roles', async (request, reply) => {
        requireRole(request, 'admin');
        const { username } = request.params;
        const { role } = request.body;

        if (!['organizer', 'judge'].includes(role)) {
            reply.code(400).send({ error: 'Invalid role specified' });
            return;
        }

        const user = await db.selectFrom('user').where('username', '=', username).select('user_id').executeTakeFirst();
        if (!user) {
            reply.code(404).send({ error: 'User not found' });
            return;
        }

        const roleRecord = await db.selectFrom('role').where('name', '=', role).select('role_id').executeTakeFirst();
        if (!roleRecord) {
            reply.code(400).send({ error: `Role '${role}' does not exist.` });
            return;
        }

        await db.insertInto('user_role').values({ user_id: user.user_id, role_id: roleRecord.role_id }).onDuplicateKeyUpdate({ user_id: user.user_id }).execute();

        return { success: true };
    });
};

export default usersAndRolesRoutes;
