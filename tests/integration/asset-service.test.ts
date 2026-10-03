/**
 * PRD refs: FR-AST-001..002, NFR-SEC-002, FR-EDT-008 (server never trusts client metadata).
 * Real DB + real (local) storage driver; only the temp dir is test-specific.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMigratedDb } from "../helpers/db";
import { avifBytes, jpegBytes, pngBytes } from "../helpers/images";
import { makeWorld } from "../helpers/world";
import { ForbiddenError } from "@/lib/auth/errors";
import { findAssetById } from "@/lib/db/repositories/assets";
import { listAuditLogs } from "@/lib/db/repositories/audit";
import {
  AssetNotFoundError,
  AssetRejectedError,
  finalizeUpload,
  getDeliverableAsset,
  initUpload,
  listAssets,
  receiveContent,
} from "@/features/assets/service";
import { createLocalStorage } from "@/lib/storage/local";
import type { StorageDriver } from "@/lib/storage/types";

let conn: Awaited<ReturnType<typeof createMigratedDb>>;
let world: Awaited<ReturnType<typeof makeWorld>>;
let dir: string;
let storage: StorageDriver;

beforeAll(async () => {
  conn = await createMigratedDb();
  world = await makeWorld(conn.db);
  dir = await mkdtemp(join(tmpdir(), "invitation-assets-"));
  storage = createLocalStorage(dir);
});
afterAll(async () => {
  await conn.close();
  await rm(dir, { recursive: true, force: true });
});

const db = () => conn.db;

async function upload(
  actor: { userId: string },
  data: Uint8Array,
  declared: { filename?: string; mimeType?: string; bytes?: number } = {},
) {
  const init = await initUpload(db(), storage, actor, {
    workspaceId: world.wsA.id,
    filename: declared.filename ?? "photo.png",
    mimeType: declared.mimeType ?? "image/png",
    bytes: declared.bytes ?? data.byteLength,
  });
  await receiveContent(db(), storage, actor, init.assetId, data);
  return init.assetId;
}

describe("upload happy path (FR-AST-001)", () => {
  it("init -> content -> finalize stores server-derived metadata and audits", async () => {
    const id = await upload(world.designerA, pngBytes(800, 600), { filename: "cover.png" });
    const summary = await finalizeUpload(db(), storage, world.designerA, id);
    expect(summary).toMatchObject({ id, mimeType: "image/png", width: 800, height: 600 });

    const listed = await listAssets(db(), world.ownerA, world.wsA.id);
    expect(listed.map((a) => a.id)).toContain(id);
    expect(await listAssets(db(), world.ownerA, world.wsA.id, { search: "cov" })).toHaveLength(1);
    expect(await listAssets(db(), world.ownerA, world.wsA.id, { search: "zzz" })).toHaveLength(0);

    const delivered = await getDeliverableAsset(db(), storage, id);
    expect(delivered?.mimeType).toBe("image/png");
    expect(delivered?.bytes.byteLength).toBe(pngBytes(800, 600).byteLength);

    const logs = await listAuditLogs(db(), world.wsA.id);
    expect(logs.some((l) => l.action === "asset.upload" && l.entityId === id)).toBe(true);
  });

  it("accepts jpeg and avif too", async () => {
    const jpg = await upload(world.ownerA, jpegBytes(100, 50), {
      filename: "a.jpg",
      mimeType: "image/jpeg",
    });
    expect((await finalizeUpload(db(), storage, world.ownerA, jpg)).width).toBe(100);
    const avif = await upload(world.ownerA, avifBytes(64, 32), {
      filename: "a.avif",
      mimeType: "image/avif",
    });
    expect((await finalizeUpload(db(), storage, world.ownerA, avif)).height).toBe(32);
  });
});

describe("unsafe files are rejected (NFR-SEC-002)", () => {
  const init = (over: Record<string, unknown>) =>
    initUpload(db(), storage, world.ownerA, {
      workspaceId: world.wsA.id,
      filename: "x.png",
      mimeType: "image/png",
      bytes: 100,
      ...over,
    });

  it("rejects disallowed MIME types, svg, scripts and audio at init", async () => {
    for (const mimeType of ["image/svg+xml", "text/html", "application/javascript", "audio/mpeg"]) {
      await expect(init({ mimeType, filename: "x.bin" })).rejects.toBeInstanceOf(
        AssetRejectedError,
      );
    }
  });

  it("rejects an extension that contradicts the MIME type", async () => {
    await expect(init({ filename: "x.exe" })).rejects.toBeInstanceOf(AssetRejectedError);
    await expect(init({ filename: "x.jpg" })).rejects.toBeInstanceOf(AssetRejectedError);
  });

  it("rejects path-like filenames and oversized declarations", async () => {
    await expect(init({ filename: "../x.png" })).rejects.toBeInstanceOf(AssetRejectedError);
    await expect(init({ bytes: 10 * 1024 * 1024 + 1 })).rejects.toBeInstanceOf(AssetRejectedError);
    await expect(init({ bytes: 0 })).rejects.toBeInstanceOf(AssetRejectedError);
  });

  it("fails an upload whose real size differs from the declared one", async () => {
    const data = pngBytes(10, 10);
    const bad = await initUpload(db(), storage, world.ownerA, {
      workspaceId: world.wsA.id,
      filename: "x.png",
      mimeType: "image/png",
      bytes: data.byteLength + 5,
    });
    await expect(
      receiveContent(db(), storage, world.ownerA, bad.assetId, data),
    ).rejects.toBeInstanceOf(AssetRejectedError);
    expect((await findAssetById(db(), bad.assetId))?.status).toBe("failed");
    expect(await getDeliverableAsset(db(), storage, bad.assetId)).toBeNull();
  });

  it("fails content that is not an image although the client claims PNG", async () => {
    const html = new TextEncoder().encode("<script>alert(1)</script>".padEnd(64, " "));
    const id = await upload(world.ownerA, html);
    await expect(finalizeUpload(db(), storage, world.ownerA, id)).rejects.toBeInstanceOf(
      AssetRejectedError,
    );
    expect((await findAssetById(db(), id))?.status).toBe("failed");
    expect(await getDeliverableAsset(db(), storage, id)).toBeNull();
  });

  it("fails real content whose type differs from the declared MIME", async () => {
    const id = await upload(world.ownerA, jpegBytes(10, 10), { filename: "x.png" });
    await expect(finalizeUpload(db(), storage, world.ownerA, id)).rejects.toBeInstanceOf(
      AssetRejectedError,
    );
  });

  it("fails images that exceed the dimension cap", async () => {
    const id = await upload(world.ownerA, pngBytes(8001, 100));
    await expect(finalizeUpload(db(), storage, world.ownerA, id)).rejects.toBeInstanceOf(
      AssetRejectedError,
    );
  });

  it("does not finalize an asset whose bytes never arrived", async () => {
    const init = await initUpload(db(), storage, world.ownerA, {
      workspaceId: world.wsA.id,
      filename: "x.png",
      mimeType: "image/png",
      bytes: 100,
    });
    await expect(finalizeUpload(db(), storage, world.ownerA, init.assetId)).rejects.toBeInstanceOf(
      AssetRejectedError,
    );
  });

  it("never serves an asset that is not ready", async () => {
    const init = await initUpload(db(), storage, world.ownerA, {
      workspaceId: world.wsA.id,
      filename: "x.png",
      mimeType: "image/png",
      bytes: 64,
    });
    expect(await getDeliverableAsset(db(), storage, init.assetId)).toBeNull();
    expect(await getDeliverableAsset(db(), storage, "not-a-uuid")).toBeNull();
  });
});

describe("authorization", () => {
  it("operators cannot upload; outsiders cannot list or touch another workspace's assets", async () => {
    await expect(
      initUpload(db(), storage, world.operatorA, {
        workspaceId: world.wsA.id,
        filename: "x.png",
        mimeType: "image/png",
        bytes: 100,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(listAssets(db(), world.operatorA, world.wsA.id)).resolves.toBeDefined();
    await expect(listAssets(db(), world.ownerB, world.wsA.id)).rejects.toBeInstanceOf(
      ForbiddenError,
    );

    const id = await upload(world.ownerA, pngBytes(20, 20));
    await expect(finalizeUpload(db(), storage, world.ownerB, id)).rejects.toBeInstanceOf(
      AssetNotFoundError,
    );
    expect(await listAssets(db(), world.ownerB, world.wsB.id)).toEqual([]);
  });
});
