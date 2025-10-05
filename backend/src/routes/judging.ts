import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { requireRole } from '../lib/auth';

const judgingRoutes: FastifyPluginAsync = async (server) => {
    // GET /judging/assignments
    server.get('/judging/assignments', async (request, reply) => {
        const user = requireRole(request, 'judge');
        const assignments = await db.selectFrom('judge_assignment')
            .innerJoin('project', 'judge_assignment.project_id', 'project.project_id')
            .where('judge_assignment.judge_user_id', '=', user.user_id)
            .selectAll('project')
            .execute();
        return assignments;
    });

    // POST /scores
    server.post<{ Body: { projectId: number, criterionId: number, scoreValue: number } }>('/scores', async (request, reply) => {
        const user = requireRole(request, 'judge');
        const { projectId, criterionId, scoreValue } = request.body;

        await db.insertInto('score_entry').values({
            project_id: projectId,
            criterion_id: criterionId,
            judge_user_id: user.user_id,
            score_value: scoreValue,
        }).execute();

        return { success: true };
    });

    // POST /projects/:projectId/assign
    server.post<{ Params: { projectId: string }, Body: { judgeUsername: string } }>('/projects/:projectId/assign', async (request, reply) => {
        requireRole(request, ['admin', 'organizer']);
        const { projectId } = request.params;
        const { judgeUsername } = request.body;

        const judge = await db.selectFrom('user').where('username', '=', judgeUsername).select('user_id').executeTakeFirst();
        if (!judge) {
            reply.code(404).send({ error: 'Judge not found' });
            return;
        }

        await db.insertInto('judge_assignment').values({
            project_id: parseInt(projectId),
            judge_user_id: judge.user_id,
        }).execute();

        return { success: true };
    });
};

export default judgingRoutes;
