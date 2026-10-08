import "server-only";
import JSZip from "jszip";
import type { Database } from "@/lib/db/types";
import type { StorageDriver } from "@/lib/storage";
import type { Actor } from "@/lib/auth/authorization";
import { requireCapability } from "@/lib/auth/authorization";
import {
  listTemplates as listTemplateRows,
  insertTemplateVersion,
  markTemplatePublished,
} from "@/lib/db/repositories/templates";
import { finalizeUpload, initUpload, receiveContent } from "@/features/assets/service";
import { createTemplate } from "./service";
import {
  templatePackageManifestSchema,
  remapAssetIdsInDocument,
  type TemplatePackageManifest,
} from "./package";

export class TemplateImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateImportError";
  }
}

/** Generates a non-conflicting unique name if a template with the same name exists. */
function resolveUniqueName(baseName: string, existingNames: Set<string>): string {
  if (!existingNames.has(baseName.toLowerCase())) return baseName;

  const candidate = `${baseName} (Impor)`;
  if (!existingNames.has(candidate.toLowerCase())) return candidate;

  for (let i = 2; ; i++) {
    const nextCandidate = `${baseName} (Impor ${i})`;
    if (!existingNames.has(nextCandidate.toLowerCase())) return nextCandidate;
  }
}

export async function importTemplatePackage(
  db: Database,
  storage: StorageDriver,
  actor: Actor,
  workspaceId: string,
  zipBytes: Uint8Array,
): Promise<{ templateId: string; name: string; importedAssetsCount: number; importedVersionsCount: number }> {
  await requireCapability(db, actor, workspaceId, "template:write");

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(zipBytes);
  } catch {
    throw new TemplateImportError("Berkas bukan file ZIP yang valid atau rusak.");
  }

  const manifestFile = zip.file("template.json");
  if (!manifestFile) {
    throw new TemplateImportError(
      "Berkas ZIP tidak memuat file manifest template.json yang valid.",
    );
  }

  let rawJson: string;
  try {
    rawJson = await manifestFile.async("string");
  } catch {
    throw new TemplateImportError("Gagal membaca berkas template.json.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawJson);
  } catch {
    throw new TemplateImportError("Format berkas template.json bukan JSON yang valid.");
  }

  const parseResult = templatePackageManifestSchema.safeParse(parsedJson);
  if (!parseResult.success) {
    const msg = parseResult.error.issues[0]?.message || "Format template tidak sesuai skema.";
    throw new TemplateImportError(`Struktur template tidak valid: ${msg}`);
  }

  const manifest: TemplatePackageManifest = parseResult.data;

  // 1. Upload & register all bundled assets in target workspace
  const assetIdMap: Record<string, string> = {};

  for (const assetEntry of manifest.assets) {
    const fileInZip = zip.file(assetEntry.path);
    if (!fileInZip) continue;

    try {
      const fileBytes = await fileInZip.async("uint8array");
      if (fileBytes.byteLength === 0) continue;

      const uploadInit = await initUpload(db, storage, actor, {
        workspaceId,
        filename: assetEntry.filename,
        mimeType: assetEntry.mimeType,
        bytes: fileBytes.byteLength,
      });

      await receiveContent(db, storage, actor, uploadInit.assetId, fileBytes);
      await finalizeUpload(db, storage, actor, uploadInit.assetId);
      assetIdMap[assetEntry.originalAssetId.toLowerCase()] = uploadInit.assetId;
    } catch {
      // Continue importing remaining assets if one fails
    }
  }

  // 2. Remap asset IDs in document
  const remappedDocument = remapAssetIdsInDocument(manifest.document, assetIdMap);

  // 3. Resolve duplicate template name in workspace
  const existingRows = await listTemplateRows(db, workspaceId);
  const existingNames = new Set(existingRows.map((r) => r.name.toLowerCase()));
  const uniqueName = resolveUniqueName(manifest.name, existingNames);

  // 4. Create the template in the target workspace
  const created = await createTemplate(db, actor, {
    workspaceId,
    name: uniqueName,
    document: remappedDocument,
  });

  // 5. Restore published versions if available in manifest
  let importedVersionsCount = 0;
  if (manifest.versions && manifest.versions.length > 0) {
    try {
      let highestVersionNo = 0;
      for (const v of manifest.versions) {
        await insertTemplateVersion(db, {
          templateId: created.id,
          versionNo: v.versionNo,
          schemaVersion: v.schemaVersion || 1,
          document: remappedDocument,
          note: v.note ?? null,
          createdBy: actor.userId,
        });
        importedVersionsCount++;
        if (v.versionNo > highestVersionNo) {
          highestVersionNo = v.versionNo;
        }
      }

      if (highestVersionNo > 0) {
        await markTemplatePublished(db, {
          templateId: created.id,
          versionNo: highestVersionNo,
          revision: 1,
        });
      }
    } catch {
      // If version restoration fails, template remains a valid draft
    }
  }

  return {
    templateId: created.id,
    name: uniqueName,
    importedAssetsCount: Object.keys(assetIdMap).length,
    importedVersionsCount,
  };
}
