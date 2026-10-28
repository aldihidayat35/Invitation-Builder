"use client";

import React, { useMemo, useState, useTransition } from "react";
import type { ClientPortalData } from "@/features/orders";
import {
  addPortalGuestAction,
  archivePortalGuestAction,
  submitPortalDecisionAction,
} from "./actions";
import { PortalVariableForm } from "./components/PortalVariableForm";
import { PortalGalleryManager } from "./components/PortalGalleryManager";
import { PortalBacksoundManager } from "./components/PortalBacksoundManager";
import { PortalSectionManager } from "./components/PortalSectionManager";
import { PortalAdminSupportCard } from "./components/PortalAdminSupportCard";
import { PortalShareMessageCard } from "./components/PortalShareMessageCard";
import {
  FileTextIcon,
  ImageIcon,
  MusicIcon,
  LayersIcon,
  EyeIcon,
  UsersIcon,
  CheckSquareIcon,
  MessageSquareHeartIcon,
  ClockIcon,
  CheckCircle2Icon,
  GlobeIcon,
  Edit3Icon,
  SparklesIcon,
  ZapIcon,
  MessageCircleIcon,
  LightbulbIcon,
  CheckIcon,
  ExternalLinkIcon,
  LinkIcon,
  CopyIcon,
  WhatsAppIcon,
  Trash2Icon,
  UserPlusIcon,
  SearchIcon,
} from "./components/PortalIcons";
import { interpolateMessageTemplate } from "@/lib/db/repositories/message-templates";
import styles from "./client-portal.module.css";

interface ClientPortalViewProps {
  data: ClientPortalData;
  token: string;
}

export function ClientPortalView({ data, token }: ClientPortalViewProps) {
  const [activeTab, setActiveTab] = useState<
    "data" | "gallery" | "audio" | "sections" | "review" | "guests" | "rsvp" | "wishes"
  >("data");
  const [galleryItems, setGalleryItems] = useState(data.galleryItems || []);
  const [audioSettings, setAudioSettings] = useState(data.audioSettings);
  const [dataMode, setDataMode] = useState<"self_service" | "admin_assisted">("self_service");
  const [guestSearch, setGuestSearch] = useState("");
  const [rsvpFilter, setRsvpFilter] = useState<"all" | "attending" | "not_attending">("all");
  const [rsvpSearch, setRsvpSearch] = useState("");
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestPax, setNewGuestPax] = useState("1");
  const [revisionNote, setRevisionNote] = useState("");
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [customShareMessage, setCustomShareMessage] = useState<string>(
    data.activeShareMessageTemplate ||
      `Halo {guestname},\n\nTanpa mengurangi rasa hormat, perkenankan kami mengundang Anda untuk hadir di acara kami:\n*{event_title}*\n\nInformasi lengkap dan tautan undangan dapat dilihat di:\n{link}\n\nTerima kasih dan sampai jumpa!`,
  );
  const [isPending, startTransition] = useTransition();

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const coupleTitle =
    data.order?.groomBrideNames?.trim() ||
    (data.order?.customerName
      ? `Pernikahan ${data.order.customerName}`
      : data.invitation?.title || "Undangan Pernikahan");

  const eventDateStr = data.order?.eventDate
    ? new Date(data.order.eventDate).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const orderProductionStatus =
    data.order?.productionStatus ??
    (data.invitation?.status === "published" ? "published" : "approved");

  // Filter guests
  const filteredGuests = data.guests.filter((g) =>
    g.name.toLowerCase().includes(guestSearch.toLowerCase()),
  );

  // RSVP metrics
  const attendingRsvps = data.rsvps.filter((r) => r.response === "attending");
  const notAttendingRsvps = data.rsvps.filter((r) => r.response === "not_attending");
  const totalPaxAttending = attendingRsvps.reduce((acc, r) => acc + (r.partySize || 1), 0);

  const formatRsvpDate = (dateVal?: Date | string | null) => {
    if (!dateVal) return "";
    const d = new Date(dateVal);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredRsvps = useMemo(() => {
    return data.rsvps.filter((r) => {
      const matchesFilter =
        rsvpFilter === "all" ? true : r.response === rsvpFilter;
      const q = rsvpSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        (r.message ? r.message.toLowerCase().includes(q) : false);
      return matchesFilter && matchesSearch;
    });
  }, [data.rsvps, rsvpFilter, rsvpSearch]);

  // Wishes metrics
  const wishesList = data.rsvps.filter((r) => r.message && r.message.trim().length > 0);

  const getGuestShareUrl = (guestName: string) => {
    if (!data.shareableUrl) return null;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}${data.shareableUrl}?to=${encodeURIComponent(guestName)}`;
  };

  const handleCopyGuestLink = (guestName: string) => {
    const url = getGuestShareUrl(guestName);
    if (!url) return;
    navigator.clipboard.writeText(url);
    showToast(`Link undangan untuk "${guestName}" berhasil disalin!`);
  };

  const handleSendWa = (guestName: string) => {
    const url = getGuestShareUrl(guestName);
    if (!url) return;
    const text = interpolateMessageTemplate(customShareMessage, {
      guestName,
      link: url,
      eventTitle: coupleTitle,
      eventDate: eventDateStr || undefined,
      eventLocation: data.order?.eventLocation || undefined,
    });
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  const handleCopyFullMessage = (guestName: string) => {
    const url = getGuestShareUrl(guestName);
    if (!url) return;
    const text = interpolateMessageTemplate(customShareMessage, {
      guestName,
      link: url,
      eventTitle: coupleTitle,
      eventDate: eventDateStr || undefined,
      eventLocation: data.order?.eventLocation || undefined,
    });
    navigator.clipboard.writeText(text);
    showToast(`Teks pesan undangan untuk "${guestName}" berhasil disalin!`);
  };

  const handleApprove = () => {
    if (!confirm("Apakah Anda yakin ingin menyetujui desain dan data undangan ini?")) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("token", token);
      formData.set("decision", "approve");
      const res = await submitPortalDecisionAction({ ok: false }, formData);
      if (res.ok) {
        showToast(res.message || "Undangan disetujui!");
      } else {
        alert(res.error || "Gagal menyetujui.");
      }
    });
  };

  const handleRequestRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionNote.trim()) {
      alert("Mohon isi catatan revisi spesifik.");
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set("token", token);
      formData.set("decision", "request_revision");
      formData.set("note", revisionNote);
      const res = await submitPortalDecisionAction({ ok: false }, formData);
      if (res.ok) {
        showToast(res.message || "Catatan revisi terkirim!");
        setShowRevisionForm(false);
      } else {
        alert(res.error || "Gagal mengirim revisi.");
      }
    });
  };

  const handleAddGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuestName.trim()) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("token", token);
      formData.set("name", newGuestName);
      formData.set("maxParty", newGuestPax || "1");
      const res = await addPortalGuestAction({ ok: false }, formData);
      if (res.ok) {
        showToast(res.message || "Tamu berhasil ditambahkan.");
        setNewGuestName("");
        setNewGuestPax("1");
      } else {
        alert(res.error || "Gagal menambah tamu.");
      }
    });
  };

  const handleDeleteGuest = (guestId: string, name: string) => {
    if (!confirm(`Hapus "${name}" dari daftar tamu?`)) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("token", token);
      formData.set("guestId", guestId);
      const res = await archivePortalGuestAction({ ok: false }, formData);
      if (res.ok) {
        showToast(`Tamu "${name}" dihapus.`);
      } else {
        alert(res.error || "Gagal menghapus tamu.");
      }
    });
  };

  return (
    <div className={styles.portalContainer}>
      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            bottom: "2rem",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#2c2523",
            color: "#faf8f5",
            padding: "0.75rem 1.35rem",
            borderRadius: "9999px",
            fontSize: "0.85rem",
            fontWeight: 600,
            zIndex: 9999,
            boxShadow: "0 10px 25px rgba(44, 34, 30, 0.25)",
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* Hero Header */}
      <header className={styles.heroHeader}>
        <div className={styles.heroContent}>
          <div className={styles.heroTopRow}>
            <span className={styles.portalBadge}>
              <SparklesIcon size={14} />
              <span>Portal Klien Mandiri</span>
            </span>
            {orderProductionStatus === "client_review" && (
              <span className={`${styles.portalBadge} ${styles.statusReview}`}>
                <ClockIcon size={14} />
                <span>Menunggu Persetujuan Anda</span>
              </span>
            )}
            {orderProductionStatus === "approved" && (
              <span className={`${styles.portalBadge} ${styles.statusApproved}`}>
                <CheckCircle2Icon size={14} />
                <span>Disetujui</span>
              </span>
            )}
            {orderProductionStatus === "published" && (
              <span className={`${styles.portalBadge} ${styles.statusPublished}`}>
                <GlobeIcon size={14} />
                <span>Undangan Terbit</span>
              </span>
            )}
            {orderProductionStatus === "revision_requested" && (
              <span className={`${styles.portalBadge} ${styles.statusRevision}`}>
                <Edit3Icon size={14} />
                <span>Dalam Proses Revisi</span>
              </span>
            )}
          </div>

          <h1 className={styles.heroTitle}>{coupleTitle}</h1>
          <p className={styles.heroSubtitle}>
            {eventDateStr ? `Tanggal Acara: ${eventDateStr}` : "Tanggal Acara: Menyesuaikan"}
            {data.templateTitle ? ` • Tema: ${data.templateTitle}` : ""}
          </p>
        </div>
      </header>

      {/* Sticky Tab Navigation (Capsule Pills) */}
      <nav className={styles.tabsWrapper}>
        <div className={styles.tabsList}>
          <button
            type="button"
            onClick={() => setActiveTab("data")}
            className={`${styles.tabBtn} ${activeTab === "data" ? styles.tabBtnActive : ""}`}
          >
            <FileTextIcon size={17} />
            <span>Data Undangan</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("gallery")}
            className={`${styles.tabBtn} ${activeTab === "gallery" ? styles.tabBtnActive : ""}`}
          >
            <ImageIcon size={17} />
            <span>Galeri Foto</span>
            <span className={styles.tabCount}>{galleryItems.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("audio")}
            className={`${styles.tabBtn} ${activeTab === "audio" ? styles.tabBtnActive : ""}`}
          >
            <MusicIcon size={17} />
            <span>Musik Undangan</span>
            <span
              className={styles.tabCount}
              style={{
                background: audioSettings?.enabled !== false ? "#d1fae5" : "#fee2e2",
                color: audioSettings?.enabled !== false ? "#065f46" : "#991b1b",
              }}
            >
              {audioSettings?.enabled !== false ? "Aktif" : "Mati"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sections")}
            className={`${styles.tabBtn} ${activeTab === "sections" ? styles.tabBtnActive : ""}`}
          >
            <LayersIcon size={17} />
            <span>Atur Section</span>
            {data.sections && data.sections.length > 0 && (
              <span className={styles.tabCount}>
                {data.sections.length - (data.disabledSections?.length || 0)}/{data.sections.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("review")}
            className={`${styles.tabBtn} ${activeTab === "review" ? styles.tabBtnActive : ""}`}
          >
            <EyeIcon size={17} />
            <span>Review Undangan</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("guests")}
            className={`${styles.tabBtn} ${activeTab === "guests" ? styles.tabBtnActive : ""}`}
          >
            <UsersIcon size={17} />
            <span>Daftar Tamu</span>
            <span className={styles.tabCount}>{data.guests.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rsvp")}
            className={`${styles.tabBtn} ${activeTab === "rsvp" ? styles.tabBtnActive : ""}`}
          >
            <CheckSquareIcon size={17} />
            <span>Konfirmasi RSVP</span>
            <span className={styles.tabCount}>{data.rsvps.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("wishes")}
            className={`${styles.tabBtn} ${activeTab === "wishes" ? styles.tabBtnActive : ""}`}
          >
            <MessageSquareHeartIcon size={17} />
            <span>Buku Doa / Ucapan</span>
            <span className={styles.tabCount}>{wishesList.length}</span>
          </button>
        </div>
      </nav>

      {/* Main Body */}
      <main className={styles.mainContent}>
        {/* --- TAB 0: DATA UNDANGAN (DUAL MODE: MANDIRI vs BANTUAN WA ADMIN) --- */}
        {activeTab === "data" && (
          <div>
            <div className={styles.cardHeader} style={{ marginBottom: "1.25rem" }}>
              <div>
                <h2 className={styles.cardTitle}>Pengaturan & Pengisian Data Undangan</h2>
                <p className={styles.cardDesc}>
                  Pilih metode pengisian: isi sendiri secara mandiri atau serahkan seluruh proses
                  penyesuaian data dan foto ke tim admin kami via WhatsApp.
                </p>
              </div>
            </div>

            {/* Mode Selector */}
            <div className={styles.modeSelectorGrid}>
              <button
                type="button"
                onClick={() => setDataMode("self_service")}
                className={`${styles.modeOptionCard} ${
                  dataMode === "self_service" ? styles.modeOptionCardActive : ""
                }`}
              >
                <div className={styles.modeOptionTop}>
                  <div className={styles.modeIconBox}>
                    <ZapIcon size={22} />
                  </div>
                  <span className={styles.modeSelectionBadge}>
                    {dataMode === "self_service" ? "Aktif Dipilih" : "Pilihan 1"}
                  </span>
                </div>
                <h3 className={styles.modeOptionTitle}>Isi Data Mandiri (Self-Service)</h3>
                <p className={styles.modeOptionDesc}>
                  Isi formulir data nama mempelai, jadwal acara, lokasi, dan amplop digital langsung di sini.
                  Pratinjau undangan otomatis terbarui seketika.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setDataMode("admin_assisted")}
                className={`${styles.modeOptionCard} ${
                  dataMode === "admin_assisted" ? styles.modeOptionCardActive : ""
                }`}
              >
                <div className={styles.modeOptionTop}>
                  <div className={styles.modeIconBox}>
                    <MessageCircleIcon size={22} />
                  </div>
                  <span className={styles.modeSelectionBadge}>
                    {dataMode === "admin_assisted" ? "Aktif Dipilih" : "Pilihan 2"}
                  </span>
                </div>
                <h3 className={styles.modeOptionTitle}>Customize oleh Admin (via WhatsApp)</h3>
                <p className={styles.modeOptionDesc}>
                  Lebih santai! Kirimkan data dan foto Anda melalui chat WhatsApp. Tim spesialis kami yang akan
                  menginput dan menyesuaikan undangan Anda.
                </p>
              </button>
            </div>

            {/* Mode Content */}
            {dataMode === "self_service" ? (
              <PortalVariableForm
                token={token}
                groups={data.variableGroups}
                initialValues={data.variableValues}
                initialErrors={data.variableErrors}
                previewUrl={data.previewUrl}
                bankVerification={data.bankVerification}
                onSwitchToAdmin={() => setDataMode("admin_assisted")}
                onSaved={() => {
                  showToast("Data undangan berhasil disimpan!");
                }}
              />
            ) : (
              <PortalAdminSupportCard
                order={data.order}
                templateTitle={data.templateTitle}
                supportContact={data.supportContact}
                token={token}
                onSwitchToSelfService={() => setDataMode("self_service")}
              />
            )}
          </div>
        )}

        {/* --- TAB 0.5: GALERI FOTO UNDANGAN --- */}
        {activeTab === "gallery" && (
          <PortalGalleryManager
            token={token}
            initialItems={galleryItems}
            initialEnabled={data.galleryEnabled ?? true}
            previewUrl={data.previewUrl}
            onSaved={(newItems, enabled) => {
              setGalleryItems(newItems);
              showToast(
                enabled
                  ? "Galeri foto berhasil disimpan!"
                  : "Pengaturan galeri disimpan (galeri dinonaktifkan).",
              );
            }}
          />
        )}

        {/* --- TAB 0.7: MUSIK & BACKSOUND UNDANGAN --- */}
        {activeTab === "audio" && (
          <PortalBacksoundManager
            token={token}
            initialAudio={audioSettings}
            previewUrl={data.previewUrl}
            onSaved={(newAudio) => {
              setAudioSettings(newAudio);
              showToast(
                newAudio.enabled
                  ? `Musik "${newAudio.title || "Lagu Pilihan"}" berhasil disimpan!`
                  : "Musik latar berhasil dinonaktifkan.",
              );
            }}
          />
        )}

        {/* --- TAB 0.8: ATUR SECTION UNDANGAN --- */}
        {activeTab === "sections" && (
          <PortalSectionManager
            token={token}
            sections={data.sections || []}
            disabledSections={data.disabledSections || []}
            onNotification={(msg) => showToast(msg)}
          />
        )}

        {/* --- TAB 1: REVIEW UNDANGAN --- */}
        {activeTab === "review" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#ffffff",
                border: "1px solid #eae3d9",
                borderRadius: "14px",
                padding: "0.85rem 1.15rem",
                marginBottom: "1.25rem",
                flexWrap: "wrap",
                gap: "0.75rem",
                boxShadow: "0 2px 8px rgba(44, 34, 30, 0.02)",
              }}
            >
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "#63554f",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span style={{ color: "#c59b27" }}>
                  <LightbulbIcon size={18} />
                </span>
                <span>Ingin memperbarui nama pengantin, waktu, atau lokasi acara?</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("data")}
                className={styles.btnSecondary}
                style={{ fontSize: "0.8rem", padding: "0.45rem 0.95rem", minHeight: "38px" }}
              >
                <FileTextIcon size={14} />
                <span>Ubah Data Undangan</span>
              </button>
            </div>

            {orderProductionStatus === "client_review" && (
              <div className={styles.reviewNotice}>
                <strong>Mohon Periksa Undangan Anda:</strong>
                <p style={{ margin: "0.35rem 0 0" }}>
                  Periksa nama mempelai, gelar, tanggal, jam akad/resepsi, dan peta lokasi di bawah.
                  Jika sudah sempurna, klik <strong>&ldquo;Setujui Undangan&rdquo;</strong>. Jika ada yang ingin diperbaiki,
                  klik <strong>&ldquo;Ajukan Catatan Revisi&rdquo;</strong>.
                </p>
              </div>
            )}

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Pratinjau Undangan Langsung</h2>
                  <p className={styles.cardDesc}>Tampilan nyata undangan Anda di layar smartphone</p>
                </div>
                {data.shareableUrl && (
                  <a
                    href={data.shareableUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.btnSecondary}
                    style={{ fontSize: "0.8rem", padding: "0.45rem 0.95rem", minHeight: "38px" }}
                  >
                    <span>Buka Halaman Penuh</span>
                    <ExternalLinkIcon size={14} />
                  </a>
                )}
              </div>

              <div className={styles.previewBox}>
                <div className={styles.mockupViewport}>
                  {data.previewUrl ? (
                    <iframe
                      src={data.previewUrl}
                      title="Pratinjau Undangan"
                      className={styles.mockupIframe}
                    />
                  ) : (
                    <div className={styles.emptyBox}>
                      Pratinjau desain sedang dipersiapkan oleh tim produksi.
                    </div>
                  )}
                </div>

                {orderProductionStatus === "client_review" && (
                  <div className={styles.reviewActions}>
                    {!showRevisionForm ? (
                      <div style={{ display: "flex", gap: "0.75rem", width: "100%", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={handleApprove}
                          disabled={isPending}
                          className={`${styles.btnPrimary} ${styles.btnApprove}`}
                          style={{ flex: 1, minWidth: "160px" }}
                        >
                          <CheckIcon size={18} />
                          <span>Setujui Undangan</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRevisionForm(true)}
                          disabled={isPending}
                          className={`${styles.btnSecondary} ${styles.btnRevision}`}
                          style={{ flex: 1, minWidth: "160px" }}
                        >
                          <Edit3Icon size={16} />
                          <span>Ajukan Catatan Revisi</span>
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleRequestRevision} style={{ width: "100%" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "0.85rem",
                            fontWeight: 700,
                            marginBottom: "0.5rem",
                            color: "#2c2523",
                          }}
                        >
                          Tuliskan catatan perbaikan secara spesifik:
                        </label>
                        <textarea
                          rows={3}
                          className={styles.textarea}
                          placeholder="Contoh: Tolong ejaan nama orang tua mempelai pria diperbaiki menjadi H. Sulaiman, M.Pd"
                          value={revisionNote}
                          onChange={(e) => setRevisionNote(e.target.value)}
                          required
                        />
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                          <button
                            type="submit"
                            disabled={isPending}
                            className={styles.btnPrimary}
                            style={{ flex: 1 }}
                          >
                            Kirim Catatan Revisi
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowRevisionForm(false)}
                            className={styles.btnSecondary}
                          >
                            Batal
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 2: DAFTAR TAMU --- */}
        {activeTab === "guests" && (
          <div>
            {/* Format Pesan WhatsApp Dinamis */}
            <PortalShareMessageCard
              token={token}
              presets={data.shareMessageTemplates}
              activeTemplate={customShareMessage}
              eventDetails={{
                eventTitle: coupleTitle,
                eventDate: eventDateStr || undefined,
                eventLocation: data.order?.eventLocation || undefined,
              }}
              shareableUrl={data.shareableUrl}
              onTemplateChange={(newTmpl) => setCustomShareMessage(newTmpl)}
              onShowToast={showToast}
            />

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Manajemen Daftar Tamu</h2>
                  <p className={styles.cardDesc}>
                    Tambahkan nama tamu untuk membuat link undangan personal dan bagikan via WhatsApp
                  </p>
                </div>
              </div>

              {/* Input Tambah Tamu */}
              <form onSubmit={handleAddGuest} className={styles.guestInputRow}>
                <input
                  type="text"
                  placeholder="Nama Tamu (misal: Bpk. Bambang & Keluarga)"
                  value={newGuestName}
                  onChange={(e) => setNewGuestName(e.target.value)}
                  className={styles.input}
                  required
                />
                <input
                  type="number"
                  min="1"
                  max="20"
                  placeholder="Pax"
                  value={newGuestPax}
                  onChange={(e) => setNewGuestPax(e.target.value)}
                  className={styles.inputPax}
                  title="Jumlah orang (pax)"
                />
                <button
                  type="submit"
                  disabled={isPending}
                  className={styles.btnPrimary}
                >
                  <UserPlusIcon size={16} />
                  <span>Tambah Tamu</span>
                </button>
              </form>

              {/* Filter Search */}
              {data.guests.length > 3 && (
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ position: "relative" }}>
                    <input
                      type="search"
                      placeholder="Cari nama tamu…"
                      value={guestSearch}
                      onChange={(e) => setGuestSearch(e.target.value)}
                      className={styles.input}
                      style={{ width: "100%", paddingLeft: "2.4rem" }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        left: "0.85rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#8c7d6f",
                        pointerEvents: "none",
                        display: "flex",
                      }}
                    >
                      <SearchIcon size={16} />
                    </span>
                  </div>
                </div>
              )}

              {/* List Tamu */}
              {filteredGuests.length === 0 ? (
                <div className={styles.emptyBox}>
                  {data.guests.length === 0
                    ? "Belum ada tamu yang ditambahkan. Masukkan nama tamu di atas untuk mulai membagikan undangan."
                    : "Tidak ditemukan tamu dengan nama tersebut."}
                </div>
              ) : (
                <div className={styles.guestList}>
                  {filteredGuests.map((g) => (
                    <div key={g.id} className={styles.guestItem}>
                      <div className={styles.guestInfo}>
                        <span className={styles.guestName}>{g.name}</span>
                        <span className={styles.guestSubtext}>
                          Maks. {g.maxParty} orang (pax)
                        </span>
                      </div>

                      <div className={styles.guestActions}>
                        <button
                          type="button"
                          onClick={() => handleCopyGuestLink(g.name)}
                          className={styles.btnSecondary}
                          style={{ fontSize: "0.78rem", padding: "0.45rem 0.8rem", minHeight: "38px" }}
                          title="Salin tautan link web undangan saja"
                        >
                          <LinkIcon size={14} />
                          <span>Salin Link</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyFullMessage(g.name)}
                          className={styles.btnSecondary}
                          style={{ fontSize: "0.78rem", padding: "0.45rem 0.8rem", minHeight: "38px" }}
                          title="Salin teks pesan lengkap beserta nama tamu dan link"
                        >
                          <CopyIcon size={14} />
                          <span>Salin Pesan</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendWa(g.name)}
                          className={styles.btnCopyWa}
                          title="Buka WhatsApp dengan pesan yang sudah terisi otomatis"
                        >
                          <WhatsAppIcon size={15} />
                          <span>Kirim WA</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGuest(g.id, g.name)}
                          className={styles.btnDeleteGuest}
                          title="Hapus tamu"
                        >
                          <Trash2Icon size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 3: KONFIRMASI RSVP --- */}
        {activeTab === "rsvp" && (
          <div>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statNumber}>{data.rsvps.length}</div>
                <div className={styles.statLabel}>Total Konfirmasi</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statNumber} style={{ color: "#059669" }}>
                  {attendingRsvps.length}
                </div>
                <div className={styles.statLabel}>Hadir</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statNumber} style={{ color: "#dc2626" }}>
                  {notAttendingRsvps.length}
                </div>
                <div className={styles.statLabel}>Berhalangan</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statNumber} style={{ color: "#8c6d37" }}>
                  {totalPaxAttending}
                </div>
                <div className={styles.statLabel}>Total Orang (Pax)</div>
              </div>
            </div>

            <div className={styles.card}>
              <div
                className={styles.cardHeader}
                style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "0.75rem", alignItems: "center" }}
              >
                <div>
                  <h2 className={styles.cardTitle}>Daftar Respon Tamu</h2>
                  <p className={styles.cardDesc}>
                    {data.rsvps.length} konfirmasi tercatat dari tamu undangan
                  </p>
                </div>
                {/* Filter buttons */}
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setRsvpFilter("all")}
                    className={styles.tabBtn}
                    style={{
                      padding: "0.4rem 0.8rem",
                      fontSize: "0.8rem",
                      borderRadius: "9999px",
                      minHeight: "38px",
                      background: rsvpFilter === "all" ? "#2c2523" : "#ffffff",
                      borderColor: rsvpFilter === "all" ? "#2c2523" : "#eae3d9",
                      color: rsvpFilter === "all" ? "#faf8f5" : "#63554f",
                      fontWeight: rsvpFilter === "all" ? 700 : 500,
                      border: "1px solid",
                    }}
                  >
                    Semua ({data.rsvps.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRsvpFilter("attending")}
                    className={styles.tabBtn}
                    style={{
                      padding: "0.4rem 0.8rem",
                      fontSize: "0.8rem",
                      borderRadius: "9999px",
                      minHeight: "38px",
                      background: rsvpFilter === "attending" ? "#ecfdf5" : "#ffffff",
                      borderColor: rsvpFilter === "attending" ? "#059669" : "#eae3d9",
                      color: rsvpFilter === "attending" ? "#065f46" : "#63554f",
                      fontWeight: rsvpFilter === "attending" ? 700 : 500,
                      border: "1px solid",
                    }}
                  >
                    Hadir ({attendingRsvps.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRsvpFilter("not_attending")}
                    className={styles.tabBtn}
                    style={{
                      padding: "0.4rem 0.8rem",
                      fontSize: "0.8rem",
                      borderRadius: "9999px",
                      minHeight: "38px",
                      background: rsvpFilter === "not_attending" ? "#fff1f2" : "#ffffff",
                      borderColor: rsvpFilter === "not_attending" ? "#dc2626" : "#eae3d9",
                      color: rsvpFilter === "not_attending" ? "#dc2626" : "#63554f",
                      fontWeight: rsvpFilter === "not_attending" ? 700 : 500,
                      border: "1px solid",
                    }}
                  >
                    Berhalangan ({notAttendingRsvps.length})
                  </button>
                </div>
              </div>

              {/* Search bar */}
              {data.rsvps.length > 2 && (
                <div style={{ marginBottom: "1rem", position: "relative" }}>
                  <input
                    type="search"
                    placeholder="Cari nama tamu atau pesan RSVP..."
                    value={rsvpSearch}
                    onChange={(e) => setRsvpSearch(e.target.value)}
                    className={styles.input}
                    style={{ width: "100%", paddingLeft: "2.4rem" }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      left: "0.85rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#8c7d6f",
                      pointerEvents: "none",
                      display: "flex",
                    }}
                  >
                    <SearchIcon size={16} />
                  </span>
                </div>
              )}

              {filteredRsvps.length === 0 ? (
                <div className={styles.emptyBox}>
                  {data.rsvps.length === 0
                    ? "Belum ada tamu yang mengisi konfirmasi kehadiran (RSVP)."
                    : "Tidak ada data respon yang cocok dengan filter atau pencarian."}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  {filteredRsvps.map((r) => (
                    <div key={r.id} className={styles.wishCard}>
                      <div className={styles.wishHeader}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span className={styles.wishAuthor}>{r.name}</span>
                          {r.createdAt && (
                            <span style={{ fontSize: "0.72rem", color: "#8c7d6f" }}>
                              {formatRsvpDate(r.createdAt)}
                            </span>
                          )}
                        </div>
                        <span
                          className={styles.portalBadge}
                          style={{
                            backgroundColor: r.response === "attending" ? "#ecfdf5" : "#fff1f2",
                            color: r.response === "attending" ? "#065f46" : "#dc2626",
                            borderColor: r.response === "attending" ? "#a7f3d0" : "#fecdd3",
                          }}
                        >
                          {r.response === "attending"
                            ? `Hadir (${r.partySize} orang)`
                            : "Berhalangan"}
                        </span>
                      </div>
                      {r.message && <p className={styles.wishMessage}>&ldquo;{r.message}&rdquo;</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 4: BUKU DOA & UCAPAN --- */}
        {activeTab === "wishes" && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>Buku Doa & Ucapan Restu</h2>
                <p className={styles.cardDesc}>Pesan dan doa restu hangat dari para tamu undangan</p>
              </div>
            </div>

            {wishesList.length === 0 ? (
              <div className={styles.emptyBox}>
                Belum ada ucapan dan doa yang dikirimkan oleh tamu undangan.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {wishesList.map((w) => (
                  <div key={w.id} className={styles.wishCard}>
                    <div className={styles.wishHeader}>
                      <span className={styles.wishAuthor}>{w.name}</span>
                      <span className={styles.wishDate}>
                        {new Date(w.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                    <p className={styles.wishMessage}>&ldquo;{w.message}&rdquo;</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
