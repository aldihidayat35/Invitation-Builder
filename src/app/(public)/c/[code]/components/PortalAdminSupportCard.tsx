"use client";

import React, { useState } from "react";
import type { CustomerOrder } from "@/lib/db/schema";
import styles from "../client-portal.module.css";

interface PortalAdminSupportCardProps {
  order: CustomerOrder;
  templateTitle?: string | null;
  supportContact: {
    name: string;
    phone: string;
    whatsappUrl: string;
  };
  onSwitchToSelfService?: () => void;
  token: string;
}

const TEXT_FORMAT_TEMPLATE = `Halo Admin, berikut rincian data untuk undangan pernikahan kami:

*DATA MEMPELAI PRIA*
• Nama Panggilan: 
• Nama Lengkap & Gelar: 
• Nama Orang Tua: Putra dari Bpk. ... & Ibu ...

*DATA MEMPELAI WANITA*
• Nama Panggilan: 
• Nama Lengkap & Gelar: 
• Nama Orang Tua: Putri dari Bpk. ... & Ibu ...

*AKAD / PEMBERKATAN*
• Hari & Tanggal: 
• Waktu / Jam: 
• Tempat: 

*RESEPSI PERNIKAHAN*
• Hari & Tanggal: 
• Waktu / Jam: 
• Tempat / Gedung: 
• Alamat Lengkap & Link Maps: 

*AMPLOP DIGITAL / KADO*
• Nama Bank / E-Wallet: 
• Nomor Rekening: 
• Atas Nama: 

*CATATAN KHUSUS / FOTO*
(Foto mempelai dan galeri kami kirimkan via chat WhatsApp ini)`;

export function PortalAdminSupportCard({
  order,
  templateTitle,
  supportContact,
  onSwitchToSelfService,
}: PortalAdminSupportCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyFormat = () => {
    navigator.clipboard.writeText(TEXT_FORMAT_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const coupleNames = order.groomBrideNames || order.customerName;

  return (
    <div className={styles.supportCardContainer}>
      <div className={styles.supportHeroCard}>
        <div className={styles.supportBadgeRow}>
          <span className={styles.supportWaBadge}>💬 Layanan Asistensi Personal</span>
          <span className={styles.supportTargetBadge}>{supportContact.name}</span>
        </div>

        <h2 className={styles.supportTitle}>Serahkan Pengisian Data ke Tim Kami</h2>
        <p className={styles.supportDesc}>
          Anda tidak perlu repot mengisi formulir satu per satu. Cukup kirimkan data acara dan foto
          Anda melalui chat WhatsApp. Tim spesialis kami yang akan menginputkan seluruh data dan
          menyesuaikan tampilan undangan Anda hingga sempurna!
        </p>

        {/* Action Button WhatsApp */}
        <div className={styles.supportWaActionRow}>
          <a
            href={supportContact.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.waButtonLarge}
          >
            <span className={styles.waIcon}>💬</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "1rem", fontWeight: 700 }}>
                Hubungi Admin via WhatsApp
              </div>
              <div style={{ fontSize: "0.75rem", opacity: 0.9 }}>
                +{supportContact.phone} · {supportContact.name}
              </div>
            </div>
            <span style={{ marginLeft: "auto", fontSize: "1.2rem" }}>↗</span>
          </a>
        </div>

        {/* 3 Step Workflow */}
        <div className={styles.supportStepsGrid}>
          <div className={styles.supportStepItem}>
            <div className={styles.stepNum}>1</div>
            <div>
              <strong>Siapkan Data & Foto</strong>
              <p>Nama mempelai, orang tua, tanggal, lokasi acara, no. rekening, dan foto.</p>
            </div>
          </div>
          <div className={styles.supportStepItem}>
            <div className={styles.stepNum}>2</div>
            <div>
              <strong>Kirimkan ke WhatsApp Admin</strong>
              <p>Pesan otomatis sudah mencantumkan ID pesanan dan link portal Anda.</p>
            </div>
          </div>
          <div className={styles.supportStepItem}>
            <div className={styles.stepNum}>3</div>
            <div>
              <strong>Review Hasil Undangan</strong>
              <p>Admin akan mengabari Anda jika undangan telah selesai diproses.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Template Copy Box */}
      <div className={styles.copyBoxCard}>
        <div className={styles.copyBoxHeader}>
          <div>
            <h3 className={styles.copyBoxTitle}>Format Isian Data Cepat</h3>
            <p className={styles.copyBoxDesc}>
              Salin draf teks ini, isi di catatan atau chat WhatsApp, lalu kirimkan ke Admin.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyFormat}
            className={copied ? styles.btnCopySuccess : styles.btnSecondary}
            style={{ fontSize: "0.8rem", padding: "0.5rem 1rem" }}
          >
            {copied ? "✓ Tersalin ke Clipboard!" : "📋 Salin Format Teks"}
          </button>
        </div>

        <pre className={styles.copyPreSnippet}>
          {TEXT_FORMAT_TEMPLATE}
        </pre>
      </div>

      {/* Switch to Self-Service Notice */}
      <div className={styles.switcherNoticeCard}>
        <div className={styles.switcherNoticeContent}>
          <span className={styles.switcherNoticeIcon}>⚡</span>
          <div>
            <strong>Ingin mencoba mengisi sendiri secara langsung?</strong>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.825rem", color: "#786b5e" }}>
              Anda juga dapat beralih ke mode mandiri kapan saja untuk mengisi teks dan melihat pratinjau
              berubah seketika.
            </p>
          </div>
        </div>
        {onSwitchToSelfService && (
          <button
            type="button"
            onClick={onSwitchToSelfService}
            className={styles.btnSecondary}
            style={{ whiteSpace: "nowrap", alignSelf: "center" }}
          >
            ⚡ Beralih ke Isi Mandiri
          </button>
        )}
      </div>
    </div>
  );
}
