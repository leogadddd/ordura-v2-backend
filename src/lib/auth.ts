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

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: "Unauthorized" });
  }
}

export function authenticateWithCookie(server: FastifyInstance) {
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
