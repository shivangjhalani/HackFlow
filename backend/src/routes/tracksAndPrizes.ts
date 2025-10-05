import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { requireRole } from '../lib/auth';

const tracksAndPrizesRoutes: FastifyPluginAsync = async (server) => {
  // GET /tracks
  server.get('/tracks', async (request, reply) => {
    const tracks = await db.selectFrom('track').selectAll().execute();
    return tracks;
  });

  // POST /tracks
  server.post<{ Body: { name: string } }>('/tracks', async (request, reply) => {
    requireRole(request, ['admin', 'organizer']);
    const { name } = request.body;
    const hackathon = await db.selectFrom('hackathon').select('hackathon_id').limit(1).executeTakeFirst();
    if (!hackathon) {
        reply.code(404).send({ error: 'Hackathon not found' });
        return;
    }
    const result = await db.insertInto('track').values({ name, hackathon_id: hackathon.hackathon_id }).executeTakeFirst();
    if (!result || !result.insertId) {
        reply.code(500).send({ error: 'Failed to create track' });
        return;
    }
    const newTrack = await db.selectFrom('track').where('track_id', '=', Number(result.insertId)).selectAll().executeTakeFirst();
    return newTrack;
  });

  // GET /prizes
  server.get('/prizes', async (request, reply) => {
    const prizes = await db.selectFrom('prize').selectAll().execute();
    return prizes;
  });

  // POST /prizes
  server.post<{ Body: { name: string, quantity: number } }>('/prizes', async (request, reply) => {
    requireRole(request, ['admin', 'organizer']);
    const { name, quantity } = request.body;
    const hackathon = await db.selectFrom('hackathon').select('hackathon_id').limit(1).executeTakeFirst();
    if (!hackathon) {
        reply.code(404).send({ error: 'Hackathon not found' });
        return;
    }
    const resultPrize = await db.insertInto('prize').values({ name, quantity, hackathon_id: hackathon.hackathon_id }).executeTakeFirst();
    if (!resultPrize || !resultPrize.insertId) {
        reply.code(500).send({ error: 'Failed to create prize' });
        return;
    }
    const newPrize = await db.selectFrom('prize').where('prize_id', '=', Number(resultPrize.insertId)).selectAll().executeTakeFirst();
    return newPrize;
  });
};

export default tracksAndPrizesRoutes;
