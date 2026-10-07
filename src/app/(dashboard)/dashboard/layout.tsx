import { logoutAction } from "@/app/(dashboard)/login/actions";
import { getClientAgencyBranding } from "@/features/reseller/api";
import { getWorkspaceContext } from "@/lib/auth/server";
import {
  IconBank,
  IconCoins,
  IconFlask,
  IconHome,
  IconInvitation,
  IconLogout,
  IconReceipt,
  IconTemplate,
  IconUsers,
} from "./nav-icons";
import { NavLink } from "./nav-link";
import styles from "./shell.module.css";

/** Authenticated dashboard shell. `getWorkspaceContext` verifies the session (DB) or redirects to /login. */
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

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Navigasi utama">
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            IS
          </span>
          <span className={styles.brandText}>
            <strong>Invitation Studio</strong>
            <span>Pembuat undangan digital</span>
          </span>
        </div>

        <p className={styles.workspace} id="active-workspace">
          <span className={styles.workspaceLabel}>Workspace</span>
          <span className={styles.workspaceName}>
            {active ? active.workspace.name : "Tanpa workspace"}
            {active ? <span className={styles.role}>{active.role}</span> : null}
          </span>
        </p>

        <nav className={styles.nav}>
          <p className={styles.navGroup}>Menu</p>
          <ul className={styles.navList}>
            <li>
              <NavLink
                href="/dashboard"
                exact
                icon={<IconHome />}
                hint="Gambaran umum & langkah kerja"
              >
                Ringkasan
              </NavLink>
            </li>
            <li>
              <NavLink
                href="/dashboard/templates"
                icon={<IconTemplate />}
                hint="Desain undangan yang bisa dipakai ulang"
              >
                Template
              </NavLink>
            </li>
            <li>
              <NavLink
                href="/dashboard/invitations"
                icon={<IconInvitation />}
                hint="Undangan klien, tamu & RSVP"
              >
                Undangan
              </NavLink>
            </li>
          </ul>

          {user.systemRole === "owner" ? (
            <>
              <p className={styles.navGroup}>Super Admin</p>
              <ul className={styles.navList}>
                <li>
                  <NavLink
                    href="/dashboard/admin/resellers"
                    icon={<IconUsers />}
                    hint="Kelola mitra reseller & lisensi"
                  >
                    Mitra Reseller
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    href="/dashboard/admin/topup-requests"
                    icon={<IconReceipt />}
                    hint="Verifikasi bukti transfer manual"
                  >
                    Verifikasi Top-up
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    href="/dashboard/admin/bank-accounts"
                    icon={<IconBank />}
                    hint="Rekening tujuan transfer manual"
                  >
                    Rekening Bank
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    href="/dashboard/admin/transactions"
                    icon={<IconCoins />}
                    hint="Riwayat mutasi kredit & audit ledger"
                  >
                    Mutasi Kuota
                  </NavLink>
                </li>
              </ul>
            </>
          ) : null}

          {user.systemRole === "reseller" ? (
            <>
              <p className={styles.navGroup}>Portal Reseller</p>
              <ul className={styles.navList}>
                <li>
                  <NavLink
                    href="/dashboard/reseller"
                    exact
                    icon={<IconHome />}
                    hint="Ringkasan agensi & saldo kuota"
                  >
                    Ringkasan Agensi
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    href="/dashboard/reseller/topup"
                    icon={<IconCoins />}
                    hint="Beli paket kuota grosir via transfer"
                  >
                    Beli Kuota (Top-Up)
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    href="/dashboard/reseller/transactions"
                    icon={<IconReceipt />}
                    hint="Status permohonan & buku mutasi"
                  >
                    Riwayat Kuota
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    href="/dashboard/reseller/clients"
                    icon={<IconUsers />}
                    hint="Daftar klien & buat akun klien"
                  >
                    Klien Agensi
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    href="/dashboard/reseller/branding"
                    icon={<IconTemplate />}
                    hint="Logo, nama brand & kontak WA"
                  >
                    Branding Agensi
                  </NavLink>
                </li>
              </ul>
            </>
          ) : null}
          {process.env.NODE_ENV !== "production" ? (
            <>
              <p className={styles.navGroup}>Pengembang</p>
              <ul className={styles.navList}>
                <li>
                  <NavLink
                    href="/dashboard/playground"
                    icon={<IconFlask />}
                    hint="Uji pengisian data ke template"
                  >
                    Engine playground
                  </NavLink>
                </li>
              </ul>
            </>
          ) : null}
        </nav>

        {agencyBranding ? (
          <div className={styles.agencyBadge} data-testid="agency-white-label-badge">
            <div className={styles.agencyBadgeHeader}>
              {agencyBranding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={agencyBranding.logoUrl}
                  alt={agencyBranding.agencyName}
                  className={styles.agencyLogo}
                />
              ) : (
                <span className={styles.agencyBrandIcon} aria-hidden="true">
                  {agencyBranding.agencyName.charAt(0).toUpperCase()}
                </span>
              )}
              <div className={styles.agencyInfo}>
                <span className={styles.agencyManagedLabel}>Dikelola oleh</span>
                <strong className={styles.agencyName}>{agencyBranding.agencyName}</strong>
              </div>
            </div>
            <a
              href={`https://wa.me/${agencyBranding.whatsappContact.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.agencySupportLink}
              title="Hubungi Customer Support via WhatsApp"
            >
              <span>💬 Bantuan CS</span>
              <small>{agencyBranding.whatsappContact}</small>
            </a>
          </div>
        ) : null}

        <div className={styles.account}>
          <div className={styles.user} id="current-user">
            <span className={styles.avatar} aria-hidden="true">
              {initials || "?"}
            </span>
            <span className={styles.userText}>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </span>
          </div>
          <form action={logoutAction}>
            <button id="logout-button" type="submit" className={styles.logout}>
              <IconLogout />
              Keluar
            </button>
          </form>
        </div>
      </aside>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
