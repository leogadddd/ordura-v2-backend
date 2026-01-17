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

// requirePermission tests (middleware behavior)
import { requirePermission } from "./authorization";

function makeReply() {
  const r: any = { codeCalled: 0, sendCalled: false };
  r.code = function (c: number) {
    r.codeCalled = c;
    return r;
  };
  r.send = function () {
    r.sendCalled = true;
    return r;
  };
  return r;
}

(async () => {
  // Single permission granted
  let reply = makeReply();
  const mw1 = requirePermission("USERS:view");
  await mw1({ user: { permissions: ["USERS:view"] } } as any, reply as any);
  assert("requirePermission single allowed", !reply.sendCalled);

  // Array permissions: OR logic - allowed when one matches
  reply = makeReply();
  const mw2 = requirePermission(["ORDERS:create", "POS:ORDER"]);
  await mw2({ user: { permissions: ["ORDERS:create"] } } as any, reply as any);
  assert("requirePermission array OR allowed", !reply.sendCalled);

  // Array permissions: OR logic - forbidden when none match
  reply = makeReply();
  const mw3 = requirePermission(["ORDERS:create", "POS:ORDER"]);
  await mw3({ user: { permissions: ["USERS:view"] } } as any, reply as any);
  assert(
    "requirePermission array OR forbidden",
    reply.sendCalled && reply.codeCalled === 403
  );
})();
