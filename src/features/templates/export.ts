import "server-only";
import JSZip from "jszip";
import type { Database } from "@/lib/db/types";
import type { StorageDriver } from "@/lib/storage";
import type { Actor } from "@/lib/auth/authorization";
import { getTemplate } from "./service";
import { getDeliverableAsset } from "@/features/assets/service";
import { findAssetById } from "@/lib/db/repositories/assets";
import {
  extractAssetIdsFromDocument,
  type TemplatePackageAssetEntry,
  type TemplatePackageManifest,
} from "./package";

function mimeToExt(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    case "audio/mpeg":
      return "mp3";
    case "audio/mp4":
      return "m4a";
    case "audio/ogg":
      return "ogg";
    case "audio/wav":
      return "wav";
    default:
      return "bin";
  }
}

export async function exportTemplatePackage(
  db: Database,
  storage: StorageDriver,
  actor: Actor,
  templateId: string,
): Promise<{ filename: string; buffer: Uint8Array }> {
  const template = await getTemplate(db, actor, templateId);

  const zip = new JSZip();
  const assetIds = extractAssetIdsFromDocument(template.document);
  const assetEntries: TemplatePackageAssetEntry[] = [];

  for (const assetId of assetIds) {
    try {
      const deliverable = await getDeliverableAsset(db, storage, assetId);
      if (!deliverable) continue;

      const row = await findAssetById(db, assetId);
      const ext = mimeToExt(deliverable.mimeType);
      const filename = row?.filename || `asset-${assetId}.${ext}`;
      const path = `assets/${assetId}.${ext}`;

      zip.file(path, deliverable.bytes);
      assetEntries.push({
        originalAssetId: assetId,
        filename,
        mimeType: deliverable.mimeType,
        path,
        bytes: deliverable.bytes.byteLength,
      });
    } catch {
      // Continue if a specific asset cannot be retrieved
    }
  }

  const manifest: TemplatePackageManifest = {
    format: "invitation-template-package",
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    name: template.name,
    document: template.document,
    versions: template.versions.map((v) => ({
      versionNo: v.versionNo,
      schemaVersion: v.schemaVersion,
      note: v.note,
      createdAt: v.createdAt.toISOString(),
    })),
    assets: assetEntries,
  };

  zip.file("template.json", JSON.stringify(manifest, null, 2));

  const zipBytes = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const slug = template.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const filename = `${slug || "template"}.zip`;

  return { filename, buffer: zipBytes };
}
