import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { requireRole } from '../lib/auth';
import { HackathonTable, HackathonPhaseTable } from '../db';
import { Insertable } from 'kysely';

const hackathonRoutes: FastifyPluginAsync = async (server) => {
  // GET /hackathon - Fetch the singleton hackathon's details.
  server.get('/hackathon', async (request, reply) => {
    const hackathon = await db
      .selectFrom('hackathon')
      .selectAll()
      .limit(1)
      .executeTakeFirst();
    return hackathon;
  });

  // PUT /hackathon - (Admin-only) Update details or status.
  server.put<{ Body: { name: string; description: string; status: HackathonTable['status'] } }>(
    '/hackathon',
    async (request, reply) => {
      requireRole(request, 'admin');
      const { name, description, status } = request.body;
      await db
        .updateTable('hackathon')
        .set({ name, description, status })
        .executeTakeFirst();

      const hackathon = await db.selectFrom('hackathon')
        .selectAll()
        .limit(1)
        .executeTakeFirst();

      return hackathon;
    }
  );

  // GET /hackathon/phases - List timeline phases.
  server.get('/hackathon/phases', async (request, reply) => {
    const phases = await db.selectFrom('hackathon_phase').selectAll().execute();
    return phases;
  });

  // PUT /hackathon/phases - (Admin-only) Set the timeline phases.
  server.put<{ Body: { phases: { phase_type: HackathonPhaseTable['phase_type']; starts_at: string; ends_at: string }[] } }>(
    '/hackathon/phases',
    async (request, reply) => {
        requireRole(request, 'admin');
        const { phases } = request.body;
        const hackathon = await db.selectFrom('hackathon').select('hackathon_id').limit(1).executeTakeFirst();

        if (!hackathon) {
            reply.code(404).send({ error: 'Hackathon not found' });
            return;
        }

        await db.transaction().execute(async (trx) => {
            await trx.deleteFrom('hackathon_phase').where('hackathon_id', '=', hackathon.hackathon_id).execute();
            if(phases && phases.length > 0){
                const newPhases = phases.map(p => ({
                    hackathon_id: hackathon.hackathon_id,
                    phase_type: p.phase_type,
                    starts_at: new Date(p.starts_at),
                    ends_at: new Date(p.ends_at)
                }));
                await trx.insertInto('hackathon_phase').values(newPhases).execute();
            }
        });

        const updatedPhases = await db.selectFrom('hackathon_phase').selectAll().execute();
        return updatedPhases;
    }
);
};

export default hackathonRoutes;
