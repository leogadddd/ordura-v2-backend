import { FastifyRequest, FastifyReply, FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { sendUnauthorized } from "./response";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Middleware that requires a valid JWT in the Authorization header
export async function requireAuthHeader(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: "Unauthorized" });
  }
}

// Middleware factory that requires a valid JWT in a cookie named `accessToken`
export function requireAuthCookie(server: FastifyInstance) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const token = request.cookies.accessToken;
      if (!token) {
        return sendUnauthorized(reply, "Unauthorized");
      }
      // Verify token manually since it's in cookie
      const decoded = server.jwt.verify(token);
      request.user = decoded;
    } catch (err) {
      return sendUnauthorized(reply, "Unauthorized");
    }
  };
}

export default {
  hashPassword,
  comparePassword,
  requireAuthHeader,
  requireAuthCookie,
};
