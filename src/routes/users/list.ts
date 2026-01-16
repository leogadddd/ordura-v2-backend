import { RouteHandlerMethod } from "fastify";
import { prisma } from "../../lib/prisma";
import { sendSuccess, sendError } from "../../lib/response";

interface ListUsersQuery {
  page?: string;
  limit?: string;
  roleId?: string;
  isActive?: string;
  search?: string;
}

export const getUsers: RouteHandlerMethod = async (request, reply) => {
  try {
    const {
      page = "1",
      limit = "50",
      roleId,
      isActive,
      search,
    } = request.query as ListUsersQuery;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (roleId) where.roleId = roleId;
    if (isActive === "true") where.isActive = true;
    if (isActive === "false") where.isActive = false;

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.commonUser.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          roleId: true,
          isActive: true,
          createdAt: true,
          roleDetails: { select: { id: true, name: true } },
        },
      }),
      prisma.commonUser.count({ where }),
    ]);

    return sendSuccess(
      reply,
      {
        items: users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      "Users retrieved successfully"
    );
  } catch (error: any) {
    console.error("List users error:", error, {
      query: request.query,
      user: request.user,
    });
    return sendError(reply, "Failed to fetch users", 500);
  }
};
