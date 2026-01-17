export { listPermissions } from "./list";
export { getPermission } from "./get";
export { createPermission } from "./create";
export { createManyPermissions } from "./createMany";
export { updatePermission } from "./update";
export { deleteManyPermissions } from "./deleteMany";
export { getPermissionsByUserId } from "./getPermissionsById";

export default {
  listPermissions: () => import("./list").then((m) => m.listPermissions()),
  getPermission: (id: string) =>
    import("./get").then((m) => m.getPermission(id)),
  createPermission: (input: any) =>
    import("./create").then((m) => m.createPermission(input)),
  createManyPermissions: (rows: any[]) =>
    import("./createMany").then((m) => m.createManyPermissions(rows)),
  updatePermission: (id: string, data: any) =>
    import("./update").then((m) => m.updatePermission(id, data)),
  deleteManyPermissions: (ids: string[]) =>
    import("./deleteMany").then((m) => m.deleteManyPermissions(ids)),
  getPermissionsByUserId: (id: string) =>
    import("./getPermissionsById").then((m) => m.getPermissionsByUserId(id)),
};
