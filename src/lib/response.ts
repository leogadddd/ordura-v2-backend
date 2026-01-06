import { FastifyReply } from "fastify";

export type ResponseStatus = "success" | "error" | "validation_error";

export interface ApiResponse<T = any> {
  status: ResponseStatus;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
  timestamp: string;
}

/**
 * Send a success response
 */
export function sendSuccess<T>(
  reply: FastifyReply,
  data: T,
  message: string = "Request successful",
  statusCode: number = 200
): FastifyReply {
  return reply.code(statusCode).send({
    status: "success",
    message,
    data,
    timestamp: new Date().toISOString(),
  } as ApiResponse<T>);
}

/**
 * Send an error response
 */
export function sendError(
  reply: FastifyReply,
  message: string,
  statusCode: number = 400,
  errors?: Record<string, string[]>
): FastifyReply {
  return reply.code(statusCode).send({
    status: errors ? "validation_error" : "error",
    message,
    ...(errors && { errors }),
    timestamp: new Date().toISOString(),
  } as ApiResponse);
}

/**
 * Send a validation error response
 */
export function sendValidationError(
  reply: FastifyReply,
  errors: Record<string, string[]>,
  message: string = "Validation failed"
): FastifyReply {
  return reply.code(422).send({
    status: "validation_error",
    message,
    errors,
    timestamp: new Date().toISOString(),
  } as ApiResponse);
}

/**
 * Send unauthorized error
 */
export function sendUnauthorized(
  reply: FastifyReply,
  message: string = "Unauthorized"
): FastifyReply {
  return reply.code(401).send({
    status: "error",
    message,
    timestamp: new Date().toISOString(),
  } as ApiResponse);
}

/**
 * Send forbidden error
 */
export function sendForbidden(
  reply: FastifyReply,
  message: string = "Forbidden"
): FastifyReply {
  return reply.code(403).send({
    status: "error",
    message,
    timestamp: new Date().toISOString(),
  } as ApiResponse);
}

/**
 * Send not found error
 */
export function sendNotFound(
  reply: FastifyReply,
  message: string = "Resource not found"
): FastifyReply {
  return reply.code(404).send({
    status: "error",
    message,
    timestamp: new Date().toISOString(),
  } as ApiResponse);
}

/**
 * Send conflict error
 */
export function sendConflict(
  reply: FastifyReply,
  message: string = "Resource already exists"
): FastifyReply {
  return reply.code(409).send({
    status: "error",
    message,
    timestamp: new Date().toISOString(),
  } as ApiResponse);
}
