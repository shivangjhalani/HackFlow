import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { db } from '../db';

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      user_id: number;
      username: string;
      roles: string[];
    } | null;
  }
}

const authPlugin: FastifyPluginAsync = async (server) => {
  server.decorateRequest('user', null);

  server.addHook('preHandler', async (request, reply) => {
    const username = request.headers['x-user-username'] as string;

    if (!username) {
      return;
    }

    let user = await db
      .selectFrom('user')
      .select('user_id')
      .where('username', '=', username)
      .executeTakeFirst();

    if (!user) {
      // Auto-create user on first access
      const result = await db
        .insertInto('user')
        .values({ username })
        .executeTakeFirst();
      if (result && result.insertId) {
        user = { user_id: Number(result.insertId) };
      }
    }

    if (user) {
      const roles = await db
        .selectFrom('user_role')
        .innerJoin('role', 'user_role.role_id', 'role.role_id')
        .where('user_role.user_id', '=', user.user_id)
        .select('role.name')
        .execute();

      request.user = {
        user_id: user.user_id,
        username,
        roles: roles.map((r: { name: string }) => r.name),
      };
    }
  });
};

export default fp(authPlugin);
