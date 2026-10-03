"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import styles from "./shell.module.css";

export function NavLink({
  href,
  exact = false,
  children,
}: {
  href: string;
  exact?: boolean;
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
      {children}
    </Link>
  );
}
