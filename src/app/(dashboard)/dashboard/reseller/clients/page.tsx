import type { Metadata } from "next";
import { getResellerClientsList } from "@/features/reseller/api";
import { ResellerClientsTable } from "@/features/reseller/components";
import styles from "@/features/reseller/components/reseller.module.css";
import { requireReseller } from "@/lib/auth/server";
import { createClientAction } from "./actions";

export const metadata: Metadata = {
  title: "Kelola Klien Agensi — Portal Reseller",
  description: "Daftar klien dan pembuatan akun end-user di bawah agensi reseller.",
};

export default async function ResellerClientsPage() {
  await requireReseller();
  const clients = await getResellerClientsList();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>Portal Reseller · Klien Agensi</p>
          <h1 className={styles.title}>Manajemen Klien Agensi</h1>
          <p className={styles.lead}>
            Kelola daftar klien end-user yang dinaungi agensi Anda dan buatkan akun mandiri untuk
            klien mengisi data undangan pernikahan mereka.
          </p>
        </div>
      </header>

      <ResellerClientsTable clients={clients} createAction={createClientAction} />
    </div>
  );
}
