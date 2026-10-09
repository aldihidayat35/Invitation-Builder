"use client";

import styles from "./runtime.module.css";
import { WidgetFrame, type WidgetStyleProps } from "./WidgetFrame";

export interface WishItem {
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
    message: "Selamat menempuh hidup baru! Semoga menjadi keluarga yang sakinah, mawaddah, warahmah. Bahagia selalu! 💕",
    presence: "hadir",
    date: "Baru saja",
  },
  {
    name: "Budi Santoso",
    message: "Happy wedding brother! Lancar jaya acaranya sampai hari H. Doa terbaik untuk kalian berdua!",
    presence: "hadir",
    date: "1 jam lalu",
  },
  {
    name: "Maya Indah",
    message: "Selamat ya kalian berdua! Maaf belum bisa hadir langsung karena masih dinas, tapi doa restu kami selalu menyertai kalian.",
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
  const wishesList = parseWishItems(items);
  const heading = s(title) || "Ucapan & Doa Restu";
  const sub = s(subtitle) || "Doa restu Anda adalah kebahagiaan bagi kami";
  const variant = style?.variant ?? "chat-bubbles";
  const limit = typeof maxDisplay === "number" && maxDisplay > 0 ? maxDisplay : 10;
  const displayedWishes = wishesList.slice(0, limit);

  return (
    <WidgetFrame type="wishes" style={style} className={`${styles.wishesWidget} ${styles[`wishes_${variant}`] ?? ""}`}>
      {/* Header */}
      <div className={styles.wishesHeader}>
        <h3 className={styles.wishesHeading}>{heading}</h3>
        {sub && <p className={styles.wishesSubheading}>{sub}</p>}
      </div>

      {/* Daftar Pesan Bergulir */}
      <div className={styles.wishesFeed} data-variant={variant}>
        {displayedWishes.map((item, idx) => {
          const isHadir = item.presence?.toLowerCase() === "hadir";
          const avatarBg = getAvatarBg(item.name);
          const initials = getInitials(item.name);

          return (
            <div key={`${item.name}-${idx}`} className={styles.wishCard}>
              <div className={styles.wishAvatar} style={{ backgroundColor: avatarBg }}>
                {initials}
              </div>
              <div className={styles.wishContent}>
                <div className={styles.wishTopBar}>
                  <strong className={styles.wishAuthor}>{item.name}</strong>
                  <div className={styles.wishMeta}>
                    <span className={`${styles.wishBadge} ${isHadir ? styles.badgeHadir : styles.badgeBerhalangan}`}>
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
      </div>
    </WidgetFrame>
  );
}
