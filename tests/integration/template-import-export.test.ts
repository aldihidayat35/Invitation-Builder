// @vitest-environment node
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import JSZip from "jszip";
import { createMigratedDb } from "../helpers/db";
import { pngBytes } from "../helpers/images";
import { makeWorld } from "../helpers/world";
import { createTestRegistry } from "../helpers/widgets";
import { fullDocument } from "../helpers/documents";
import { parseDocumentOrThrow, type CanonicalDocument } from "@/lib/schema";
import { createLocalStorage } from "@/lib/storage/local";
import type { StorageDriver } from "@/lib/storage/types";
import { findAssetById } from "@/lib/db/repositories/assets";
import {
  createTemplate,
  getTemplate,
  getTemplateVersion,
  listTemplates,
  publishTemplate,
  saveDraft,
} from "@/features/templates/service";
import {
  finalizeUpload,
  getDeliverableAsset,
  initUpload,
  receiveContent,
} from "@/features/assets/service";
import {
  extractAssetIdsFromDocument,
  remapAssetIdsInDocument,
} from "@/features/templates/package";
import { exportTemplatePackage } from "@/features/templates/export";
import {
  TemplateImportError,
  importTemplatePackage,
} from "@/features/templates/import";

let conn: Awaited<ReturnType<typeof createMigratedDb>>;
let world: Awaited<ReturnType<typeof makeWorld>>;
let dir: string;
let storage: StorageDriver;
const widgets = createTestRegistry();

beforeAll(async () => {
  conn = await createMigratedDb();
  world = await makeWorld(conn.db);
  dir = await mkdtemp(join(tmpdir(), "template-export-assets-"));
  storage = createLocalStorage(dir);
});

afterAll(async () => {
  await conn.close();
  await rm(dir, { recursive: true, force: true });
});

const db = () => conn.db;

function makeTestDoc(): CanonicalDocument {
  return parseDocumentOrThrow(fullDocument());
}

async function uploadAsset(
  actor: { userId: string },
  workspaceId: string,
  filename: string,
  data: Uint8Array,
) {
  const init = await initUpload(db(), storage, actor, {
    workspaceId,
    filename,
    mimeType: "image/png",
    bytes: data.byteLength,
  });
  await receiveContent(db(), storage, actor, init.assetId, data);
  await finalizeUpload(db(), storage, actor, init.assetId);
  return init.assetId;
}

describe("Template Package Utilities", () => {
  it("extracts asset IDs from document elements, backgrounds, and widgets", () => {
    const doc = makeTestDoc();
    const assetId1 = "11111111-1111-1111-1111-111111111111";
    const assetId2 = "22222222-2222-2222-2222-222222222222";
    const assetId3 = "33333333-3333-3333-3333-333333333333";

    // Set background image asset ID
    doc.design.background = {
      image: { assetId: assetId1 },
      fit: "cover",
      overlayOpacity: 0,
    };

    // Set image element source asset ID
    const imgEl = doc.sections[0]?.elements.find((e) => e.type === "image");
    if (imgEl && imgEl.type === "image") {
      imgEl.source = { assetId: assetId2 };
    }

    // Set widget props asset ID
    const wdgEl = doc.sections[0]?.elements.find((e) => e.type === "widget");
    if (wdgEl && wdgEl.type === "widget") {
      wdgEl.props = {
        coverAssetId: assetId3,
        audioUrl: `/api/assets/${assetId3}`,
      };
    }

    const ids = extractAssetIdsFromDocument(doc);
    expect(ids).toContain(assetId1);
    expect(ids).toContain(assetId2);
    expect(ids).toContain(assetId3);
  });

  it("remaps asset IDs and URLs correctly in document copy", () => {
    const doc = makeTestDoc();
    const oldId = "aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const newId = "bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

    doc.design.background = {
      image: { assetId: oldId },
      fit: "cover",
      overlayOpacity: 0,
    };

    const imgEl = doc.sections[0]?.elements.find((e) => e.type === "image");
    if (imgEl && imgEl.type === "image") {
      imgEl.source = { assetId: oldId };
    }

    const map = new Map<string, string>([[oldId, newId]]);
    const remapped = remapAssetIdsInDocument(doc, map);

    expect(remapped.design.background?.image).toEqual({ assetId: newId });
    const remappedImg = remapped.sections[0]?.elements.find((e) => e.type === "image");
    expect(remappedImg?.type === "image" ? remappedImg.source : null).toEqual({ assetId: newId });
  });
});

describe("Template Export & Import Integration (FR-TPL-PKG)", () => {
  it("exports a template with document and local media into a self-contained ZIP", async () => {
    // 1. Create a template in Workspace A
    const tpl = await createTemplate(db(), world.ownerA, {
      workspaceId: world.wsA.id,
      name: "Vintage Wedding Theme",
    });

    // 2. Upload asset into Workspace A
    const assetId = await uploadAsset(
      world.ownerA,
      world.wsA.id,
      "vintage-hero.png",
      pngBytes(400, 300),
    );

    // 3. Put asset in template draft and save draft
    const doc = makeTestDoc();
    doc.design.background = {
      image: { assetId },
      fit: "cover",
      overlayOpacity: 0,
    };
    const imgEl = doc.sections[0]?.elements.find((e) => e.type === "image");
    if (imgEl && imgEl.type === "image") {
      imgEl.source = { assetId };
    }

    await saveDraft(db(), world.ownerA, {
      templateId: tpl.id,
      expectedRevision: 1,
      document: doc,
    });

    // 4. Publish version 1
    await publishTemplate(
      db(),
      world.ownerA,
      { templateId: tpl.id, expectedRevision: 2 },
      { widgets },
    );

    // 5. Export package
    const pkg = await exportTemplatePackage(db(), storage, world.ownerA, tpl.id);
    expect(pkg.buffer).toBeInstanceOf(Uint8Array);
    expect(pkg.buffer.length).toBeGreaterThan(0);
    expect(pkg.filename).toBe("vintage-wedding-theme.zip");

    // 6. Inspect ZIP contents using JSZip
    const zip = await JSZip.loadAsync(pkg.buffer);
    const manifestFile = zip.file("template.json");
    expect(manifestFile).not.toBeNull();

    const manifestText = await manifestFile!.async("text");
    const manifest = JSON.parse(manifestText);

    expect(manifest.format).toBe("invitation-template-package");
    expect(manifest.exportVersion).toBe(1);
    expect(manifest.name).toBe("Vintage Wedding Theme");
    expect(manifest.versions.length).toBe(1);
    expect(manifest.versions[0].versionNo).toBe(1);
    expect(manifest.assets.length).toBe(1);
    expect(manifest.assets[0].originalAssetId).toBe(assetId);

    // Verify bundled asset file exists in zip
    const assetEntry = manifest.assets[0];
    const assetFile = zip.file(assetEntry.path);
    expect(assetFile).not.toBeNull();
    const assetContent = await assetFile!.async("uint8array");
    expect(assetContent.byteLength).toBeGreaterThan(0);
  });

  it("imports a ZIP package into another workspace, restoring assets, versions, and resolving duplicate names", async () => {
    // 1. Create and export a template from Workspace A
    const tpl = await createTemplate(db(), world.ownerA, {
      workspaceId: world.wsA.id,
      name: "Luxury Emerald",
    });

    const assetId = await uploadAsset(
      world.ownerA,
      world.wsA.id,
      "emerald-bg.png",
      pngBytes(500, 350),
    );

    const doc = makeTestDoc();
    doc.design.background = {
      image: { assetId },
      fit: "cover",
      overlayOpacity: 0,
    };

    await saveDraft(db(), world.ownerA, {
      templateId: tpl.id,
      expectedRevision: 1,
      document: doc,
    });
    await publishTemplate(
      db(),
      world.ownerA,
      { templateId: tpl.id, expectedRevision: 2 },
      { widgets },
    );

    const exportedPkg = await exportTemplatePackage(db(), storage, world.ownerA, tpl.id);

    // 2. Import into Workspace B (different workspace)
    const resultB = await importTemplatePackage(
      db(),
      storage,
      world.ownerB,
      world.wsB.id,
      exportedPkg.buffer,
    );

    expect(resultB.templateId).toBeDefined();
    expect(resultB.templateId).not.toBe(tpl.id);
    expect(resultB.name).toBe("Luxury Emerald");
    expect(resultB.importedAssetsCount).toBe(1);
    expect(resultB.importedVersionsCount).toBe(1);

    // 3. Verify imported template in Workspace B
    const importedTpl = await getTemplate(db(), world.ownerB, resultB.templateId);
    expect(importedTpl.workspaceId).toBe(world.wsB.id);
    expect(importedTpl.name).toBe("Luxury Emerald");
    expect(importedTpl.lifecycle).toBe("published");
    expect(importedTpl.publishedVersionNo).toBe(1);

    // Verify document asset ID was remapped to new asset ID in Workspace B
    const bgImage = importedTpl.document.design.background?.image;
    const remappedAssetId = bgImage && "assetId" in bgImage ? bgImage.assetId : undefined;
    expect(remappedAssetId).toBeDefined();
    expect(remappedAssetId).not.toBe(assetId);

    // Verify deliverable asset exists in workspace B
    const assetRow = await findAssetById(db(), remappedAssetId!);
    expect(assetRow).not.toBeNull();
    expect(assetRow?.workspaceId).toBe(world.wsB.id);

    const importedAsset = await getDeliverableAsset(db(), storage, remappedAssetId!);
    expect(importedAsset).not.toBeNull();
    expect(importedAsset!.bytes.byteLength).toBeGreaterThan(0);

    // Verify version 1 was restored in Workspace B
    const version1 = await getTemplateVersion(db(), world.ownerB, resultB.templateId, 1);
    expect(version1.versionNo).toBe(1);
    const v1BgImage = version1.document.design.background?.image;
    expect(v1BgImage && "assetId" in v1BgImage ? v1BgImage.assetId : undefined).toBe(remappedAssetId);

    // 4. Duplicate name handling: Import the exact same ZIP again into Workspace B
    const resultDuplicate = await importTemplatePackage(
      db(),
      storage,
      world.ownerB,
      world.wsB.id,
      exportedPkg.buffer,
    );

    expect(resultDuplicate.name).toBe("Luxury Emerald (Impor)");

    // Import a third time: should append (Impor 2)
    const resultTriplicate = await importTemplatePackage(
      db(),
      storage,
      world.ownerB,
      world.wsB.id,
      exportedPkg.buffer,
    );
    expect(resultTriplicate.name).toBe("Luxury Emerald (Impor 2)");
  });

  it("handles corrupted zip and malformed manifest gracefully", async () => {
    // 1. Invalid bytes
    const badBytes = new Uint8Array([1, 2, 3, 4, 5]);
    await expect(
      importTemplatePackage(db(), storage, world.ownerA, world.wsA.id, badBytes),
    ).rejects.toThrow(TemplateImportError);

    // 2. ZIP without template.json
    const zipEmpty = new JSZip();
    zipEmpty.file("hello.txt", "world");
    const zipEmptyBytes = await zipEmpty.generateAsync({ type: "uint8array" });
    await expect(
      importTemplatePackage(db(), storage, world.ownerA, world.wsA.id, zipEmptyBytes),
    ).rejects.toThrow("Berkas ZIP tidak memuat file manifest template.json yang valid.");

    // 3. ZIP with invalid template.json
    const zipBadJson = new JSZip();
    zipBadJson.file("template.json", JSON.stringify({ invalid: true }));
    const zipBadJsonBytes = await zipBadJson.generateAsync({ type: "uint8array" });
    await expect(
      importTemplatePackage(db(), storage, world.ownerA, world.wsA.id, zipBadJsonBytes),
    ).rejects.toThrow(TemplateImportError);
  });
});
