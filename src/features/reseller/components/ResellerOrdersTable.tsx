import type { ResellerOrderItem } from "../types";
import styles from "./reseller.module.css";

function getStatusBadge(status: string) {
  switch (status) {
    case "new":
      return { label: "Pesanan Baru", className: styles.badgePending };
    case "in_review":
      return { label: "Ditinjau Admin", className: styles.badgePending };
    case "in_progress":
      return { label: "Diproses Admin", className: styles.badgeProgress ?? styles.badgePending };
    case "completed":
      return { label: "Selesai & Terbit", className: styles.badgeApproved };
    case "cancelled":
      return { label: "Dibatalkan", className: styles.badgeRejected };
    default:
      return { label: status, className: styles.badgePending };
  }
}

export function ResellerOrdersTable({ orders }: { orders: ResellerOrderItem[] }) {
  return (
    <div className={styles.tableCard}>
      <div className={styles.tableHeader}>
        <div>
          <h3 className={styles.tableTitle}>Daftar Pesanan Masuk Customer</h3>
          <p className={styles.tableSubtitle}>
            Pesanan customer yang masuk melalui website toko seller Anda. Pengolahan dan pengeditan data undangan dikelola langsung oleh Admin.
          </p>
        </div>
      </div>

      <div style={{
        margin: "0 1.5rem 1rem",
        padding: "0.85rem 1.1rem",
        borderRadius: "8px",
        background: "rgba(132, 99, 63, 0.08)",
        border: "1px solid rgba(132, 99, 63, 0.2)",
        fontSize: "0.88rem",
        color: "var(--dash-text)",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: "var(--dash-primary)", flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>
          <strong>Ketentuan Otoritas Data:</strong> Seluruh pengubahan data teknis dan penerbitan website undangan dilakukan oleh Admin untuk memastikan keamanan & keakuratan data customer.
        </span>
      </div>

      <div className={styles.tableResponsive}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Pemesan</th>
              <th>Mempelai</th>
              <th>Kontak WhatsApp</th>
              <th>Status</th>
              <th>Catatan Customer</th>
              <th>Tanggal Masuk</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "3rem", color: "var(--dash-text-muted)" }}>
                  Belum ada pesanan masuk dari customer. Bagikan link website toko Anda untuk mulai menerima pesanan!
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const badge = getStatusBadge(order.status);
                const waNumber = order.customerWhatsapp.replace(/\D/g, "");
                const waHref = `https://wa.me/${waNumber.startsWith("0") ? "62" + waNumber.slice(1) : waNumber}`;

                return (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.customerName}</strong>
                      <div style={{ fontSize: "0.8rem", color: "var(--dash-text-muted)" }}>
                        {order.customerEmail}
                      </div>
                    </td>
                    <td>
                      {order.groomBrideNames ? (
                        <span>{order.groomBrideNames}</span>
                      ) : (
                        <span style={{ color: "var(--dash-text-muted)" }}>-</span>
                      )}
                    </td>
                    <td>
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          color: "#15803d",
                          fontWeight: 500,
                          textDecoration: "none",
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        {order.customerWhatsapp}
                      </a>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${badge.className}`}>{badge.label}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.85rem", color: "var(--dash-text-muted)" }}>
                        {order.notes || "-"}
                      </span>
                    </td>
                    <td>
                      {new Date(order.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
