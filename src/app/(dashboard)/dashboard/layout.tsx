import { logoutAction } from "@/app/(dashboard)/login/actions";
import { getWorkspaceContext } from "@/lib/auth/server";
import { NavLink } from "./nav-link";
import styles from "./shell.module.css";

const UPCOMING = [
  { label: "Editor", phase: "F4" },
  { label: "Assets", phase: "F5" },
  { label: "Widgets", phase: "F6" },
  { label: "Invitations", phase: "F8" },
  { label: "Publishing", phase: "F9" },
] as const;

/** Authenticated dashboard shell. `getWorkspaceContext` verifies the session (DB) or redirects to /login. */
export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const { user, active } = await getWorkspaceContext();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Navigasi utama">
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true" />
          <span>
            Invitation<strong>Studio</strong>
          </span>
        </div>
        <nav>
          <ul className={styles.navList}>
            <li>
              <NavLink href="/dashboard" exact>
                Ringkasan
              </NavLink>
            </li>
            <li>
              <NavLink href="/dashboard/templates">Template Library</NavLink>
            </li>
            {process.env.NODE_ENV !== "production" ? (
              <li>
                <NavLink href="/dashboard/playground">Engine playground</NavLink>
              </li>
            ) : null}
            {UPCOMING.map((item) => (
              <li key={item.label}>
                <span className={styles.navDisabled} aria-disabled="true">
                  {item.label}
                  <span className={styles.navPhase}>{item.phase}</span>
                </span>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.account}>
          <p className={styles.workspace} id="active-workspace">
            {active ? active.workspace.name : "Tanpa workspace"}
            {active ? <span className={styles.role}>{active.role}</span> : null}
          </p>
          <p className={styles.user} id="current-user">
            {user.name}
            <span>{user.email}</span>
          </p>
          <form action={logoutAction}>
            <button id="logout-button" type="submit" className={styles.logout}>
              Keluar
            </button>
          </form>
        </div>
      </aside>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
