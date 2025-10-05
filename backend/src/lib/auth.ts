import { FastifyRequest } from 'fastify';

export function requireAuth(request: FastifyRequest) {
  if (!request.user) {
    throw new Error('Authentication required');
  }
  return request.user;
}

export function requireRole(request: FastifyRequest, role: string | string[]) {
  const user = requireAuth(request);
  const rolesToCheck = Array.isArray(role) ? role : [role];

  const hasRole = rolesToCheck.some((r) => user.roles.includes(r));

  if (!hasRole) {
    throw new Error(`Forbidden: Role '${rolesToCheck.join(' or ')}' required`);
  }
  return user;
}
