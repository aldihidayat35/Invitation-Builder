import { logoutAction } from "@/app/(dashboard)/login/actions";
import { DashboardShell, type NavGroup } from "@/features/dashboard-layout";
import { fetchStorageOverview } from "@/features/assets/api";
import { getClientAgencyBranding } from "@/features/reseller/api";
import { getWorkspaceContext } from "@/lib/auth/server";
import { listLibrary } from "@/features/templates/api";
import { listAll } from "@/features/invitations/api";
import {
  IconAnalytics,
  IconComponentStudio,
  IconFlask,
  IconHome,
  IconInvitation,
  IconReceipt,
  IconStorage,
  IconTemplate,
  IconUsers,
} from "./nav-icons";

/** Authenticated enterprise dashboard shell layout. */
export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const { user, active } = await getWorkspaceContext();
  const agencyBranding = user.resellerId
    ? await getClientAgencyBranding(user.resellerId)
    : null;

  const [storageUsage, templateCount, activeInvitationCount] = await Promise.all([
    fetchStorageOverview(user.systemRole === "owner" ? undefined : active?.workspace.id).catch(() => null),
    active ? listLibrary(active.workspace.id).then((l) => l.length).catch(() => 2) : 2,
    active
      ? listAll(active.workspace.id)
          .then((invs) => invs.filter((i) => i.status === "published").length || invs.length)
          .catch(() => 2)
      : 2,
  ]);

  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");

  const navGroups: NavGroup[] = [
    {
      title: "Menu Utama",
      items: [
        {
          href: "/dashboard",
          label: "Dashboard",
          exact: true,
          icon: <IconHome />,
          hint: "Gambaran umum & performa workspace",
        },
        {
          href: "/dashboard/templates",
          label: "Katalog Template",
          icon: <IconTemplate />,
          badge: templateCount,
          hint: "Desain template siap pakai",
        },
        {
          href: "/dashboard/invitations",
          label: "Website Undangan",
          icon: <IconInvitation />,
          badge: `${activeInvitationCount} Aktif`,
          hint: "Undangan online klien, tamu & RSVP",
        },
        {
          href: "/dashboard/storage",
          label: "Media & Storage",
          icon: <IconStorage />,
          hint: "Galeri media & kapasitas penyimpanan",
        },
      ],
    },
  ];

  if (user.systemRole === "owner") {
    navGroups.push({
      title: "Super Admin",
      items: [
        {
          href: "/dashboard/admin",
          label: "Platform Analytics",
          exact: true,
          icon: <IconAnalytics />,
          hint: "Ringkasan metrik & grafik platform",
        },
        {
          href: "/dashboard/admin/orders",
          label: "Pesanan Masuk",
          icon: <IconReceipt />,
          badge: "Baru",
          hint: "Olah data & terbitkan undangan customer",
        },
        {
          href: "/dashboard/admin/resellers",
          label: "Mitra Seller",
          icon: <IconUsers />,
          hint: "Kelola mitra seller & website toko",
        },
        {
          href: "/dashboard/admin/storage",
          label: "Manajemen Storage",
          icon: <IconStorage />,
          hint: "Kapasitas & kelola seluruh berkas media",
        },
      ],
    });
  }

  if (user.systemRole === "reseller") {
    navGroups.push({
      title: "Portal Seller",
      items: [
        {
          href: "/dashboard/reseller",
          label: "Dashboard Toko",
          exact: true,
          icon: <IconHome />,
          hint: "Performa penjualan & analitik toko",
        },
        {
          href: "/dashboard/reseller/orders",
          label: "Pesanan Customer",
          icon: <IconReceipt />,
          hint: "Pantau status pesanan customer",
        },
        {
          href: "/dashboard/reseller/storefront",
          label: "Website Toko",
          icon: <IconTemplate />,
          hint: "Etalase publik & domain khusus",
        },
        {
          href: "/dashboard/reseller/clients",
          label: "Klien Agensi",
          icon: <IconUsers />,
          hint: "Daftar klien & akun klien",
        },
        {
          href: "/dashboard/reseller/branding",
          label: "Branding & Domain",
          icon: <IconUsers />,
          hint: "Kustomisasi logo & domain toko",
        },
      ],
    });
  }

  if (process.env.NODE_ENV !== "production") {
    navGroups.push({
      title: "Pengembang",
      items: [
        {
          href: "/dashboard/playground",
          label: "Engine Playground",
          icon: <IconFlask />,
          hint: "Uji pengisian data ke template",
        },
        {
          href: "/dashboard/playground",
          label: "Komponen & Font Studio",
          icon: <IconComponentStudio />,
          hint: "Eksplorasi komponen dan tipografi",
        },
      ],
    });
  }

  return (
    <DashboardShell
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        systemRole: user.systemRole,
        initials: initials || "U",
      }}
      activeWorkspace={
        active
          ? {
              id: active.workspace.id,
              name: active.workspace.name,
              role: active.role,
            }
          : null
      }
      agencyBranding={agencyBranding}
      storageUsage={storageUsage}
      navGroups={navGroups}
      logoutAction={logoutAction}
    >
      {children}
    </DashboardShell>
  );
}
