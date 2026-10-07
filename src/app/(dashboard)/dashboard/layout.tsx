import { logoutAction } from "@/app/(dashboard)/login/actions";
import { DashboardShell, type NavGroup } from "@/features/dashboard-layout";
import { getClientAgencyBranding } from "@/features/reseller/api";
import { getWorkspaceContext } from "@/lib/auth/server";
import {
  IconFlask,
  IconHome,
  IconInvitation,
  IconReceipt,
  IconTemplate,
  IconUsers,
} from "./nav-icons";

/** Authenticated enterprise dashboard shell layout. */
export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const { user, active } = await getWorkspaceContext();
  const agencyBranding = user.resellerId
    ? await getClientAgencyBranding(user.resellerId)
    : null;

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
          label: "Template",
          icon: <IconTemplate />,
          hint: "Desain undangan yang bisa dipakai ulang",
        },
        {
          href: "/dashboard/invitations",
          label: "Undangan",
          icon: <IconInvitation />,
          hint: "Undangan klien, tamu & RSVP",
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
          icon: <IconHome />,
          hint: "Ringkasan metrik & grafik platform",
        },
        {
          href: "/dashboard/admin/orders",
          label: "Pesanan Masuk",
          icon: <IconReceipt />,
          hint: "Olah data & terbitkan undangan customer",
        },
        {
          href: "/dashboard/admin/resellers",
          label: "Mitra Seller",
          icon: <IconUsers />,
          hint: "Kelola mitra seller & website toko",
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
      navGroups={navGroups}
      logoutAction={logoutAction}
    >
      {children}
    </DashboardShell>
  );
}
