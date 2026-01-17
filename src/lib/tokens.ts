import { FastifyInstance } from "fastify";
import { getEffectivePermissionsForUser } from "./authorization";

export async function generateAuthTokens(server: FastifyInstance, user: any) {
  const permissions = await getEffectivePermissionsForUser(
    user.id,
    user.roleId
  );

  const accessToken = server.jwt.sign(
    {
      sub: user.id,
      email: user.email,
      username: user.username,
      roleId: user.roleId,
      permissions,
    },
    { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
  );

  const refreshToken = server.jwt.sign(
    {
      sub: user.id,
      email: user.email,
      username: user.username,
      roleId: user.roleId,
    },
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
  );

  return { accessToken, refreshToken, permissions };
}

export default { generateAuthTokens };
