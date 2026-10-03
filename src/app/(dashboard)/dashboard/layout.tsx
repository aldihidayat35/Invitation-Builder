import { logoutAction } from "@/app/(dashboard)/login/actions";
import { getWorkspaceContext } from "@/lib/auth/server";
import { IconFlask, IconHome, IconInvitation, IconLogout, IconTemplate } from "./nav-icons";
import { NavLink } from "./nav-link";
import styles from "./shell.module.css";

/** Authenticated dashboard shell. `getWorkspaceContext` verifies the session (DB) or redirects to /login. */
export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const { user, active } = await getWorkspaceContext();
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
