import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import { hashPassword } from "../../lib/authentication";
import { sanitizeInput } from "../../util/sanitize";
import {
  sendSuccess,
  sendConflict,
  sendValidationError,
  sendError,
} from "../../lib/response";

interface CreateUserBody {
  email: string;
  username: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  roleId?: string;
  isActive?: boolean;
}

export const createUser: RouteHandlerMethod = async (request, reply) => {
  try {
    const {
      email,
      username,
      password,
      firstName,
      lastName,
      roleId,
      isActive = true,
    } = sanitizeInput<CreateUserBody>(request.body, {
      allowedFields: [
        "email",
        "username",
        "password",
        "firstName",
        "lastName",
        "roleId",
        "isActive",
      ],
      trimStrings: true,
      removeEmpty: true,
      parseBooleans: ["isActive"],
    });

    if (!email || !username) {
      return sendValidationError(reply, {
        fields: ["email, username"],
      });
    }

    const existing = await prisma.commonUser.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing)
      return sendConflict(reply, "Email or username already exists");

    let hashed: string;
    if (password) {
      hashed = await hashPassword(password);
    } else {
      const temp = require("crypto").randomBytes(8).toString("hex");
      hashed = await hashPassword(temp);
      // Temporary password generated; admin should use the change-password endpoint to set a new one.
    }

    const user = await prisma.commonUser.create({
      data: {
        email,
        username,
        password: hashed,
        firstName,
        lastName,
        roleId,
        isActive,
      },
      include: { roleDetails: true },
    });

    return sendSuccess(reply, { user }, "User created successfully", 201);
  } catch (error: any) {
    console.error("Create user error:", error, {
      body: request.body,
      user: request.user,
    });
    return sendError(reply, "Failed to create user", 500);
  }
};
