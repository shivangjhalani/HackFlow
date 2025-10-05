import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { requireAuth } from '../lib/auth';
import { sql } from 'kysely';

const teamsAndInvitesRoutes: FastifyPluginAsync = async (server) => {
    // GET /teams/me
    server.get('/teams/me', async (request, reply) => {
        const user = requireAuth(request);
        const team = await db.selectFrom('team_membership')
            .innerJoin('team', 'team_membership.team_id', 'team.team_id')
            .where('team_membership.user_id', '=', user.user_id)
            .selectAll('team')
            .executeTakeFirst();
        return team;
    });

    // POST /teams
    server.post<{ Body: { team_name: string } }>('/teams', async (request, reply) => {
        const user = requireAuth(request);
        const { team_name } = request.body;
        const hackathon = await db.selectFrom('hackathon').select('hackathon_id').limit(1).executeTakeFirst();

        if (!hackathon) {
            reply.code(404).send({ error: 'Hackathon not found' });
            return;
        }

        const newTeam = await db.transaction().execute(async (trx) => {
            const result = await trx.insertInto('team').values({ team_name, hackathon_id: hackathon.hackathon_id }).executeTakeFirstOrThrow();
            const teamId = Number(result.insertId);
            await trx.insertInto('team_membership').values({ user_id: user.user_id, team_id: teamId }).execute();
            return trx.selectFrom('team').where('team_id', '=', teamId).selectAll().executeTakeFirstOrThrow();
        });

        return newTeam;
    });

    // POST /teams/:teamId/invites
    server.post<{ Params: { teamId: string }, Body: { invitee_username: string } }>('/teams/:teamId/invites', async (request, reply) => {
        const user = requireAuth(request);
        const { teamId } = request.params;
        const { invitee_username } = request.body;

        // More logic needed here to ensure user is part of the team they are inviting to

        await db.insertInto('team_invite').values({ team_id: parseInt(teamId), invitee_username, status: 'pending' }).execute();
        return { success: true };
    });

    // POST /invites/:inviteId/accept
    server.post<{ Params: { inviteId: string }}>('/invites/:inviteId/accept', async (request, reply) => {
        const user = requireAuth(request);
        const { inviteId } = request.params;

        await sql`CALL sp_accept_team_invite(${inviteId}, ${user.user_id})`.execute(db);

        return { success: true };
    });
};

export default teamsAndInvitesRoutes;
