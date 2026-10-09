// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isServerActionAllowed,
  SERVER_ACTION_POLICIES,
  type ActionActor,
} from "@/lib/auth/server-action-policy";

const actionFiles = [
  "src/app/(dashboard)/login/actions.ts",
  "src/app/(public)/seller/[slug]/actions.ts",
  "src/app/(public)/c/[code]/actions.ts",
  "src/app/(dashboard)/editor/[id]/actions.ts",
  "src/app/(dashboard)/dashboard/templates/actions.ts",
  "src/app/(dashboard)/dashboard/templates/categories/actions.ts",
  "src/app/(dashboard)/dashboard/invitations/actions.ts",
  "src/app/(dashboard)/dashboard/admin/orders/actions.ts",
  "src/app/(dashboard)/dashboard/admin/resellers/actions.ts",
  "src/app/(dashboard)/dashboard/admin/operations/actions.ts",
  "src/app/(dashboard)/dashboard/reseller/orders/actions.ts",
  "src/app/(dashboard)/dashboard/reseller/clients/actions.ts",
  "src/app/(dashboard)/dashboard/reseller/branding/actions.ts",
  "src/app/(dashboard)/dashboard/privacy/actions.ts",
  "src/features/admin/users/actions.ts",
  "src/features/assets/actions.ts",
  "src/features/workspaces/actions.ts",
] as const;

function exportedActions(): string[] {
  return actionFiles.flatMap((file) => {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    return [...source.matchAll(/export async function\s+([A-Za-z0-9_]+)/g)].map(
      (match) => match[1]!,
    );
  });
}

describe("server action authorization manifest", () => {
  it("covers every exported Server Action exactly once", () => {
    const discovered = exportedActions().sort();
    expect(Object.keys(SERVER_ACTION_POLICIES).sort()).toEqual(discovered);
    expect(new Set(discovered).size).toBe(discovered.length);
  });

  it("evaluates every action against every actor type", () => {
    const actors: ActionActor[] = ["anonymous", "owner", "reseller", "client"];
    for (const action of exportedActions()) {
      const allowed = SERVER_ACTION_POLICIES[action];
      expect(allowed?.length, `${action} must allow at least one actor`).toBeGreaterThan(0);
      for (const actor of actors) {
        expect(isServerActionAllowed(action, actor)).toBe(allowed!.includes(actor));
      }
    }
  });

  it("keeps sensitive actions owner-only", () => {
    for (const action of [
      "publishInvitationAction",
      "activateDomainTlsAction",
      "resolvePrivacyRequestAction",
      "deleteUserAction",
      "updatePaymentAction",
    ]) {
      expect(SERVER_ACTION_POLICIES[action]).toEqual(["owner"]);
    }
  });
});
