import type { Metadata } from "next";
import { requireOwner, getWorkspaceContext } from "@/lib/auth/server";
import { fetchAllStorageAssets, fetchStorageOverview } from "@/features/assets/api";
import { getStorageLimitMb } from "@/features/assets/config";
import { StorageManager } from "@/features/assets/components/StorageManager";

export const metadata: Metadata = {
  title: "Super Admin · Manajemen Storage & Media Platform",
  description: "Kelola kapasitas disk global dan seluruh berkas media platform.",
};

export default async function AdminStoragePage() {
  await requireOwner();
  const { active } = await getWorkspaceContext();

  const [overview, assetsData] = await Promise.all([
    fetchStorageOverview(undefined), // Global aggregate
    fetchAllStorageAssets({ limit: 300 }), // Global media items
  ]);

  return (
    <StorageManager
      initialOverview={overview}
      initialAssets={assetsData.items}
      workspaceId={active?.workspace.id}
      isSuperAdmin={true}
      limitMb={getStorageLimitMb()}
    />
  );
}
