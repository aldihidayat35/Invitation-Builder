"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import styles from "./shell.module.css";

export function NavLink({
  href,
  exact = false,
  icon,
  hint,
  children,
}: {
  href: string;
  exact?: boolean;
  icon?: ReactNode;
  /** One-line explanation shown under the label. */
  hint?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={styles.navItem}
      aria-current={active ? "page" : undefined}
      data-active={active || undefined}
    >
      {icon ? <span className={styles.navIcon}>{icon}</span> : null}
      <span className={styles.navText}>
        <span className={styles.navLabel}>{children}</span>
        {hint ? <span className={styles.navHint}>{hint}</span> : null}
      </span>
    </Link>
  );
}
