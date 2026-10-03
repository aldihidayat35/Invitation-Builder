// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMigratedDb } from "../helpers/db";
import { createTestRegistry } from "../helpers/widgets";
import { fullDocument, minimalDocument } from "../helpers/documents";
import { makeWorld } from "../helpers/world";
import { DocumentValidationError, createEmptyDocument, migrateDocument } from "@/lib/schema";
import { ForbiddenError } from "@/lib/auth/errors";
import { listAuditLogs } from "@/lib/db/repositories/audit";
import * as templateRepository from "@/lib/db/repositories/templates";
import { templateVersions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  NothingToPublishError,
  PublishBlockedError,
  RevisionConflictError,
  TemplateArchivedError,
  TemplateInputError,
  TemplateNotFoundError,
  archiveTemplate,
  createTemplate,
  duplicateTemplate,
  getTemplate,
  getTemplateVersion,
  listTemplates,
  publishTemplate,
  renameTemplate,
  saveDraft,
  validateDocumentPayload,
  validateTemplate,
} from "@/features/templates/service";

type Conn = Awaited<ReturnType<typeof createMigratedDb>>;
type World = Awaited<ReturnType<typeof makeWorld>>;
let conn: Conn;
let world: World;
const widgets = createTestRegistry();

function db() {
  return conn.db;
}

function withBrandColor(color: string) {
  const doc = fullDocument() as unknown as {
    design: { tokens: { colors: Record<string, string> } };
  };
  doc.design.tokens.colors.brand = color;
  return doc;
}

/** Full fixture whose first widget uses a type that no registry knows. */
function withUnknownWidget() {
  const doc = fullDocument() as unknown as {
    sections: { elements: { type: string; widgetType?: string }[] }[];
  };
  const widget = doc.sections.flatMap((s) => s.elements).find((e) => e.type === "widget");
  if (!widget) throw new Error("fixture has no widget");
  widget.widgetType = "mystery";
  return doc;
}

beforeAll(async () => {
  conn = await createMigratedDb();
  world = await makeWorld(conn.db);
});
afterAll(async () => {
  await conn.close();
});

describe("FR-TPL-001 library operations", () => {
  it("creates, lists, renames, duplicates and opens a template", async () => {
    const created = await createTemplate(db(), world.ownerA, {
      workspaceId: world.wsA.id,
      name: "  Elegant   Rose  ",
    });
    expect(created.name).toBe("Elegant Rose");
    expect(created.lifecycle).toBe("draft");
    expect(created.revision).toBe(1);

    const listed = await listTemplates(db(), world.ownerA, world.wsA.id);
    expect(listed.map((t) => t.id)).toContain(created.id);

    const renamed = await renameTemplate(db(), world.ownerA, created.id, "Elegant Rose v2");
    expect(renamed.name).toBe("Elegant Rose v2");
    expect(renamed.revision).toBe(1); // rename never conflicts with document edits

    const copy = await duplicateTemplate(db(), world.ownerA, created.id);
    expect(copy.id).not.toBe(created.id);
    expect(copy.name).toBe("Elegant Rose v2 (salinan)");
    expect(copy.lifecycle).toBe("draft");

    const opened = await getTemplate(db(), world.ownerA, created.id);
    expect(opened.document).toEqual(createEmptyDocument());
    expect(opened.versions).toEqual([]);
  });

  it("duplicates the current draft content, not version history", async () => {
    const source = await createTemplate(db(), world.ownerA, {
      workspaceId: world.wsA.id,
      name: "Source",
      document: withBrandColor("#112233"),
    });
    await publishTemplate(
      db(),
      world.ownerA,
      { templateId: source.id, expectedRevision: 1 },
      { widgets },
    );
    const copy = await duplicateTemplate(db(), world.ownerA, source.id);
    const opened = await getTemplate(db(), world.ownerA, copy.id);
    expect(opened.versions).toEqual([]);
    expect(opened.publishedVersionNo).toBeNull();
    expect(opened.document.design.tokens.colors.brand).toBe("#112233");
  });

  it("rejects invalid names", async () => {
    await expect(
      createTemplate(db(), world.ownerA, { workspaceId: world.wsA.id, name: "   " }),
    ).rejects.toBeInstanceOf(TemplateInputError);
    await expect(
      createTemplate(db(), world.ownerA, { workspaceId: world.wsA.id, name: "x".repeat(121) }),
    ).rejects.toBeInstanceOf(TemplateInputError);
  });

  it("archives: hidden from the default list, listed under archived, and read-only", async () => {
    const t = await createTemplate(db(), world.ownerA, {
      workspaceId: world.wsA.id,
      name: "To archive",
    });
    const archived = await archiveTemplate(db(), world.ownerA, t.id);
    expect(archived.lifecycle).toBe("archived");

    const active = await listTemplates(db(), world.ownerA, world.wsA.id);
    expect(active.map((x) => x.id)).not.toContain(t.id);
    const archivedList = await listTemplates(db(), world.ownerA, world.wsA.id, { archived: true });
    expect(archivedList.map((x) => x.id)).toContain(t.id);

    await expect(renameTemplate(db(), world.ownerA, t.id, "Nope")).rejects.toBeInstanceOf(
      TemplateArchivedError,
    );
    await expect(
      saveDraft(db(), world.ownerA, {
        templateId: t.id,
        expectedRevision: 1,
        document: createEmptyDocument(),
      }),
    ).rejects.toBeInstanceOf(TemplateArchivedError);
    await expect(
      publishTemplate(db(), world.ownerA, { templateId: t.id, expectedRevision: 1 }),
    ).rejects.toBeInstanceOf(TemplateArchivedError);
    await expect(archiveTemplate(db(), world.ownerA, t.id)).rejects.toBeInstanceOf(
      TemplateArchivedError,
    );
  });
});

describe("FR-TPL-002 validated drafts + optimistic concurrency", () => {
  it("rejects invalid documents with element paths and persists nothing", async () => {
    const t = await createTemplate(db(), world.ownerA, {
      workspaceId: world.wsA.id,
      name: "Validation",
    });
    const bad = fullDocument() as unknown as {
      sections: { elements: { frame: { w: number } }[] }[];
    };
    const element = bad.sections[0]?.elements[0];
    if (!element) throw new Error("fixture shape");
    element.frame.w = 0;

    const error = await saveDraft(db(), world.ownerA, {
      templateId: t.id,
      expectedRevision: 1,
      document: bad,
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DocumentValidationError);
    expect((error as DocumentValidationError).issues[0]?.path).toContain("frame");

    const after = await getTemplate(db(), world.ownerA, t.id);
    expect(after.revision).toBe(1);
    expect(after.document).toEqual(createEmptyDocument());
  });

  it("bumps revision on save and rejects stale revisions", async () => {
    const t = await createTemplate(db(), world.ownerA, {
      workspaceId: world.wsA.id,
      name: "Concurrency",
    });
    const saved = await saveDraft(db(), world.ownerA, {
      templateId: t.id,
      expectedRevision: 1,
      document: fullDocument(),
    });
    expect(saved.revision).toBe(2);
    await expect(
      saveDraft(db(), world.ownerA, {
        templateId: t.id,
        expectedRevision: 1,
        document: minimalDocument(),
      }),
    ).rejects.toBeInstanceOf(RevisionConflictError);
  });

  it("rejects scripts/unknown fields in the payload", async () => {
    const t = await createTemplate(db(), world.ownerA, {
      workspaceId: world.wsA.id,
      name: "Strict",
    });
    const doc = { ...minimalDocument(), script: "alert(1)" };
    await expect(
      saveDraft(db(), world.ownerA, { templateId: t.id, expectedRevision: 1, document: doc }),
    ).rejects.toBeInstanceOf(DocumentValidationError);
  });
});

describe("validate (schema + semantic)", () => {
  it("reports schema issues without throwing", () => {
    const report = validateDocumentPayload({ schemaVersion: 1, sections: "nope" });
    expect(report.valid).toBe(false);
    expect(report.schemaIssues.length).toBeGreaterThan(0);
  });

  it("accepts the full fixture against the default registry (P0 widgets registered)", () => {
    expect(validateDocumentPayload(fullDocument()).valid).toBe(true);
  });

  it("reports unknown widgets as semantic issues against the default registry", () => {
    const report = validateDocumentPayload(withUnknownWidget());
    expect(report.valid).toBe(false);
    expect(report.schemaIssues).toEqual([]);
    expect(report.semanticIssues.some((i) => i.code === "unknown_widget_type")).toBe(true);
  });

  it("accepts the full fixture when the widgets are registered", () => {
    expect(validateDocumentPayload(fullDocument(), { widgets }).valid).toBe(true);
  });

  it("validates a stored draft or a supplied unsaved document, without saving", async () => {
    const t = await createTemplate(db(), world.ownerA, {
      workspaceId: world.wsA.id,
      name: "Validate me",
    });
    expect((await validateTemplate(db(), world.ownerA, t.id)).valid).toBe(true);
    const report = await validateTemplate(db(), world.ownerA, t.id, {
      schemaVersion: 1,
      bogus: true,
    });
    expect(report.valid).toBe(false);
    expect((await getTemplate(db(), world.ownerA, t.id)).revision).toBe(1);
  });
});

describe("FR-TPL-003 / P-06: publish creates immutable, increasing versions", () => {
  it("create draft -> save -> publish -> edit draft again; published version unchanged", async () => {
    const t = await createTemplate(db(), world.ownerA, {
      workspaceId: world.wsA.id,
      name: "Lifecycle",
    });
    const saved = await saveDraft(db(), world.ownerA, {
      templateId: t.id,
      expectedRevision: 1,
      document: withBrandColor("#aa0000"),
    });
    expect(saved.revision).toBe(2);

    const v1 = await publishTemplate(
      db(),
      world.ownerA,
      { templateId: t.id, expectedRevision: 2, note: "first" },
      { widgets },
    );
    expect(v1.versionNo).toBe(1);
    expect(v1.note).toBe("first");

    const afterPublish = await getTemplate(db(), world.ownerA, t.id);
    expect(afterPublish.lifecycle).toBe("published");
    expect(afterPublish.publishedVersionNo).toBe(1);
    expect(afterPublish.hasUnpublishedChanges).toBe(false);

    // Edit the draft again.
    const edited = await saveDraft(db(), world.ownerA, {
      templateId: t.id,
      expectedRevision: 2,
      document: withBrandColor("#00aa00"),
    });
    expect(edited.revision).toBe(3);
    expect(edited.lifecycle).toBe("published-with-changes");

    // The published version did not change; the draft did.
    const v1Again = await getTemplateVersion(db(), world.ownerA, t.id, 1);
    expect(v1Again.document.design.tokens.colors.brand).toBe("#aa0000");
    expect(v1Again.document).toEqual(v1.document);
    const draft = await getTemplate(db(), world.ownerA, t.id);
    expect(draft.document.design.tokens.colors.brand).toBe("#00aa00");

    // Publish again -> versionNo increases, v1 still readable and unchanged.
    const v2 = await publishTemplate(
      db(),
      world.ownerA,
      { templateId: t.id, expectedRevision: 3 },
      { widgets },
    );
    expect(v2.versionNo).toBe(2);
    expect(v2.id).not.toBe(v1.id);
    expect(
      (await getTemplateVersion(db(), world.ownerA, t.id, 1)).document.design.tokens.colors.brand,
    ).toBe("#aa0000");
    expect((await getTemplate(db(), world.ownerA, t.id)).versions.map((v) => v.versionNo)).toEqual([
      2, 1,
    ]);
  });

  it("blocks publishing a stale revision, an unchanged draft, and documents with unknown widgets", async () => {
    const t = await createTemplate(db(), world.ownerA, {
      workspaceId: world.wsA.id,
      name: "Guards",
    });
    await saveDraft(db(), world.ownerA, {
      templateId: t.id,
      expectedRevision: 1,
      document: withUnknownWidget(),
    });

    await expect(
      publishTemplate(db(), world.ownerA, { templateId: t.id, expectedRevision: 1 }, { widgets }),
    ).rejects.toBeInstanceOf(RevisionConflictError);

    const blocked = await publishTemplate(db(), world.ownerA, {
      templateId: t.id,
      expectedRevision: 2,
    }).catch((e: unknown) => e);
    expect(blocked).toBeInstanceOf(PublishBlockedError);
    expect((blocked as PublishBlockedError).semanticIssues[0]?.code).toBe("unknown_widget_type");
    expect((await getTemplate(db(), world.ownerA, t.id)).versions).toEqual([]);

    await saveDraft(db(), world.ownerA, {
      templateId: t.id,
      expectedRevision: 2,
      document: fullDocument(),
    });
    await publishTemplate(
      db(),
      world.ownerA,
      { templateId: t.id, expectedRevision: 3 },
      { widgets },
    );
    await expect(
      publishTemplate(db(), world.ownerA, { templateId: t.id, expectedRevision: 3 }, { widgets }),
    ).rejects.toBeInstanceOf(NothingToPublishError);
  });

  it("serializes concurrent publishes: exactly one version is created", async () => {
    const t = await createTemplate(db(), world.ownerA, { workspaceId: world.wsA.id, name: "Race" });
    const results = await Promise.allSettled([
      publishTemplate(db(), world.ownerA, { templateId: t.id, expectedRevision: 1 }),
      publishTemplate(db(), world.ownerA, { templateId: t.id, expectedRevision: 1 }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await getTemplate(db(), world.ownerA, t.id)).versions).toHaveLength(1);
  });

  it("is immutable at the service, repository and database levels", async () => {
    const t = await createTemplate(db(), world.ownerA, {
      workspaceId: world.wsA.id,
      name: "Immutable",
    });
    const v = await publishTemplate(db(), world.ownerA, { templateId: t.id, expectedRevision: 1 });

    // Service/repository: no mutating API for versions exists.
    const serviceExports = await import("@/features/templates/service");
    const exported = [...Object.keys(serviceExports), ...Object.keys(templateRepository)];
    expect(
      exported.filter((name) => /(update|delete|remove|overwrite).*version/i.test(name)),
    ).toEqual([]);

    // Database: direct writes are rejected by the trigger.
    await expect(
      db()
        .update(templateVersions)
        .set({ document: createEmptyDocument() })
        .where(eq(templateVersions.id, v.id)),
    ).rejects.toThrow();
    await expect(
      db().delete(templateVersions).where(eq(templateVersions.id, v.id)),
    ).rejects.toThrow();

    // The stored version still migrates to what was published.
    const reread = await getTemplateVersion(db(), world.ownerA, t.id, v.versionNo);
    expect(migrateDocument(reread.document)).toEqual(v.document);
  });

  it("reports a missing version as not found", async () => {
    const t = await createTemplate(db(), world.ownerA, {
      workspaceId: world.wsA.id,
      name: "No versions",
    });
    await expect(getTemplateVersion(db(), world.ownerA, t.id, 7)).rejects.toBeInstanceOf(
      TemplateNotFoundError,
    );
  });
});

describe("cross-workspace authorization (acceptance gate)", () => {
  it("user of workspace B cannot read or change workspace A templates", async () => {
    const secret = await createTemplate(db(), world.ownerA, {
      workspaceId: world.wsA.id,
      name: "A secret",
    });
    await publishTemplate(db(), world.ownerA, { templateId: secret.id, expectedRevision: 1 });
    const attacker = world.ownerB;

    await expect(getTemplate(db(), attacker, secret.id)).rejects.toBeInstanceOf(
      TemplateNotFoundError,
    );
    await expect(getTemplateVersion(db(), attacker, secret.id, 1)).rejects.toBeInstanceOf(
      TemplateNotFoundError,
    );
    await expect(validateTemplate(db(), attacker, secret.id)).rejects.toBeInstanceOf(
      TemplateNotFoundError,
    );
    await expect(renameTemplate(db(), attacker, secret.id, "Pwned")).rejects.toBeInstanceOf(
      TemplateNotFoundError,
    );
    await expect(duplicateTemplate(db(), attacker, secret.id)).rejects.toBeInstanceOf(
      TemplateNotFoundError,
    );
    await expect(archiveTemplate(db(), attacker, secret.id)).rejects.toBeInstanceOf(
      TemplateNotFoundError,
    );
    await expect(
      saveDraft(db(), attacker, {
        templateId: secret.id,
        expectedRevision: 1,
        document: createEmptyDocument(),
      }),
    ).rejects.toBeInstanceOf(TemplateNotFoundError);
    await expect(
      publishTemplate(db(), attacker, { templateId: secret.id, expectedRevision: 1 }),
    ).rejects.toBeInstanceOf(TemplateNotFoundError);

    // Workspace-addressed operations on a foreign workspace are forbidden.
    await expect(listTemplates(db(), attacker, world.wsA.id)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    await expect(
      createTemplate(db(), attacker, { workspaceId: world.wsA.id, name: "Injected" }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    // Nothing leaked or changed.
    const intact = await getTemplate(db(), world.ownerA, secret.id);
    expect(intact.name).toBe("A secret");
    expect(intact.lifecycle).toBe("published");
    const bList = await listTemplates(db(), attacker, world.wsB.id);
    expect(bList.map((t) => t.name)).not.toContain("A secret");
  });

  it("non-existent and malformed ids are indistinguishable from foreign ones", async () => {
    await expect(
      getTemplate(db(), world.ownerB, "00000000-0000-4000-8000-000000000000"),
    ).rejects.toBeInstanceOf(TemplateNotFoundError);
    await expect(getTemplate(db(), world.ownerB, "not-a-uuid")).rejects.toBeInstanceOf(
      TemplateNotFoundError,
    );
  });

  it("enforces roles inside a workspace (operator read-only, designer cannot archive)", async () => {
    const t = await createTemplate(db(), world.ownerA, {
      workspaceId: world.wsA.id,
      name: "Roles",
    });

    // Operator: read yes, anything else forbidden (not "not found": they are members).
    expect((await getTemplate(db(), world.operatorA, t.id)).id).toBe(t.id);
    expect((await listTemplates(db(), world.operatorA, world.wsA.id)).length).toBeGreaterThan(0);
    await expect(renameTemplate(db(), world.operatorA, t.id, "x")).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    await expect(
      publishTemplate(db(), world.operatorA, { templateId: t.id, expectedRevision: 1 }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(archiveTemplate(db(), world.operatorA, t.id)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    await expect(
      createTemplate(db(), world.operatorA, { workspaceId: world.wsA.id, name: "x" }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    // Designer: edit + publish yes, archive no.
    await renameTemplate(db(), world.designerA, t.id, "Roles (designer)");
    await publishTemplate(db(), world.designerA, { templateId: t.id, expectedRevision: 1 });
    await expect(archiveTemplate(db(), world.designerA, t.id)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});

describe("FR-AUD-001 audit trail", () => {
  it("records actor/action/entity/timestamp for create, rename, duplicate, publish and archive", async () => {
    const t = await createTemplate(db(), world.ownerA, {
      workspaceId: world.wsA.id,
      name: "Audited",
    });
    await renameTemplate(db(), world.ownerA, t.id, "Audited 2");
    const copy = await duplicateTemplate(db(), world.ownerA, t.id);
    await publishTemplate(db(), world.ownerA, { templateId: t.id, expectedRevision: 1 });
    await archiveTemplate(db(), world.ownerA, t.id);

    const logs = await listAuditLogs(db(), world.wsA.id, {
      entityType: "template",
      entityId: t.id,
    });
    expect(logs.map((l) => l.action).sort()).toEqual(
      ["template.archive", "template.create", "template.publish", "template.rename"].sort(),
    );
    for (const log of logs) {
      expect(log.actorId).toBe(world.ownerA.userId);
      expect(log.entityType).toBe("template");
      expect(log.createdAt).toBeInstanceOf(Date);
    }
    const publish = logs.find((l) => l.action === "template.publish");
    expect(publish?.metadata).toMatchObject({ versionNo: 1 });

    const copyLogs = await listAuditLogs(db(), world.wsA.id, {
      entityType: "template",
      entityId: copy.id,
    });
    expect(copyLogs.map((l) => l.action)).toContain("template.duplicate");
  });

  it("does not write audit rows for denied or failed operations", async () => {
    const t = await createTemplate(db(), world.ownerA, {
      workspaceId: world.wsA.id,
      name: "Denied",
    });
    const before = (await listAuditLogs(db(), world.wsA.id, { entityId: t.id })).length;
    await archiveTemplate(db(), world.ownerB, t.id).catch(() => undefined);
    await publishTemplate(db(), world.operatorA, { templateId: t.id, expectedRevision: 1 }).catch(
      () => undefined,
    );
    await publishTemplate(db(), world.ownerA, { templateId: t.id, expectedRevision: 99 }).catch(
      () => undefined,
    );
    expect((await listAuditLogs(db(), world.wsA.id, { entityId: t.id })).length).toBe(before);
    expect((await getTemplate(db(), world.ownerA, t.id)).versions).toEqual([]);
  });

  it("keeps workspace B audit logs separate from workspace A", async () => {
    await createTemplate(db(), world.ownerB, { workspaceId: world.wsB.id, name: "B only" });
    const aLogs = await listAuditLogs(db(), world.wsA.id);
    expect(aLogs.every((l) => l.workspaceId === world.wsA.id)).toBe(true);
    expect(aLogs.some((l) => JSON.stringify(l.metadata).includes("B only"))).toBe(false);
  });
});
