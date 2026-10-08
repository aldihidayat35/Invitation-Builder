import type { Metadata } from "next";
import { getWorkspaceContext } from "@/lib/auth/server";
import { fetchAllStorageAssets, fetchStorageOverview } from "@/features/assets/api";
import { getStorageLimitMb } from "@/features/assets/config";
import { StorageManager } from "@/features/assets/components/StorageManager";

export const metadata: Metadata = {
  title: "Manajemen Storage & Galeri Media",
  description: "Pantau kapasitas disk penyimpanan, kelola aset foto & video undangan.",
};

export default async function StoragePage() {
  const { user, active } = await getWorkspaceContext();
  const isSuperAdmin = user.systemRole === "owner";
  const wsId = active?.workspace.id;

  const [overview, assetsData] = await Promise.all([
    fetchStorageOverview(isSuperAdmin ? undefined : wsId),
    fetchAllStorageAssets({
      workspaceId: isSuperAdmin ? undefined : wsId,
      limit: 200,
    }),
  ]);

  return (
    <StorageManager
      initialOverview={overview}
      initialAssets={assetsData.items}
      workspaceId={wsId}
      isSuperAdmin={isSuperAdmin}
      limitMb={getStorageLimitMb()}
    />
  );
}
