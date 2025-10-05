import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { requireRole } from '../lib/auth';
import { sql } from 'kysely';

const communicationsAndAwardsRoutes: FastifyPluginAsync = async (server) => {
    // GET /announcements
    server.get('/announcements', async (request, reply) => {
        const announcements = await db.selectFrom('announcement').selectAll().execute();
        return announcements;
    });

    // POST /announcements
    server.post<{ Body: { title: string, content: string } }>('/announcements', async (request, reply) => {
        requireRole(request, ['admin', 'organizer']);
        const { title, content } = request.body;
        const hackathon = await db.selectFrom('hackathon').select('hackathon_id').limit(1).executeTakeFirst();
        if (!hackathon) {
            reply.code(404).send({ error: 'Hackathon not found' });
            return;
        }

        const result = await db.insertInto('announcement').values({
            title,
            content,
            hackathon_id: hackathon.hackathon_id,
        }).executeTakeFirst();

        if (!result || !result.insertId) {
            reply.code(500).send({ error: 'Failed to create announcement' });
            return;
        }

        const newAnnouncement = await db.selectFrom('announcement')
            .where('announcement_id', '=', Number(result.insertId))
            .selectAll()
            .executeTakeFirst();

        return newAnnouncement;
    });

    // POST /prizes/:prizeId/award
    server.post<{ Params: { prizeId: string }, Body: { projectId: number } }>('/prizes/:prizeId/award', async (request, reply) => {
        requireRole(request, ['admin', 'organizer']);
        const { prizeId } = request.params;
        const { projectId } = request.body;

        await sql`CALL sp_award_prize(${prizeId}, ${projectId})`.execute(db);

        return { success: true };
    });
};

export default communicationsAndAwardsRoutes;
