"use client";

import { useEffect, useState } from "react";
import { usePublicContext } from "./PublicContext";
import styles from "./runtime.module.css";
import { WidgetFrame, type WidgetStyleProps } from "./WidgetFrame";

export interface WishItem {
  readonly id?: string;
  readonly name: string;
  readonly message: string;
  readonly presence?: "hadir" | "berhalangan" | "ragu" | string;
  readonly date?: string;
  readonly avatar?: string;
}

export interface WishesWidgetProps {
  readonly title?: unknown;
  readonly subtitle?: unknown;
  readonly items?: unknown;
  readonly allowPost?: unknown;
  readonly maxDisplay?: unknown;
  readonly style?: WidgetStyleProps | undefined;
}

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

const DEFAULT_WISHES: readonly WishItem[] = [
  {
    name: "Dina & Rian",
    message:
      "Selamat menempuh hidup baru! Semoga menjadi keluarga yang sakinah, mawaddah, warahmah. Bahagia selalu! 💕",
    presence: "hadir",
    date: "Baru saja",
  },
  {
    name: "Budi Santoso",
    message:
      "Happy wedding brother! Lancar jaya acaranya sampai hari H. Doa terbaik untuk kalian berdua!",
    presence: "hadir",
    date: "1 jam lalu",
  },
  {
    name: "Maya Indah",
    message:
      "Selamat ya kalian berdua! Maaf belum bisa hadir langsung karena masih dinas, tapi doa restu kami selalu menyertai kalian.",
    presence: "berhalangan",
    date: "3 jam lalu",
  },
];

export function parseWishItems(items: unknown): WishItem[] {
  if (!Array.isArray(items)) return [...DEFAULT_WISHES];
  const out: WishItem[] = [];
  for (const raw of items) {
    if (typeof raw !== "object" || raw === null) continue;
    const rec = raw as Record<string, unknown>;
    const name = s(rec.name);
    const message = s(rec.message);
    if (!name && !message) continue;
    out.push({
      id: s(rec.id) || undefined,
      name: name || "Tamu Undangan",
      message: message || "Selamat berbahagia!",
      presence: s(rec.presence) || "hadir",
      date: s(rec.date) || "Baru saja",
      avatar: s(rec.avatar) || undefined,
    });
  }
  return out.length > 0 ? out : [...DEFAULT_WISHES];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0];
  const second = parts[1];
  if (first && second && first[0] && second[0]) {
    return (first[0] + second[0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "TU";
}

const AVATAR_COLORS = [
  "#be185d",
  "#9333ea",
  "#2563eb",
  "#059669",
  "#d97706",
  "#e11d48",
  "#4f46e5",
  "#0d9488",
];

function getAvatarBg(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index]!;
}

export function WishesWidget({
  title,
  subtitle,
  items,
  maxDisplay,
  style,
}: WishesWidgetProps) {
  const ctx = usePublicContext();
  const heading = s(title) || "Ucapan & Doa Restu";
  const sub = s(subtitle) || "Doa restu Anda adalah kebahagiaan bagi kami";
  const variant = style?.variant ?? "chat-bubbles";
  const defaultPageSize = typeof maxDisplay === "number" && maxDisplay > 0 ? maxDisplay : 10;

  // In editor mode (no public context): display template/sample items
  const editorWishes = parseWishItems(items);

  // In live public mode: fetch from RSVP database and listen for new live submissions
  const [liveWishes, setLiveWishes] = useState<WishItem[]>([]);
  const [loading, setLoading] = useState(Boolean(ctx?.slug));
  const [displayedCount, setDisplayedCount] = useState(defaultPageSize);

  useEffect(() => {
    if (!ctx?.slug) return;
    let mounted = true;

    async function fetchLiveWishes() {
      try {
        const res = await fetch(`/api/public/wishes?slug=${encodeURIComponent(ctx!.slug)}`);
        if (res.ok) {
          const data = (await res.json()) as { ok?: boolean; wishes?: WishItem[] };
          if (mounted && Array.isArray(data.wishes)) {
            setLiveWishes(data.wishes);
          }
        }
      } catch (err) {
        console.error("Failed to load wishes:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void fetchLiveWishes();

    function handleRsvpEvent(e: Event) {
      const customEvent = e as CustomEvent<{
        name: string;
        presence: string;
        message: string;
        date?: string;
      }>;
      const detail = customEvent.detail;
      if (detail && detail.message && detail.message.trim().length > 0) {
        setLiveWishes((prev) => [
          {
            id: `local-${Date.now()}`,
            name: detail.name || "Tamu Undangan",
            presence: detail.presence || "hadir",
            message: detail.message.trim(),
            date: detail.date || "Baru saja",
          },
          ...prev,
        ]);
      }
    }

    window.addEventListener("dib:rsvp-submitted", handleRsvpEvent);
    return () => {
      mounted = false;
      window.removeEventListener("dib:rsvp-submitted", handleRsvpEvent);
    };
  }, [ctx?.slug]);

  // Which list to show?
  const isPublic = Boolean(ctx);
  const activeWishes = isPublic ? liveWishes : editorWishes;
  const displayedWishes = activeWishes.slice(0, displayedCount);

  return (
    <WidgetFrame
      type="wishes"
      style={style}
      className={`${styles.wishesWidget} ${styles[`wishes_${variant}`] ?? ""}`}
    >
      {/* Header */}
      <div className={styles.wishesHeader}>
        <h3 className={styles.wishesHeading}>{heading}</h3>
        {sub && <p className={styles.wishesSubheading}>{sub}</p>}
      </div>

      {/* Loading state in public mode */}
      {isPublic && loading ? (
        <div className={styles.wishesSkeleton}>
          <div className={styles.wishesSkeletonCard} />
          <div className={styles.wishesSkeletonCard} />
          <div className={styles.wishesSkeletonCard} />
        </div>
      ) : isPublic && activeWishes.length === 0 ? (
        /* Empty state in public mode */
        <div className={styles.wishesEmptyState}>
          <div className={styles.wishesEmptyIcon}>💌</div>
          <p className={styles.wishesEmptyTitle}>Belum Ada Doa & Ucapan</p>
          <p className={styles.wishesEmptySub}>
            Jadilah yang pertama memberikan doa restu untuk kedua mempelai melalui formulir konfirmasi
            di atas.
          </p>
        </div>
      ) : (
        /* Feed of Wishes */
        <div className={styles.wishesFeed} data-variant={variant}>
          {displayedWishes.map((item, idx) => {
            const isHadir = item.presence?.toLowerCase() === "hadir";
            const avatarBg = getAvatarBg(item.name);
            const initials = getInitials(item.name);

            return (
              <div key={item.id || `${item.name}-${idx}`} className={styles.wishCard}>
                <div className={styles.wishAvatar} style={{ backgroundColor: avatarBg }}>
                  {initials}
                </div>
                <div className={styles.wishContent}>
                  <div className={styles.wishTopBar}>
                    <strong className={styles.wishAuthor}>{item.name}</strong>
                    <div className={styles.wishMeta}>
                      <span
                        className={`${styles.wishBadge} ${
                          isHadir ? styles.badgeHadir : styles.badgeBerhalangan
                        }`}
                      >
                        {isHadir ? "Hadir" : "Berhalangan"}
                      </span>
                      {item.date && <span className={styles.wishDate}>{item.date}</span>}
                    </div>
                  </div>
                  <p className={styles.wishMessage}>{item.message}</p>
                </div>
              </div>
            );
          })}

          {/* Load More Button */}
          {activeWishes.length > displayedCount && (
            <button
              type="button"
              onClick={() => setDisplayedCount((prev) => prev + 10)}
              className={styles.wishesLoadMoreBtn}
            >
              <span>🔽</span>
              <span>Lihat Ucapan Lainnya ({activeWishes.length - displayedCount} tersisa)</span>
            </button>
          )}
        </div>
      )}
    </WidgetFrame>
  );
}

