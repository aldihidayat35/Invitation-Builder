"use client";

import type { AdminTopupRequestItem } from "../types";
import styles from "./admin.module.css";

interface ProofPreviewModalProps {
  item: AdminTopupRequestItem | null;
  onClose: () => void;
}

export function ProofPreviewModal({ item, onClose }: ProofPreviewModalProps) {
  if (!item) return null;

  return (
    <div className={styles.modalBackdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={styles.modalCard}
        style={{ maxWidth: 640 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div className={styles.modalTitleBox}>
            <h3 className={styles.modalTitle}>Bukti Transfer Manual</h3>
            <p className={styles.modalSub}>
              {item.reseller.agencyName} · Transfer via {item.request.senderBank} a.n.{" "}
              {item.request.senderAccountName}
            </p>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Tutup pratinjau bukti"
          >
            ×
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.request.proofFileUrl}
            alt={`Bukti transfer dari ${item.request.senderAccountName}`}
            className={styles.proofModalImage}
          />

          <div
            style={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              background: "var(--dash-surface-sunken)",
              padding: 12,
              borderRadius: "var(--dash-radius-sm)",
              fontSize: 13,
            }}
          >
            <div>
              <span style={{ color: "var(--dash-muted)", display: "block" }}>Nominal Transfer:</span>
              <strong style={{ fontSize: 16, color: "var(--dash-text)" }}>
                Rp {item.request.amountPaid.toLocaleString("id-ID")}
              </strong>
            </div>
            <div>
              <span style={{ color: "var(--dash-muted)", display: "block" }}>Jumlah Kuota:</span>
              <strong style={{ fontSize: 16, color: "var(--dash-accent)" }}>
                +{item.request.creditAmount} Kredit
              </strong>
            </div>
            {item.request.notes ? (
              <div style={{ gridColumn: "span 2", paddingTop: 4 }}>
                <span style={{ color: "var(--dash-muted)", display: "block" }}>Catatan Reseller:</span>
                <span style={{ color: "var(--dash-text)" }}>{item.request.notes}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.modalActions} style={{ marginTop: 16 }}>
          <button type="button" className={styles.btnSecondary} onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
