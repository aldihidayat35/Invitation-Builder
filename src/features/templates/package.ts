import { z } from "zod";
import { canonicalDocumentSchema, type CanonicalDocument } from "@/lib/schema";

export const templatePackageAssetEntrySchema = z.strictObject({
  originalAssetId: z.string().uuid(),
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  path: z.string().min(1),
  bytes: z.number().int().nonnegative().optional(),
});

export type TemplatePackageAssetEntry = z.infer<typeof templatePackageAssetEntrySchema>;

export const templatePackageVersionEntrySchema = z.strictObject({
  versionNo: z.number().int().positive(),
  schemaVersion: z.number().int().positive().default(1),
  note: z.string().nullable().optional(),
  createdAt: z.string().optional(),
});

export type TemplatePackageVersionEntry = z.infer<typeof templatePackageVersionEntrySchema>;

export const templatePackageManifestSchema = z.strictObject({
  format: z.literal("invitation-template-package"),
  exportVersion: z.number().int().positive().default(1),
  exportedAt: z.string(),
  name: z.string().min(1).max(120),
  description: z.string().optional(),
  category: z.string().optional(),
  style: z.string().optional(),
  tier: z.string().optional(),
  price: z.number().int().nonnegative().optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
  thumbnailUrl: z.string().nullable().optional(),
  previewMockupUrl: z.string().nullable().optional(),
  document: canonicalDocumentSchema,
  versions: z.array(templatePackageVersionEntrySchema).default([]),
  assets: z.array(templatePackageAssetEntrySchema).default([]),
});

export type TemplatePackageManifest = z.infer<typeof templatePackageManifestSchema>;

const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Extracts all unique asset IDs referenced throughout a CanonicalDocument. */
export function extractAssetIdsFromDocument(doc: CanonicalDocument): Set<string> {
  const assetIds = new Set<string>();

  function scan(val: unknown) {
    if (!val || typeof val !== "object") return;

    if (Array.isArray(val)) {
      for (const item of val) scan(item);
      return;
    }

    const obj = val as Record<string, unknown>;

    for (const [k, v] of Object.entries(obj)) {
      if (
        (k === "assetId" || k.endsWith("AssetId") || k === "asset_id") &&
        typeof v === "string" &&
        UUID_REGEX.test(v)
      ) {
        assetIds.add(v.toLowerCase());
      } else if (typeof v === "string") {
        const matches = v.matchAll(
          /\/api\/assets\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi,
        );
        for (const match of matches) {
          if (match[1]) {
            assetIds.add(match[1].toLowerCase());
          }
        }
      } else if (typeof v === "object" && v !== null) {
        scan(v);
      }
    }
  }

  scan(doc);
  return assetIds;
}

/** Recursively replaces all asset IDs and asset URLs in a document with newly mapped IDs. */
export function remapAssetIdsInDocument(
  doc: CanonicalDocument,
  idMap: Record<string, string> | Map<string, string>,
): CanonicalDocument {
  const mapObj: Record<string, string> =
    idMap instanceof Map ? Object.fromEntries(idMap.entries()) : idMap;
  const lowerMap: Record<string, string> = {};
  for (const [k, v] of Object.entries(mapObj)) {
    lowerMap[k.toLowerCase()] = v;
  }

  function replace(val: unknown): unknown {
    if (!val || typeof val !== "object") return val;

    if (Array.isArray(val)) {
      return val.map(replace);
    }

    const obj = val as Record<string, unknown>;
    const copy: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(obj)) {
      if (
        (k === "assetId" || k.endsWith("AssetId") || k === "asset_id") &&
        typeof v === "string"
      ) {
        const lower = v.toLowerCase();
        copy[k] = lowerMap[lower] ?? v;
      } else if (typeof v === "string") {
        let text = v;
        for (const [oldId, newId] of Object.entries(lowerMap)) {
          const escaped = oldId.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
          text = text.replace(new RegExp(escaped, "gi"), newId);
        }
        copy[k] = text;
      } else if (typeof v === "object" && v !== null) {
        copy[k] = replace(v);
      } else {
        copy[k] = v;
      }
    }

    return copy;
  }

  return replace(doc) as CanonicalDocument;
}
