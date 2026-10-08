"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import type { AppSettingsData } from "@/features/dashboard-layout";
import type { CatalogTemplateItem } from "@/features/templates/types";
import "./landing.css";

export interface TemplateItem {
  id: number | string;
  name: string;
  category: string;
  person1: string;
  person2: string;
  date: string;
  price: number;
  theme: "ivory" | "dark" | "terracotta" | "sage" | "blush";
  image?: string;
}

export interface ReviewItem {
  initial: string;
  name: string;
  type: string;
  quote: string;
  shade: string;
}

const TEMPLATES: TemplateItem[] = [
  {
    id: 1,
    name: "Classic Floral",
    category: "Pernikahan",
    person1: "Aulia",
    person2: "Fikri",
    date: "20 . 04 . 2026",
    price: 89000,
    theme: "ivory",
    image: "/images/template-botanical.jpg",
  },
  {
    id: 2,
    name: "Royal Elegant",
    category: "Pernikahan",
    person1: "Raka",
    person2: "Salsabila",
    date: "12 . 05 . 2026",
    price: 119000,
    theme: "dark",
    image: "/images/template-jawa.jpg",
  },
  {
    id: 3,
    name: "Modern Minimal",
    category: "Pernikahan",
    person1: "Nadya",
    person2: "Reza",
    date: "18 . 06 . 2026",
    price: 99000,
    theme: "terracotta",
    image: "/images/template-boho.jpg",
  },
  {
    id: 4,
    name: "Garden Beauty",
    category: "Pernikahan",
    person1: "Putri",
    person2: "Dimas",
    date: "22 . 06 . 2026",
    price: 99000,
    theme: "sage",
    image: "",
  },
  {
    id: 5,
    name: "Serene Promise",
    category: "Tunangan",
    person1: "Andini",
    person2: "Fahri",
    date: "12 . 11 . 2026",
    price: 79000,
    theme: "blush",
    image: "",
  },
  {
    id: 6,
    name: "Sweet Seventeen",
    category: "Ulang Tahun",
    person1: "Nadira",
    person2: "",
    date: "21 . 12 . 2026",
    price: 69000,
    theme: "blush",
    image: "",
  },
  {
    id: 7,
    name: "Little Blessing",
    category: "Aqiqah",
    person1: "Muhammad",
    person2: "Alfatih",
    date: "10 . 01 . 2027",
    price: 79000,
    theme: "sage",
    image: "",
  },
  {
    id: 8,
    name: "Syukur dan Bahagia",
    category: "Tasyakuran",
    person1: "Keluarga",
    person2: "Bahagia",
    date: "16 . 01 . 2027",
    price: 69000,
    theme: "ivory",
    image: "",
  },
  {
    id: 9,
    name: "Golden Celebration",
    category: "Event Lainnya",
    person1: "Grand",
    person2: "Opening",
    date: "24 . 02 . 2027",
    price: 89000,
    theme: "dark",
    image: "/images/template-editorial.jpg",
  },
];

const REVIEWS: ReviewItem[] = [
  {
    initial: "NP",
    name: "Nabila Putri",
    type: "Pelanggan Premium",
    quote: "Templatenya super cantik dan gampang diedit. Tamu-tamu juga suka banget!",
    shade: "#e7c9b3",
  },
  {
    initial: "RP",
    name: "Rizky Pratama",
    type: "Pelanggan Premium",
    quote: "Desainnya elegan, prosesnya cepat, hasilnya luar biasa. Highly recommended!",
    shade: "#d5c5b2",
  },
  {
    initial: "AR",
    name: "Anisa Rahma",
    type: "Pelanggan Premium",
    quote: "Banyak pilihan template yang unik dan modern. Suka banget!",
    shade: "#e7cbc3",
  },
  {
    initial: "AF",
    name: "Aisyah Fitri",
    type: "Pengguna Undangan",
    quote: "Saya menemukan tema yang cocok untuk keluarga. Tampilannya sangat rapi.",
    shade: "#d9c9ac",
  },
];

const THEME_COLORS = {
  ivory: { a: "#f4ede0", b: "#dfcebd", ink: "#744b36", stem: "#a48964", flower: "#faf8f2" },
  dark: { a: "#192324", b: "#10191a", ink: "#e2c290", stem: "#b28444", flower: "#b99a6b" },
  terracotta: { a: "#c7a080", b: "#a06f53", ink: "#583b2b", stem: "#ae7e5d", flower: "#f4ded0" },
  sage: { a: "#f2efe2", b: "#d6dfd2", ink: "#685b42", stem: "#80927a", flower: "#fff9eb" },
  blush: { a: "#f7e9e5", b: "#e6cec9", ink: "#8f5756", stem: "#ab827e", flower: "#fff8f3" },
};

function escapeXML(s: string): string {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c] || c,
  );
}

function svgPreview(t: TemplateItem): string {
  const c = THEME_COLORS[t.theme] || THEME_COLORS.ivory;
  const key = `g${t.id}`;
  const simple = t.theme === "terracotta";
  const flower = (x: number, y: number, scale = 1) =>
    `<g transform="translate(${x} ${y}) scale(${scale})" fill="${c.flower}" stroke="${c.stem}" stroke-width=".6"><ellipse cy="-12" rx="7" ry="13"/><ellipse cy="12" rx="7" ry="13"/><ellipse cx="-12" rx="13" ry="7"/><ellipse cx="12" rx="13" ry="7"/><circle r="6" fill="${c.stem}" stroke="none"/></g>`;
  const branch = (x: number, y: number, dir = 1) =>
    `<g transform="translate(${x} ${y}) scale(${dir} 1)" fill="none" stroke="${c.stem}" opacity=".9"><path d="M0 0C38 -57 40 -137 88 -205" stroke-width="2.2"/><path d="M19-33Q-13-70 -8-100M33-75Q67-113 78-124M54-125Q21-153 24-174M74-179Q97-191 108-205" stroke-width="1.3"/><g fill="${c.stem}" stroke="none" opacity=".8"><ellipse cx="-3" cy="-96" rx="7" ry="19" transform="rotate(-35 -3 -96)"/><ellipse cx="73" cy="-118" rx="7" ry="16" transform="rotate(43 73 -118)"/><ellipse cx="25" cy="-170" rx="7" ry="19" transform="rotate(-24 25 -170)"/><ellipse cx="101" cy="-206" rx="6" ry="15" transform="rotate(33 101 -206)"/></g></g>`;
  const title =
    t.category === "Pernikahan"
      ? "THE WEDDING OF"
      : t.category === "Tunangan"
        ? "THE ENGAGEMENT OF"
        : t.category === "Aqiqah"
          ? "TASYAKURAN AQIQAH"
          : t.category === "Ulang Tahun"
            ? "SWEET CELEBRATION"
            : t.category === "Tasyakuran"
              ? "ACARA TASYAKURAN"
              : "SPECIAL INVITATION";
  const art = simple
    ? `<path d="M75 428V155A95 95 0 0 1 265 155V428" fill="#edc8a8" fill-opacity=".45" stroke="#f5e0cd" stroke-width="4"/><path d="M94 426V155A76 76 0 0 1 246 155V426" fill="#f7e6d8" fill-opacity=".35"/>`
    : `<path d="M46 425V124A124 124 0 0 1 294 124V425" fill="none" stroke="${c.stem}" stroke-opacity=".37" stroke-width="2"/><path d="M62 416V126A108 108 0 0 1 278 126V416" fill="none" stroke="${c.stem}" stroke-opacity=".25" stroke-width="1"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="455" viewBox="0 0 340 455"><defs><linearGradient id="${key}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${c.a}"/><stop offset="1" stop-color="${c.b}"/></linearGradient><filter id="noise${key}"><feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="2" seed="3" stitchTiles="stitch"/></filter></defs><rect width="340" height="455" fill="url(#${key})"/><rect width="340" height="455" filter="url(#noise${key})" opacity=".075"/>${art}
  <g opacity="${simple ? 0.45 : 1}">${branch(-8, 455, 1)}${branch(348, 455, -1)}${branch(-5, 260, 1)}${branch(345, 260, -1)}${flower(52, 363, 0.7)}${flower(294, 350, 0.85)}${flower(68, 130, 0.45)}${flower(285, 115, 0.47)}</g>
  <text x="170" y="162" text-anchor="middle" font-family="Georgia,serif" font-size="11" letter-spacing="3" fill="${c.ink}">${escapeXML(title)}</text>
  <text x="170" y="212" text-anchor="middle" font-family="Georgia,serif" font-size="34" font-style="italic" fill="${c.ink}">${escapeXML(t.person1)}</text>
  ${
    t.person2
      ? `<text x="170" y="244" text-anchor="middle" font-family="Georgia,serif" font-size="25" font-style="italic" fill="${c.ink}">&amp;</text><text x="170" y="278" text-anchor="middle" font-family="Georgia,serif" font-size="32" font-style="italic" fill="${c.ink}">${escapeXML(t.person2)}</text>`
      : ""
  }
  <path d="M140 313h60" stroke="${c.stem}" stroke-width="1" opacity=".7"/><text x="170" y="336" text-anchor="middle" font-family="Georgia,serif" font-size="11" letter-spacing="2" fill="${c.ink}">${escapeXML(t.date)}</text><text x="170" y="431" text-anchor="middle" font-family="Georgia,serif" font-size="8" letter-spacing="2" fill="${c.ink}" opacity=".6">DUMMY PREVIEW</text></svg>`;
}

function imageOf(t: TemplateItem): string {
  return t.image?.trim() || "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svgPreview(t));
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

interface LandingViewProps {
  currentUser?: { id: string; name: string; email: string } | null;
  appSettings?: AppSettingsData | null;
  catalogTemplates?: CatalogTemplateItem[] | null;
}

export function LandingView({ currentUser, appSettings, catalogTemplates }: LandingViewProps) {
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [favorites, setFavorites] = useState<Set<number | string>>(new Set());
  const [modalTemplate, setModalTemplate] = useState<TemplateItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const templateList: TemplateItem[] =
    catalogTemplates && catalogTemplates.length > 0
      ? catalogTemplates.map((c, idx) => ({
          id: c.id,
          name: c.name,
          category:
            c.category === "wedding"
              ? "Pernikahan"
              : c.category === "engagement"
                ? "Tunangan"
                : c.category === "birthday"
                  ? "Ulang Tahun"
                  : c.category === "aqiqah"
                    ? "Aqiqah"
                    : "Acara",
          person1: c.name.split(" ")[0] || "Mempelai",
          person2: c.name.split(" ")[1] || "",
          date: "2026",
          price: c.price || 89000,
          theme: c.style.includes("jawa")
            ? "dark"
            : c.style.includes("boho")
              ? "terracotta"
              : c.style.includes("sage")
                ? "sage"
                : "ivory",
          image: c.thumbnailUrl || "",
        }))
      : TEMPLATES;

  useEffect(() => {
    try {
      const stored = localStorage.getItem("undangan-demo-favorites");
      if (stored) {
        setFavorites(new Set(JSON.parse(stored)));
      }
    } catch {
      // Ignored
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modalTemplate) {
        setModalTemplate(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalTemplate]);

  const toggleFavorite = (id: number | string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem("undangan-demo-favorites", JSON.stringify([...next]));
      } catch {
        // Ignored
      }
      return next;
    });
  };

  const filteredTemplates = templateList.filter((t) => {
    const matchesCategory = selectedCategory === "Semua" || t.category === selectedCategory;
    const matchesSearch = `${t.name} ${t.category} ${t.person1} ${t.person2}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const visibleTemplates =
    showAll || selectedCategory !== "Semua" || searchTerm
      ? filteredTemplates
      : filteredTemplates.slice(0, 4);

  const displayedReviews = [0, 1, 2].map((n) => REVIEWS[(n + reviewIndex) % REVIEWS.length]!);

  return (
    <div className="landing-root">
      {/* Svg Symbol Sprite */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
      >
        <symbol id="i-search" viewBox="0 0 24 24">
          <circle cx="10.8" cy="10.8" r="7.1" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="m16.2 16.2 5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </symbol>
        <symbol id="i-arrow-right" viewBox="0 0 24 24">
          <path
            d="M4 12h16m-7-7 7 7-7 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>
        <symbol id="i-chevron-right" viewBox="0 0 24 24">
          <path
            d="m9 5 7 7-7 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>
        <symbol id="i-chevron-down" viewBox="0 0 24 24">
          <path
            d="m5 9 7 7 7-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>
        <symbol id="i-heart" viewBox="0 0 24 24">
          <path
            d="M20.7 4.7c-2.2-2.1-5.6-1.8-7.5.3L12 6.3l-1.2-1.3C8.9 2.9 5.5 2.6 3.3 4.7a5.7 5.7 0 0 0 0 8.1L12 21l8.7-8.2a5.7 5.7 0 0 0 0-8.1Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </symbol>
        <symbol id="i-users" viewBox="0 0 24 24">
          <circle cx="9" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M2.4 20v-2.1c0-3.2 2.8-5.2 6.6-5.2s6.6 2 6.6 5.2V20M16.2 5.4c2.1.1 3.5 1.7 3.5 3.5s-1.4 3.4-3.5 3.5M18 14c2.5.5 3.5 2.2 3.5 4V20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </symbol>
        <symbol id="i-file" viewBox="0 0 24 24">
          <path
            d="M6 2.7h8l4 4V21H6a2 2 0 0 1-2-2V4.7a2 2 0 0 1 2-2Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M14 2.7v5h4M8 12h7M8 16h7" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </symbol>
        <symbol id="i-star" viewBox="0 0 24 24">
          <path
            d="m12 2.3 3 6.2 6.8 1-4.9 4.8 1.2 6.9L12 18l-6.1 3.2 1.2-6.9-4.9-4.8 6.8-1L12 2.3Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </symbol>
        <symbol id="i-rings" viewBox="0 0 24 24">
          <circle cx="9" cy="12.5" r="6.1" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="15" cy="12.5" r="6.1" fill="none" stroke="currentColor" strokeWidth="1.7" />
        </symbol>
        <symbol id="i-leaf" viewBox="0 0 24 24">
          <path
            d="M5 20C5 10 10 4 21 3c-.3 12-6.7 17-16 17Zm0 0c3-5 8-10 14-13"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </symbol>
        <symbol id="i-cake" viewBox="0 0 24 24">
          <path
            d="M4 11h16v10H4zM4 16h16M8 7v4m4-4v4m4-4v4M8 5V3m4 2V3m4 2V3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </symbol>
        <symbol id="i-moon" viewBox="0 0 24 24">
          <path
            d="M20.4 15.6A9.1 9.1 0 0 1 8.4 3.5 9.2 9.2 0 1 0 20.4 15.6Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </symbol>
        <symbol id="i-gift" viewBox="0 0 24 24">
          <rect
            x="3"
            y="9"
            width="18"
            height="12"
            rx="1.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M2 9h20V6H2v3Zm10 0v12M12 6C8 .5 4 4.4 7 6h5Zm0 0c4-5.5 8-1.6 5 0h-5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </symbol>
        <symbol id="i-menu" viewBox="0 0 24 24">
          <path
            d="M4 6h16M4 12h16M4 18h16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </symbol>
        <symbol id="i-close" viewBox="0 0 24 24">
          <path
            d="M5 5 19 19M19 5 5 19"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </symbol>
        <symbol id="i-sparkle" viewBox="0 0 24 24">
          <path
            d="m12 2 2.1 7.9L22 12l-7.9 2.1L12 22l-2.1-7.9L2 12l7.9-2.1L12 2Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </symbol>
        <symbol id="i-mobile" viewBox="0 0 24 24">
          <rect
            x="6"
            y="2"
            width="12"
            height="20"
            rx="2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M10 18.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </symbol>
        <symbol id="i-settings" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3.3" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="m10.7 2 2.6 0 .7 2.5c.8.2 1.5.5 2.1.9l2.3-1.2 1.8 1.8L19 8.3c.4.7.7 1.4.9 2.1l2.1.7v2.6l-2.1.7c-.2.8-.5 1.5-.9 2.1l1.2 2.3-1.8 1.8-2.3-1.2c-.7.4-1.4.7-2.1.9l-.7 2.1h-2.6l-.7-2.1c-.8-.2-1.5-.5-2.1-.9l-2.3 1.2-1.8-1.8L5 16.5c-.4-.7-.7-1.4-.9-2.1L2 13.7v-2.6l2.1-.7c.2-.8.5-1.5.9-2.1L3.8 6l1.8-1.8 2.3 1.2c.7-.4 1.4-.7 2.1-.9L10.7 2Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
          />
        </symbol>
        <symbol id="i-send" viewBox="0 0 24 24">
          <path
            d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </symbol>
      </svg>

      {/* Header & Hero */}
      <header className="hero-bg text-white" id="beranda">
        <div className="hero-glow"></div>
        <nav
          className="relative z-30 mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-5 lg:px-0"
          aria-label="Navigasi utama"
        >
          <Link
            className="font-display text-[23px] font-bold tracking-[-.04em] text-white flex items-center gap-2.5"
            href="/"
          >
            {appSettings?.appLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={appSettings.appLogo}
                alt={appSettings.appName}
                className="h-8 w-auto max-w-[120px] object-contain rounded"
              />
            ) : null}
            <span>{appSettings?.appName || "Undangan.id"}</span>
          </Link>
          <div className="hidden items-center gap-9 text-[13px] font-medium text-[#e6e3df] md:flex">
            <a href="#beranda" className="border-b-2 border-[#b87831] pb-2 text-white">
              Beranda
            </a>
            <a href="#template" className="transition hover:text-[#d7a672]">
              Template
            </a>
            <a href="#harga" className="transition hover:text-[#d7a672]">
              Harga
            </a>
            <a href="#cara-kerja" className="transition hover:text-[#d7a672]">
              Cara Kerja
            </a>
            <a href="#testimoni" className="transition hover:text-[#d7a672]">
              Blog
            </a>
          </div>
          <div className="hidden items-center gap-4 md:flex">
            <button
              id="navSearch"
              aria-label="Cari template"
              type="button"
              onClick={() => {
                const el = document.getElementById("searchInput");
                el?.focus();
              }}
              className="grid h-10 w-10 place-items-center rounded-full border border-[#555653] hover:bg-white/10"
            >
              <svg className="h-[19px] w-[19px]">
                <use href="#i-search" />
              </svg>
            </button>

            {currentUser ? (
              <Link href="/dashboard" className="button-primary px-6 py-3 text-[12px]">
                Buka Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="button-outline px-6 py-3 text-[12px]">
                  Masuk
                </Link>
                <Link
                  href="/login?next=/dashboard"
                  className="button-primary px-6 py-3 text-[12px]"
                >
                  Daftar Gratis
                </Link>
              </>
            )}
          </div>

          <button
            id="mobileMenuBtn"
            type="button"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="grid h-10 w-10 place-items-center rounded-lg border border-[#5b5956] md:hidden"
            aria-label="Buka menu"
            aria-expanded={mobileNavOpen}
          >
            <svg className="h-6 w-6">
              <use href="#i-menu" />
            </svg>
          </button>
        </nav>

        {mobileNavOpen && (
          <div
            id="mobileNav"
            className="relative z-40 mx-5 mb-3 space-y-1 rounded-xl border border-white/10 bg-[#333333] p-4 text-sm md:hidden"
          >
            <div className="flex items-center gap-2 px-3 py-1 mb-2 border-b border-white/10 pb-2">
              {appSettings?.appLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={appSettings.appLogo}
                  alt={appSettings.appName}
                  className="h-6 w-auto object-contain rounded"
                />
              ) : null}
              <span className="font-display text-base font-bold text-white">
                {appSettings?.appName || "Undangan.id"}
              </span>
            </div>
            <a
              className="block rounded-lg px-3 py-2 hover:bg-white/10"
              href="#beranda"
              onClick={() => setMobileNavOpen(false)}
            >
              Beranda
            </a>
            <a
              className="block rounded-lg px-3 py-2 hover:bg-white/10"
              href="#template"
              onClick={() => setMobileNavOpen(false)}
            >
              Template
            </a>
            <a
              className="block rounded-lg px-3 py-2 hover:bg-white/10"
              href="#harga"
              onClick={() => setMobileNavOpen(false)}
            >
              Harga
            </a>
            <a
              className="block rounded-lg px-3 py-2 hover:bg-white/10"
              href="#cara-kerja"
              onClick={() => setMobileNavOpen(false)}
            >
              Cara Kerja
            </a>
            <Link
              href={currentUser ? "/dashboard" : "/login?next=/dashboard"}
              className="button-primary mt-2 block w-full px-4 py-3 text-center"
              onClick={() => setMobileNavOpen(false)}
            >
              {currentUser ? "Buka Dashboard" : "Daftar Gratis"}
            </Link>
          </div>
        )}

        <div className="relative z-10 mx-auto max-w-[1240px] px-5 pb-8 pt-4 md:pb-10 lg:px-0">
          <div className="relative z-20 max-w-[690px] pb-6 pt-3 md:pb-[42px] md:pt-8 lg:pt-10">
            <p className="eyebrow mb-3">UNDANGAN DIGITAL, LEBIH BERKESAN</p>
            <h1 className="font-display max-w-[680px] text-[42px] font-medium leading-[1.12] tracking-[-.045em] sm:text-[56px] lg:text-[59px]">
              Temukan Template
              <br /> Undangan <span className="text-[#c58b55]">Impianmu</span>
            </h1>
            <p className="mt-3 max-w-[535px] text-[14px] leading-[1.7] text-[#dddddc] sm:text-[15px]">
              Buat undangan digital yang elegan, praktis, dan penuh makna untuk momen spesialmu.
              Ribuan template siap digunakan.
            </p>

            <form
              id="searchForm"
              className="mt-5 flex h-[49px] max-w-[610px] items-center overflow-hidden rounded-lg bg-white p-1.5 shadow-[0_4px_18px_#0002]"
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                setShowAll(true);
                document.getElementById("template")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <svg className="ml-2 mr-2 h-5 w-5 shrink-0 text-[#2d2d2d]">
                <use href="#i-search" />
              </svg>
              <input
                id="searchInput"
                className="min-w-0 flex-1 border-0 bg-transparent text-[12px] text-[#2e2e2e] outline-none placeholder:text-[#969696]"
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari template undangan..."
                aria-label="Cari template"
              />
              <select
                id="heroCategory"
                aria-label="Pilih kategori"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="hidden max-w-[148px] border-l border-[#e7e7e7] bg-white pl-4 pr-1 text-[11px] text-[#5b5b5b] outline-none sm:block"
              >
                <option value="Semua">Semua Kategori</option>
                <option value="Pernikahan">Pernikahan</option>
                <option value="Tunangan">Tunangan</option>
                <option value="Ulang Tahun">Ulang Tahun</option>
                <option value="Aqiqah">Aqiqah</option>
                <option value="Tasyakuran">Tasyakuran</option>
                <option value="Event Lainnya">Event Lainnya</option>
              </select>
              <button
                type="submit"
                className="button-primary ml-2 h-[38px] shrink-0 px-3 text-[11px] sm:px-7"
              >
                Cari Template
              </button>
            </form>

            <div className="mt-[27px] grid max-w-[620px] grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
              <div className="flex items-center gap-3">
                <svg className="h-[29px] w-[29px] shrink-0 text-[#bd8b58]">
                  <use href="#i-users" />
                </svg>
                <div>
                  <div className="text-[17px] font-medium">250K+</div>
                  <div className="text-[10px] leading-4 text-[#b7b6b5]">Pengguna Aktif</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <svg className="h-[28px] w-[28px] shrink-0 text-[#bd8b58]">
                  <use href="#i-file" />
                </svg>
                <div>
                  <div className="text-[17px] font-medium">1.000+</div>
                  <div className="text-[10px] leading-4 text-[#b7b6b5]">Template Premium</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <svg className="h-[29px] w-[29px] shrink-0 text-[#bd8b58]">
                  <use href="#i-star" />
                </svg>
                <div>
                  <div className="text-[17px] font-medium">4.9/5</div>
                  <div className="text-[10px] leading-4 text-[#b7b6b5]">Dari 100K+ Review</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <svg className="h-[29px] w-[29px] shrink-0 text-[#bd8b58]">
                  <use href="#i-heart" />
                </svg>
                <div>
                  <div className="text-[17px] font-medium">99%</div>
                  <div className="text-[10px] leading-4 text-[#b7b6b5]">Puas dengan Hasil</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {/* Template Catalog & Categories */}
        <section className="border-b border-[#e8e7e5] bg-[#fafafa] py-[22px]" id="template">
          <div className="mx-auto grid max-w-[1240px] gap-6 px-5 lg:grid-cols-[2.05fr_1.1fr] lg:gap-7 lg:px-0">
            <div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="eyebrow !text-[#925003]">TEMPLATE PILIHAN</p>
                  <h2 className="font-display mt-1 text-[25px] font-semibold tracking-[-.035em] sm:text-[27px]">
                    Inspirasi Undangan Terpopuler
                  </h2>
                </div>
                <button
                  id="showAllBtn"
                  type="button"
                  onClick={() => setShowAll(!showAll)}
                  className="mb-1 inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[#925003] hover:underline"
                >
                  {showAll ? "Tampilkan Sedikit ↑" : "Lihat Semua →"}
                  <svg className="h-3 w-3">
                    <use href="#i-arrow-right" />
                  </svg>
                </button>
              </div>

              {(searchTerm || selectedCategory !== "Semua") && (
                <div
                  id="filterStatus"
                  className="mt-1 text-[11px] text-[#76716d]"
                  aria-live="polite"
                >
                  {filteredTemplates.length} template ditemukan
                  {selectedCategory !== "Semua" ? ` dalam kategori ${selectedCategory}` : ""}
                  {searchTerm ? ` untuk “${searchTerm}”` : ""}.
                </div>
              )}

              <div
                id="templateGrid"
                className="mt-[17px] grid grid-cols-2 gap-3 sm:grid-cols-4"
                aria-label="Katalog template undangan"
              >
                {visibleTemplates.map((t) => {
                  const isFav = favorites.has(t.id);
                  return (
                    <article key={t.id} className="template-card">
                      <div className="p-1.5 pb-0">
                        <div className="template-art">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imageOf(t)} alt={`Contoh template ${t.name}`} loading="lazy" />
                          <button
                            type="button"
                            className="heart-btn"
                            aria-label={`${isFav ? "Hapus dari favorit" : "Tambahkan ke favorit"}: ${t.name}`}
                            aria-pressed={isFav}
                            onClick={() => toggleFavorite(t.id)}
                          >
                            <svg
                              className="h-[17px] w-[17px]"
                              fill={isFav ? "currentColor" : "none"}
                            >
                              <use href="#i-heart" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-1 px-2.5 py-2.5">
                        <div className="min-w-0">
                          <h3 className="truncate text-[11px] font-bold">{t.name}</h3>
                          <p className="mt-0.5 text-[10px] text-[#97928e]">{t.category}</p>
                        </div>
                        <button
                          type="button"
                          className="arrow-circle shrink-0"
                          onClick={() => setModalTemplate(t)}
                          aria-label={`Lihat detail ${t.name}`}
                        >
                          <svg className="h-[14px] w-[14px]">
                            <use href="#i-chevron-right" />
                          </svg>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              {filteredTemplates.length === 0 && (
                <div
                  id="emptyState"
                  className="mt-4 rounded-xl border border-dashed border-[#d8d0c8] bg-[#faf7f2] p-8 text-center text-sm text-[#6a6159]"
                >
                  Tidak ada template yang cocok. Coba kata kunci lain.
                </div>
              )}
            </div>

            {/* Categories Grid */}
            <div
              className="border-t border-[#e9e5e1] pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"
              id="kategori"
            >
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="eyebrow !text-[#925003]">JELAJAHI KATEGORI</p>
                  <h2 className="font-display mt-1 text-[24px] font-semibold tracking-[-.035em] sm:text-[26px]">
                    Pilih Kategori Undangan
                  </h2>
                </div>
                <button
                  id="resetCategory"
                  type="button"
                  onClick={() => {
                    setSelectedCategory("Semua");
                    setSearchTerm("");
                  }}
                  className="mb-1 shrink-0 text-[11px] font-semibold text-[#925003] hover:underline"
                >
                  Lihat Semua →
                </button>
              </div>

              <div className="mt-[18px] grid grid-cols-3 gap-3" id="categoryGrid">
                {[
                  { name: "Pernikahan", icon: "#i-rings", count: "500+ template" },
                  { name: "Tunangan", icon: "#i-leaf", count: "120+ template" },
                  { name: "Ulang Tahun", icon: "#i-cake", count: "150+ template" },
                  { name: "Aqiqah", icon: "#i-moon", count: "90+ template" },
                  { name: "Tasyakuran", icon: "#i-leaf", count: "80+ template" },
                  { name: "Event Lainnya", icon: "#i-gift", count: "100+ template" },
                ].map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    className={`category-card ${selectedCategory === cat.name ? "active" : ""}`}
                    onClick={() => {
                      setSelectedCategory(cat.name);
                      setShowAll(true);
                      document.getElementById("template")?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    <svg className="category-icon">
                      <use href={cat.icon} />
                    </svg>
                    <span className="text-[12px] font-semibold">{cat.name}</span>
                    <span className="text-[10px] text-[#898581]">{cat.count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Testimoni / Reviews */}
        <section className="bg-[#fafafa] py-[18px]" id="testimoni">
          <div className="mx-auto grid max-w-[1240px] gap-5 px-5 lg:grid-cols-[300px_1fr] lg:items-center lg:px-0">
            <div className="flex items-center justify-between gap-4 lg:block">
              <div>
                <p className="eyebrow !text-[#925003]">APA KATA MEREKA</p>
                <h2 className="font-display mt-1 text-[25px] font-semibold leading-[1.27] tracking-[-.035em]">
                  Dipercaya oleh
                  <br />
                  Ribuan Pengguna
                </h2>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  className="arrow-circle border border-[#b7a28d] bg-white"
                  type="button"
                  id="reviewPrev"
                  aria-label="Testimoni sebelumnya"
                  onClick={() =>
                    setReviewIndex((reviewIndex - 1 + REVIEWS.length) % REVIEWS.length)
                  }
                >
                  ←
                </button>
                <button
                  className="arrow-circle border border-[#b7a28d] bg-white"
                  type="button"
                  id="reviewNext"
                  aria-label="Testimoni berikutnya"
                  onClick={() => setReviewIndex((reviewIndex + 1) % REVIEWS.length)}
                >
                  →
                </button>
              </div>
            </div>

            <div id="reviewGrid" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {displayedReviews.map((r) => (
                <article key={r.name} className="review-card flex gap-3 p-3.5">
                  <div
                    className="avatar h-12 w-12 text-[14px]"
                    style={{ background: `linear-gradient(135deg, ${r.shade}, #f6ece3)` }}
                  >
                    {r.initial}
                  </div>
                  <div className="min-w-0">
                    <div className="stars">★★★★★</div>
                    <p className="mt-1 min-h-[36px] text-[10px] leading-[1.5] text-[#77716b]">
                      “{r.quote}”
                    </p>
                    <p className="mt-1.5 text-[11px] font-bold">{r.name}</p>
                    <p className="text-[9px] text-[#95918d]">{r.type}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Banner Section */}
        <section id="harga" className="bg-[#fafafa] px-4 pb-5 sm:px-5">
          <div className="cta-bg mx-auto flex max-w-[1330px] flex-col gap-5 rounded-[13px] px-7 py-6 text-white md:flex-row md:items-center md:justify-between md:px-[70px] lg:px-[155px]">
            <svg
              className="decor-sprig -left-2 bottom-0 h-32 w-36"
              viewBox="0 0 140 140"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M10 140Q55 90 65 8M45 102 4 83M54 76 107 52M59 43 32 20"
                stroke="#f8e8cb"
                strokeWidth="1.4"
              />
              <path
                d="M30 117Q8 118 5 90q27 0 25 27ZM49 90q-32-9-31-32 25 10 31 32ZM57 64q27-24 49-24-2 26-49 24ZM65 35Q48 12 56 1q18 12 9 34Z"
                stroke="#f8e8cb"
                strokeWidth="1.5"
              />
            </svg>
            <div className="relative z-10">
              <p className="eyebrow !text-[#e8c49d]">MOMEN SPESIAL, DIMULAI DARI SINI</p>
              <h2 className="font-display mt-1 text-[27px] font-medium tracking-[-.035em] sm:text-[33px]">
                Buat Undangan Digital Sekarang
              </h2>
              <p className="mt-1 text-[12px] text-[#f5e7d6]">
                Pilih template, sesuaikan dengan gayamu, dan bagikan dalam hitungan menit.
              </p>
            </div>
            <div className="relative z-10 w-full shrink-0 md:w-[320px]">
              <Link
                href={currentUser ? "/dashboard/templates" : "/login?next=/dashboard/templates"}
                id="mainCta"
                className="flex h-[47px] w-full items-center justify-center gap-3 rounded-lg bg-white text-[12px] font-bold text-[#292929] transition hover:bg-[#f3e8dd]"
                onClick={() => showToast("Membuka studio pembuatan undangan...")}
              >
                <span>Mulai Gratis Sekarang</span>
                <svg className="h-4 w-4">
                  <use href="#i-arrow-right" />
                </svg>
              </Link>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-[#f7dec5]">
                <span>✓ Mudah digunakan</span>
                <span>✓ Tanpa instalasi</span>
                <span>✓ Banyak pilihan template</span>
              </div>
            </div>
            <svg
              className="decor-sprig -right-5 -top-2 h-32 w-36 rotate-180"
              viewBox="0 0 140 140"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M10 140Q55 90 65 8M45 102 4 83M54 76 107 52M59 43 32 20"
                stroke="#f8e8cb"
                strokeWidth="1.4"
              />
              <path
                d="M30 117Q8 118 5 90q27 0 25 27ZM49 90q-32-9-31-32 25 10 31 32ZM57 64q27-24 49-24-2 26-49 24ZM65 35Q48 12 56 1q18 12 9 34Z"
                stroke="#f8e8cb"
                strokeWidth="1.5"
              />
            </svg>
          </div>
        </section>

        <div className="sr-only" id="cara-kerja">
          Pilih template, lihat detail, lalu sesuaikan undangan Anda.
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e8e7e5] bg-[#fafafa] pt-10 pb-8 text-[#5b5855]">
        <div className="mx-auto max-w-[1240px] px-5 lg:px-0">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4 pb-8 border-b border-[#e8e7e5]">
            {/* Col 1: Brand & Slogan */}
            <div className="md:col-span-2 space-y-3">
              <Link href="/" className="font-display text-[22px] font-bold tracking-tight text-[#262524] flex items-center gap-2.5">
                {appSettings?.appLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={appSettings.appLogo}
                    alt={appSettings.appName}
                    className="h-8 w-auto max-w-[120px] object-contain rounded"
                  />
                ) : null}
                <span>{appSettings?.appName || "Undangan.id"}</span>
              </Link>
              <p className="max-w-md text-[13px] leading-relaxed text-[#78716c]">
                {appSettings?.footerDescription ||
                  "Platform pembuatan website undangan digital yang elegan, praktis, dan penuh makna untuk berbagai momen spesial di Indonesia."}
              </p>
            </div>

            {/* Col 2: Hubungi Kami */}
            <div className="space-y-2.5">
              <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#925003]">
                Kontak Resmi
              </h4>
              <ul className="space-y-2 text-[12.5px] text-[#5c5652]">
                {appSettings?.contactWhatsapp ? (
                  <li>
                    <a
                      href={`https://wa.me/${appSettings.contactWhatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#925003] transition-colors flex items-center gap-1.5"
                    >
                      <span>💬 WhatsApp: +{appSettings.contactWhatsapp}</span>
                    </a>
                  </li>
                ) : null}
                {appSettings?.contactPhone ? (
                  <li>
                    <a href={`tel:${appSettings.contactPhone}`} className="hover:text-[#925003] transition-colors">
                      📞 Telp: {appSettings.contactPhone}
                    </a>
                  </li>
                ) : null}
                {appSettings?.contactEmail ? (
                  <li>
                    <a href={`mailto:${appSettings.contactEmail}`} className="hover:text-[#925003] transition-colors">
                      ✉️ {appSettings.contactEmail}
                    </a>
                  </li>
                ) : null}
              </ul>
            </div>

            {/* Col 3: Alamat Operasional */}
            <div className="space-y-2.5">
              <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#925003]">
                Alamat Kantor
              </h4>
              <p className="text-[12px] leading-relaxed text-[#5c5652]">
                {appSettings?.address || "Jl. Jenderal Sudirman No. 45, Jakarta Selatan, DKI Jakarta"}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center justify-between gap-3 text-[11px] text-[#a5a09a] sm:flex-row">
            <p>
              © {new Date().getFullYear()} {appSettings?.companyName || appSettings?.appName || "Undangan.id"}. Seluruh hak cipta dilindungi.
            </p>
            <p className="text-[10px] text-[#a5a09a]">
              Solusi Template Undangan Digital Modern & Elegan
            </p>
          </div>
        </div>
      </footer>

      {/* Details Modal */}
      {modalTemplate && (
        <div
          id="detailsModal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#141414c9] p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modalTitle"
          onClick={(e) => {
            if ((e.target as HTMLElement).id === "detailsModal") {
              setModalTemplate(null);
            }
          }}
        >
          <div className="relative grid w-full max-w-[650px] overflow-hidden rounded-2xl bg-white shadow-2xl sm:grid-cols-[270px_1fr]">
            <button
              id="closeModal"
              type="button"
              className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white text-[#333] shadow"
              aria-label="Tutup detail"
              onClick={() => setModalTemplate(null)}
            >
              <svg className="h-5 w-5">
                <use href="#i-close" />
              </svg>
            </button>
            <div className="h-[360px] bg-[#e5dfd5] sm:h-[420px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                id="modalImage"
                className="h-full w-full object-cover"
                src={imageOf(modalTemplate)}
                alt={`Preview ${modalTemplate.name}`}
              />
            </div>
            <div className="flex flex-col justify-center p-7">
              <p id="modalCategory" className="eyebrow !text-[#925003]">
                {modalTemplate.category}
              </p>
              <h2 id="modalTitle" className="font-display mt-2 text-[29px] font-semibold">
                {modalTemplate.name}
              </h2>
              <p className="mt-2 text-[13px] leading-6 text-[#777]">
                Template undangan digital {modalTemplate.category.toLowerCase()} siap pakai dengan
                alunan musik romantis, RSVP buku tamu, serta amplop digital instan.
              </p>
              <p id="modalPrice" className="mt-5 text-[19px] font-semibold text-[#925003]">
                {formatRupiah(modalTemplate.price)}
              </p>
              <Link
                href={currentUser ? "/dashboard/templates" : `/login?next=/dashboard/templates`}
                className="button-primary mt-5 px-5 py-3 text-[13px]"
                onClick={() => setModalTemplate(null)}
              >
                <span>Gunakan Template</span>
                <svg className="h-4 w-4">
                  <use href="#i-arrow-right" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          id="toast"
          role="status"
          className="fixed bottom-5 left-1/2 z-[60] w-[min(95vw,420px)] -translate-x-1/2 rounded-xl bg-[#292a2b] px-5 py-3 text-center text-[13px] text-white shadow-2xl"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
