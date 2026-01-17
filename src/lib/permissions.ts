export const PERMISSIONS = {
  //   DASHBOARD: ["view"] as const,
  POS: ["VIEW", "ORDER"] as const,
  USERS: ["VIEW", "CREATE", "EDIT", "DELETE", "MANAGE"] as const,
  ROLES: ["VIEW", "CREATE", "EDIT", "DELETE", "MANAGE"] as const,
  PRODUCTS: ["VIEW", "CREATE", "EDIT", "DELETE", "MANAGE"] as const,
  ORDERS: ["VIEW", "CREATE", "EDIT", "MANAGE"] as const,
  REPORTS: ["VIEW"] as const,
  SETTINGS: ["VIEW", "MANAGE"] as const,
} as const;

// Resource wildcard entries to generate e.g. `PRODUCTS:*`
export const RESOURCE_WILDCARD_FEATURES: Feature[] = [
  "PRODUCTS",
  "USERS",
  "ROLES",
  "ORDERS",
];

// Action wildcard entries to generate e.g. `*:manage`
export const ACTION_WILDCARDS = [
  "MANAGE",
  "VIEW",
  "CREATE",
  "EDIT",
  "DELETE",
  "ORDER",
] as const;

export type PermissionsMap = typeof PERMISSIONS;
export type Feature = keyof PermissionsMap;

// Strict union of `Feature:Action` pairs derived from the PERMISSIONS map
export type Permission = {
  [F in keyof PermissionsMap]: `${F & string}:${PermissionsMap[F][number]}`;
}[keyof PermissionsMap];

export function getAllPermissions(): string[] {
  const base = (
    Object.keys(PERMISSIONS) as Array<keyof PermissionsMap>
  ).flatMap((feature) =>
    (PERMISSIONS[feature] as readonly string[]).map(
      (action) => `${feature}:${action}`
    )
  );

  // Add resource wildcards like `PRODUCTS:*`
  const resourceWildcards = RESOURCE_WILDCARD_FEATURES.map((f) => `${f}:*`);

  // Add action wildcards like `*:manage`
  const actionWildcards = (ACTION_WILDCARDS as readonly string[]).map(
    (a) => `*:${a}`
  );

  // Include a global wildcard '*' as well
  return [...base, ...resourceWildcards, ...actionWildcards, "*"];
}

export default PERMISSIONS;

// If run directly, print the list to stdout (one per line)
if (require.main === module) {
  const all = getAllPermissions();
  console.log(all.join("\n"));
}
