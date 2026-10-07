"use client";

import { useState } from "react";
import type { ActionState, ResellerClientItem } from "../types";
import { CreateClientModal } from "./CreateClientModal";
import styles from "./reseller.module.css";

interface ResellerClientsTableProps {
  clients: ResellerClientItem[];
  createAction: (_prev: ActionState, formData: FormData) => Promise<ActionState>;
}

export function ResellerClientsTable({ clients, createAction }: ResellerClientsTableProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={styles.btnPrimary}
        >
          + Tambah Klien Baru
        </button>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableResponsive}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nama Klien</th>
                <th>Email Akun</th>
                <th>Status Akun</th>
                <th>Tanggal Terdaftar</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                        </svg>
                      </div>
                      <strong>Belum ada klien terdaftar</strong>
                      <span>Klik tombol "Tambah Klien Baru" di atas untuk menambahkan klien agensi Anda.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                clients.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong style={{ fontSize: 14 }}>{c.name}</strong>
                    </td>
                    <td>{c.email}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles.statusApproved}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: "var(--dash-muted)" }}>
                        {new Date(c.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        action={async (prev, fd) => {
          const res = await createAction(prev, fd);
          if (res.ok) setIsModalOpen(false);
          return res;
        }}
      />
    </>
  );
}
