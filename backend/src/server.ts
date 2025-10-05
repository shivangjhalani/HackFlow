import Fastify from 'fastify';
import * as dotenv from 'dotenv';
import authPlugin from './plugins/auth';
import hackathonRoutes from './routes/hackathon';
import tracksAndPrizesRoutes from './routes/tracksAndPrizes';
import usersAndRolesRoutes from './routes/usersAndRoles';
import teamsAndInvitesRoutes from './routes/teamsAndInvites';
import projectsAndSubmissionsRoutes from './routes/projectsAndSubmissions';
import judgingRoutes from './routes/judging';
import communicationsAndAwardsRoutes from './routes/communicationsAndAwards';
import { db } from './db';

dotenv.config();

async function bootstrapAdmin() {
    const adminUsername = process.env.INITIAL_ADMIN_USERNAME;
    if (!adminUsername) {
        console.log('INITIAL_ADMIN_USERNAME not set, skipping admin bootstrap.');
        return;
    }

    const adminRole = await db.selectFrom('role').where('name', '=', 'admin').select('role_id').executeTakeFirst();
    if (!adminRole) {
        console.error('Admin role not found in database. Please seed the roles.');
        return;
    }

    const adminExists = await db.selectFrom('user_role')
        .where('role_id', '=', adminRole.role_id)
        .select('user_id')
        .executeTakeFirst();

    if (adminExists) {
        console.log('Admin user already exists.');
        return;
    }

    let user = await db.selectFrom('user').where('username', '=', adminUsername).select('user_id').executeTakeFirst();

    if (!user) {
        const result = await db.insertInto('user').values({ username: adminUsername }).executeTakeFirst();
        if (result && result.insertId) {
            user = { user_id: Number(result.insertId) };
        }
    }

    if(user){
        await db.insertInto('user_role').values({ user_id: user.user_id, role_id: adminRole.role_id }).execute();
        console.log(`Admin user '${adminUsername}' created successfully.`);
    }
}


const server = Fastify({
  logger: true,
});

server.register(authPlugin);
server.register(hackathonRoutes);
server.register(tracksAndPrizesRoutes);
server.register(usersAndRolesRoutes);
server.register(teamsAndInvitesRoutes);
server.register(projectsAndSubmissionsRoutes);
server.register(judgingRoutes);
server.register(communicationsAndAwardsRoutes);

server.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

const start = async () => {
  try {
    await bootstrapAdmin();
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
    await server.listen({ port, host: '0.0.0.0' });
    server.log.info(`Server listening on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
