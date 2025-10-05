import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { requireAuth } from '../lib/auth';

const projectsAndSubmissionsRoutes: FastifyPluginAsync = async (server) => {
    // GET /projects/my
    server.get('/projects/my', async (request, reply) => {
        const user = requireAuth(request);
        const project = await db.selectFrom('team_membership')
            .innerJoin('project', 'team_membership.team_id', 'project.team_id')
            .where('team_membership.user_id', '=', user.user_id)
            .selectAll('project')
            .executeTakeFirst();
        return project;
    });

    // POST /projects
    server.post<{ Body: { title: string, description: string, repo_url: string, demo_url: string } }>('/projects', async (request, reply) => {
        const user = requireAuth(request);
        const { title, description, repo_url, demo_url } = request.body;
        const team = await db.selectFrom('team_membership').where('user_id', '=', user.user_id).select('team_id').executeTakeFirstOrThrow();

        const result = await db.insertInto('project').values({
            team_id: team.team_id,
            title,
            description,
            repo_url,
            demo_url,
            submitted_at: new Date(),
        }).executeTakeFirst();

        if (!result || !result.insertId) {
            reply.code(500).send({ error: 'Failed to create project' });
            return;
        }

        const newProject = await db.selectFrom('project')
            .where('project_id', '=', Number(result.insertId))
            .selectAll()
            .executeTakeFirst();

        return newProject;
    });

    // PUT /projects/my
    server.put<{ Body: { title: string, description: string, repo_url: string, demo_url: string } }>('/projects/my', async (request, reply) => {
        const user = requireAuth(request);
        const { title, description, repo_url, demo_url } = request.body;
        const team = await db.selectFrom('team_membership').where('user_id', '=', user.user_id).select('team_id').executeTakeFirstOrThrow();

        await db.updateTable('project')
            .set({ title, description, repo_url, demo_url, submitted_at: new Date() })
            .where('team_id', '=', team.team_id)
            .executeTakeFirst();

        const updatedProject = await db.selectFrom('project')
            .where('team_id', '=', team.team_id)
            .selectAll()
            .executeTakeFirst();

        return updatedProject;
    });
};

export default projectsAndSubmissionsRoutes;
