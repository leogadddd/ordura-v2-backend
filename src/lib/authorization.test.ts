import { hasPermission } from "./authorization";

function assert(name: string, condition: boolean) {
  console.log(`${condition ? "✅" : "❌"} ${name}`);
}

assert("global star matches", hasPermission(["*"], "ANY:action"));
assert("exact match", hasPermission(["USERS:view"], "USERS:view"));
assert("resource wildcard", hasPermission(["USERS:*"], "USERS:edit"));
assert("prefix wildcard", hasPermission(["ORDERS:*"], "ORDERS:edit:123"));
assert(
  "action wildcard across resources",
  hasPermission(["*:manage"], "PRODUCTS:manage")
);
assert(
  "action wildcard across resources fails for other action",
  !hasPermission(["*:manage"], "PRODUCTS:view")
);
assert(
  "missing permission fails",
  !hasPermission(["USERS:view"], "USERS:edit")
);
