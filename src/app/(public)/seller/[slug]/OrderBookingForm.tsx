"use client";

import { useActionState, useState, useEffect } from "react";
import { submitCustomerOrderAction, type OrderBookingState } from "./actions";
import styles from "./seller-storefront.module.css";

interface OrderBookingFormProps {
  sellerSlug: string;
  idempotencyKey: string;
  agencyName: string;
  templates: Array<{ id: string; name: string }>;
  selectedTemplateId?: string;
  onSelectTemplate?: (id: string) => void;
}

export function OrderBookingForm({
  sellerSlug,
  idempotencyKey,
  agencyName,
  templates,
  selectedTemplateId = "",
  onSelectTemplate,
}: OrderBookingFormProps) {
  const [templateId, setTemplateId] = useState(selectedTemplateId);

  useEffect(() => {
    if (selectedTemplateId) {
      setTemplateId(selectedTemplateId);
    }
  }, [selectedTemplateId]);

  const [state, formAction, isPending] = useActionState<OrderBookingState, FormData>(
    submitCustomerOrderAction,
    {},
  );

  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    onSelectTemplate?.(id);
  };

  if (state.ok && state.whatsappUrl) {
    return (
      <div className={styles.orderSection}>
        <div className={styles.successCard}>
          <div className={styles.successIcon} aria-hidden="true">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h3 className={styles.successTitle}>Pesanan Berhasil Dicatat!</h3>
          <p className={styles.successText}>
            Terima kasih! Formulir pemesanan website undangan Anda telah kami terima di sistem
            utama. Silakan klik tombol di bawah untuk langsung terhubung dengan customer service{" "}
            {agencyName} melalui WhatsApp.
          </p>
          <a
            href={state.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnWhatsapp}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.13.332.202.043.073.043.419-.101.824z" />
            </svg>
            Hubungi CS {agencyName} via WhatsApp
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.orderSection} id="form-pemesanan">
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h3 style={{ fontSize: "1.6rem", fontWeight: 700, margin: "0 0 0.5rem", color: "#2c221e" }}>
          Formulir Pemesanan Undangan Digital
        </h3>
        <p style={{ color: "#63554e", margin: 0, fontSize: "0.95rem" }}>
          Isi detail data Anda dan calon mempelai untuk memulai proses pembuatan website undangan.
        </p>
      </div>

      <form action={formAction}>
        {state.error ? (
          <div
            style={{
              padding: "0.85rem 1rem",
              background: "#fee2e2",
              color: "#991b1b",
              borderRadius: "8px",
              marginBottom: "1.25rem",
              fontSize: "0.9rem",
            }}
          >
            {state.error}
          </div>
        ) : null}

        {/* Hidden inputs */}
        <input type="hidden" name="sellerSlug" value={sellerSlug} />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: "absolute", left: "-10000px", width: 1, height: 1 }}
        />

        <div className={styles.formGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="customerName">
              Nama Lengkap Pemesan *
            </label>
            <input
              id="customerName"
              name="customerName"
              type="text"
              required
              placeholder="misal: Rian Syahputra"
              className={styles.inputControl}
              disabled={isPending}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="customerWhatsapp">
              Nomor WhatsApp Aktif *
            </label>
            <input
              id="customerWhatsapp"
              name="customerWhatsapp"
              type="tel"
              required
              placeholder="081234567890"
              className={styles.inputControl}
              disabled={isPending}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="customerEmail">
              Alamat Email Pemesan *
            </label>
            <input
              id="customerEmail"
              name="customerEmail"
              type="email"
              required
              placeholder="rian@example.com"
              className={styles.inputControl}
              disabled={isPending}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="groomBrideNames">
              Nama Pasangan Mempelai
            </label>
            <input
              id="groomBrideNames"
              name="groomBrideNames"
              type="text"
              placeholder="misal: Rian & Aisyah"
              className={styles.inputControl}
              disabled={isPending}
            />
          </div>

          <div className={styles.formFull}>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="templateId">
                Pilih Desain Tema Undangan
              </label>
              <select
                id="templateId"
                name="templateId"
                value={templateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className={styles.inputControl}
                disabled={isPending}
              >
                <option value="">-- Pilih Desain Tema (Atau Konsultasi Bebas) --</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="eventDate">
              Rencana Tanggal Acara
            </label>
            <input
              id="eventDate"
              name="eventDate"
              type="date"
              className={styles.inputControl}
              disabled={isPending}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="eventLocation">
              Kota / Lokasi Acara
            </label>
            <input
              id="eventLocation"
              name="eventLocation"
              type="text"
              placeholder="misal: Jakarta Selatan"
              className={styles.inputControl}
              disabled={isPending}
            />
          </div>

          <div className={styles.formFull}>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="notes">
                Catatan / Permintaan Khusus
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="misal: Ingin tema nuansa adat Jawa / Sunda, ada request lagu khusus..."
                className={styles.inputControl}
                disabled={isPending}
              />
            </div>
          </div>
        </div>

        <label
          style={{
            display: "flex",
            gap: "0.6rem",
            alignItems: "flex-start",
            marginTop: "1.25rem",
            fontSize: "0.82rem",
            color: "#63554e",
          }}
        >
          <input type="checkbox" name="privacyConsent" required disabled={isPending} />
          <span>
            Saya menyetujui data yang saya kirim diproses untuk kebutuhan pemesanan dan komunikasi
            layanan undangan.
          </span>
        </label>

        <div style={{ marginTop: "1.75rem", textAlign: "center" }}>
          <button
            type="submit"
            className={styles.btnPrimary}
            style={{ width: "100%", justifyContent: "center" }}
            disabled={isPending}
            id="btn-submit-customer-order"
          >
            {isPending ? "Mengirimkan Pesanan..." : "Kirim Pesanan & Hubungi Seller →"}
          </button>
          <span className={styles.hint} style={{ display: "block", marginTop: "0.5rem" }}>
            Setelah mengirim formulir, Anda dapat langsung mengonfirmasi pesanan ke WhatsApp seller.
          </span>
        </div>
      </form>
    </div>
  );
}
