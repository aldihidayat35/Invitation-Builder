import { logoutAction } from "@/app/(dashboard)/login/actions";
import { DashboardShell, type NavGroup } from "@/features/dashboard-layout";
import { fetchStorageOverview } from "@/features/assets/api";
import { getClientAgencyBranding } from "@/features/reseller/api";
import { getWorkspaceContext } from "@/lib/auth/server";
import { listLibrary } from "@/features/templates/api";
import { listAll } from "@/features/invitations/api";
import {
  IconAnalytics,
  IconBook,
  IconComponentStudio,
  IconFlask,
  IconHome,
  IconInvitation,
  IconReceipt,
  IconStorage,
  IconStore,
  IconTemplate,
  IconUsers,
  IconUserShield,
  IconSettings,
  IconStar,
} from "./nav-icons";
import { getPublicSiteSettings } from "@/features/site/api";
import { switchWorkspaceAction } from "@/features/workspaces/actions";

/** Authenticated enterprise dashboard shell layout. */
export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const { user, active, memberships } = await getWorkspaceContext();
  const agencyBranding = user.resellerId ? await getClientAgencyBranding(user.resellerId) : null;

  const [storageUsage, templateCount, activeInvitationCount, appSettings] = await Promise.all([
    user.systemRole !== "reseller" && active
      ? fetchStorageOverview(user.systemRole === "owner" ? undefined : active.workspace.id).catch(
          () => null,
        )
      : null,
    user.systemRole === "owner" && active
      ? listLibrary(active.workspace.id)
          .then((items) => items.length)
          .catch(() => null)
      : null,
    user.systemRole !== "reseller" && active
      ? listAll(active.workspace.id)
          .then((items) => items.filter((item) => item.status === "published").length)
          .catch(() => null)
      : null,
    getPublicSiteSettings().catch(() => null),
  ]);

  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");

  const navGroups: NavGroup[] = [];

  if (user.systemRole === "owner") {
    navGroups.push({
      title: "Studio Produksi",
      items: [
        {
          href: "/dashboard",
          label: "Dashboard Produksi",
          exact: true,
          icon: <IconHome />,
          hint: "Ringkasan produksi workspace aktif",
        },
        {
          href: "/dashboard/templates",
          label: "Katalog Template",
          icon: <IconTemplate />,
          ...(templateCount !== null ? { badge: templateCount } : {}),
          hint: "Desain template siap pakai",
        },
        {
          href: "/dashboard/invitations",
          label: "Website Undangan",
          icon: <IconInvitation />,
          ...(activeInvitationCount !== null ? { badge: `${activeInvitationCount} Live` } : {}),
          hint: "Undangan online klien, tamu & RSVP",
        },
        {
          href: "/dashboard/storage",
          label: "Media & Storage",
          icon: <IconStorage />,
          hint: "Galeri media & kapasitas penyimpanan",
        },
      ],
    });
  }

  if (user.systemRole === "client") {
    navGroups.push({
      title: "Area Mempelai",
      items: [
        {
          href: "/dashboard",
          label: "Ringkasan Saya",
          exact: true,
          icon: <IconHome />,
          hint: "Langkah berikutnya untuk undangan Anda",
        },
        {
          href: "/dashboard/invitations",
          label: "Undangan Saya",
          icon: <IconInvitation />,
          ...(activeInvitationCount !== null ? { badge: `${activeInvitationCount} Live` } : {}),
          hint: "Isi data acara, tamu, preview, dan RSVP",
        },
        {
          href: "/dashboard/storage",
          label: "Foto & Media",
          icon: <IconStorage />,
          hint: "Kelola foto dan media undangan",
        },
      ],
    });
  }

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
          href: "/dashboard/admin/users",
          label: "Manajemen Pengguna",
          icon: <IconUserShield />,
          hint: "Kelola akun pengguna, peran, & kredensial",
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
          icon: <IconStore />,
          hint: "Kelola mitra seller & website toko",
        },
        {
          href: "/dashboard/admin/storage",
          label: "Manajemen Storage",
          icon: <IconStorage />,
          hint: "Kapasitas & kelola seluruh berkas media",
        },
        {
          href: "/dashboard/admin/reviews",
          label: "Ulasan Pelanggan",
          icon: <IconStar />,
          hint: "Kelola review & testimoni landing page",
        },
        {
          href: "/dashboard/admin/settings",
          label: "Pengaturan Umum",
          icon: <IconSettings />,
          hint: "Identitas aplikasi, logo, kontak & alamat",
        },
        {
          href: "/dashboard/admin/operations",
          label: "Operasional & Audit",
          icon: <IconUserShield />,
          hint: "Keamanan, SLA, privasi, domain & recovery",
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
        {
          href: "/dashboard/reseller/guide",
          label: "Panduan Seller",
          icon: <IconBook />,
          hint: "Cara kerja, aturan & FAQ seller",
        },
      ],
    });
  }

  if (process.env.NODE_ENV !== "production" && user.systemRole === "owner") {
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
          href: "/dashboard/playground?view=components",
          label: "Komponen & Font Studio",
          icon: <IconComponentStudio />,
          hint: "Eksplorasi komponen dan tipografi",
        },
      ],
    });
  }

  navGroups.push({
    title: "Akun",
    items: [
      {
        href: "/dashboard/privacy",
        label: "Privasi & Data Saya",
        icon: <IconUserShield />,
        hint: "Ekspor, retensi, dan penghapusan data",
      },
    ],
  });

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
              name:
                active.workspace.name === "Dev Workspace"
                  ? "Ruang Kerja Bisnis"
                  : active.workspace.name,
              role: active.role,
            }
          : null
      }
      workspaces={
        user.systemRole === "owner"
          ? active
            ? [
                {
                  id: active.workspace.id,
                  name:
                    active.workspace.name === "Dev Workspace"
                      ? "Ruang Kerja Bisnis"
                      : active.workspace.name,
                  role: active.role,
                },
              ]
            : []
          : memberships.map((membership) => ({
              id: membership.workspace.id,
              name: membership.workspace.name,
              role: membership.role,
            }))
      }
      agencyBranding={agencyBranding}
      appSettings={appSettings}
      storageUsage={storageUsage}
      navGroups={navGroups}
      logoutAction={logoutAction}
      switchWorkspaceAction={switchWorkspaceAction}
    >
      {children}
    </DashboardShell>
  );
}
