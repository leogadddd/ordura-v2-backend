import { prisma } from "../../lib/prisma";
import {
  getPermissionsForRole,
  getUserPermissionMappings,
  getEffectivePermissionsForUser,
} from "../../lib/authorization";

/**
 * Return the single array of effective permissions for the given CommonUser id.
 * Rules: start with role permissions, apply per-user allows (adds) and denies (removes).
 * If the user does not exist, an empty array is returned.
 */
export async function getPermissionsByUserId(
  userId: string
): Promise<string[]> {
  const user = await prisma.commonUser.findUnique({
    where: { id: userId },
    select: { id: true, roleId: true },
  });
  if (!user) return [];

  const effective = await getEffectivePermissionsForUser(
    user.id,
    user.roleId ?? undefined
  );
  return effective;
}

export default getPermissionsByUserId;
