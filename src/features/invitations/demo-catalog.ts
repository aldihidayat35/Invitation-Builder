/**
 * Built-in Demo Invitation catalog for template previews and live demos.
 * Ensures URLs like `/i/demo-royal-elegant`, `/i/demo-classic-floral`,
 * and `/i/demo-modern-minimal` always resolve to rich, interactive,
 * mobile-responsive public wedding invitations rather than 404s.
 */
import { canonicalDocumentSchema, type CanonicalDocument } from "@/lib/schema";
import { resolveDocument } from "@/lib/engine";
import type { PublicInvitationModel } from "./service";
import { findTemplateBySlug } from "@/lib/db/repositories/templates";

function formatGuestName(rawTokenOrName?: string): string | undefined {
  if (!rawTokenOrName || typeof rawTokenOrName !== "string") return undefined;
  const decoded = decodeURIComponent(rawTokenOrName).replace(/[-_+]/g, " ").trim();
  if (!decoded) return undefined;
  // Convert to Title Case
  return decoded
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/** 1. Royal Elegant (Luxury Traditional Nusantara / Javanese Adat) */
export function createRoyalElegantDemoDocument(): CanonicalDocument {
  return canonicalDocumentSchema.parse({
    schemaVersion: 1,
    design: {
      baseWidth: 390,
      tokens: {
        colors: {
          gold: "#D4AF37",
          goldLight: "#F3E5AB",
          darkWalnut: "#1A1412",
          surface: "#241C19",
          surfaceCard: "#2D231F",
          cream: "#FFFDF9",
          muted: "#A89F91",
        },
        fonts: {
          display: "Cinzel",
          body: "Plus Jakarta Sans",
        },
      },
      background: {
        color: "#1A1412",
      },
    },
    variables: [
      { key: "guest.name", type: "guest-context", label: "Nama Tamu" },
    ],
    sections: [
      // Section 0: Opening Screen (Cover Canvas)
      {
        id: "sec_ro_cover",
        name: "Cover Pembuka",
        baseHeight: 844,
        isOpening: true,
        background: { color: { token: "darkWalnut" } },
        elements: [
          {
            id: "el_ro_ornament_top",
            type: "text",
            frame: { x: 20, y: 70, w: 350, h: 30, rotation: 0 },
            content: { segments: [{ text: "THE WEDDING OF" }] },
            style: {
              fontSize: 13,
              letterSpacing: 6,
              color: { token: "gold" },
              textAlign: "center",
              fontWeight: 600,
            },
          },
          {
            id: "el_ro_title",
            type: "text",
            frame: { x: 20, y: 130, w: 350, h: 90, rotation: 0 },
            content: { segments: [{ text: "Danang & Sekar" }] },
            style: {
              fontSize: 38,
              fontWeight: 700,
              fontFamily: { token: "display" },
              color: { token: "goldLight" },
              textAlign: "center",
            },
          },
          {
            id: "el_ro_date",
            type: "text",
            frame: { x: 20, y: 235, w: 350, h: 30, rotation: 0 },
            content: { segments: [{ text: "SABTU, 28 NOVEMBER 2026" }] },
            style: {
              fontSize: 14,
              letterSpacing: 3,
              color: { token: "gold" },
              textAlign: "center",
            },
          },
          {
            id: "wdg_ro_greeting",
            type: "widget",
            widgetType: "guestGreeting",
            frame: { x: 25, y: 380, w: 340, h: 140, rotation: 0 },
            props: {
              guestName: { bind: "guest.name" },
              prefix: "Kepada Yth. Bapak/Ibu/Saudara(i):",
              fallback: "Tamu Undangan",
            },
            style: {
              color: "#F3E5AB",
              background: "#2D231F",
              radius: 16,
            },
          },
          {
            id: "el_ro_hint",
            type: "text",
            frame: { x: 20, y: 550, w: 350, h: 30, rotation: 0 },
            content: { segments: [{ text: "Sentuh layar untuk membuka undangan" }] },
            style: {
              fontSize: 13,
              color: { token: "muted" },
              textAlign: "center",
            },
          },
        ],
      },
      // Section 1: Ayat Suci / Blessing
      {
        id: "sec_ro_bismillah",
        name: "Ayat Suci Ar-Rum 21",
        baseHeight: 460,
        background: { color: { token: "surface" } },
        elements: [
          {
            id: "el_rb_arabic",
            type: "text",
            frame: { x: 20, y: 50, w: 350, h: 45, rotation: 0 },
            content: { segments: [{ text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ" }] },
            style: {
              fontSize: 22,
              color: { token: "gold" },
              textAlign: "center",
            },
          },
          {
            id: "el_rb_title",
            type: "text",
            frame: { x: 20, y: 110, w: 350, h: 30, rotation: 0 },
            content: { segments: [{ text: "SURAH AR-RUM : 21" }] },
            style: {
              fontSize: 13,
              letterSpacing: 4,
              fontWeight: 600,
              color: { token: "gold" },
              textAlign: "center",
            },
          },
          {
            id: "el_rb_quote",
            type: "text",
            frame: { x: 25, y: 155, w: 340, h: 180, rotation: 0 },
            content: {
              segments: [
                {
                  text: "Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang. Sungguh, pada yang demikian itu benar-benar terdapat tanda-tanda bagi kaum yang berpikir.",
                },
              ],
            },
            style: {
              fontSize: 13,
              lineHeight: 1.8,
              color: "#E6DFD5",
              textAlign: "center",
            },
          },
          {
            id: "el_rb_divider",
            type: "shape",
            shapeType: "line",
            frame: { x: 120, y: 370, w: 150, h: 2, rotation: 0 },
            style: {
              stroke: { color: "#D4AF37", width: 1 },
              opacity: 0.5,
            },
          },
        ],
      },
      // Section 2: Profil Mempelai (Couple Profile)
      {
        id: "sec_ro_couple",
        name: "Profil Pasangan Mempelai",
        baseHeight: 880,
        background: { color: { token: "darkWalnut" } },
        elements: [
          {
            id: "el_rc_subtitle",
            type: "text",
            frame: { x: 20, y: 40, w: 350, h: 30, rotation: 0 },
            content: { segments: [{ text: "MEMPELAI PRIA & WANITA" }] },
            style: {
              fontSize: 12,
              letterSpacing: 4,
              fontWeight: 600,
              color: { token: "gold" },
              textAlign: "center",
            },
          },
          {
            id: "el_rc_heading",
            type: "text",
            frame: { x: 20, y: 75, w: 350, h: 45, rotation: 0 },
            content: { segments: [{ text: "Pasangan Mempelai" }] },
            style: {
              fontSize: 26,
              fontWeight: 700,
              fontFamily: { token: "display" },
              color: { token: "goldLight" },
              textAlign: "center",
            },
          },
          {
            id: "wdg_rc_couple",
            type: "widget",
            widgetType: "coupleProfile",
            frame: { x: 20, y: 140, w: 350, h: 680, rotation: 0 },
            props: {
              order: "groom_first",
              connector: "&",
              nameFont: "Cinzel",
              showParents: true,
              showInstagram: true,
              groom: {
                name: "Danang",
                fullName: "Raden Mas Danang Prasetyo, S.T.",
                role: "Mempelai Pria",
                parents: "Putra pertama dari Bpk. Ir. H. Bambang Widjaja & Ibu Hj. Sri Rahayu",
                instagram: "danang.prasetyo",
              },
              bride: {
                name: "Sekar",
                fullName: "Raden Ajeng Sekar Arum, S.Ked.",
                role: "Mempelai Wanita",
                parents: "Putri kedua dari Bpk. Dr. H. Hartono Subagyo & Ibu Hj. Endang Lestari",
                instagram: "sekar.arum",
              },
            },
            style: {
              color: "#F3E5AB",
              background: "#241C19",
              radius: 20,
            },
          },
        ],
      },
      // Section 3: Waktu & Lokasi Acara + Countdown + Map
      {
        id: "sec_ro_events",
        name: "Rangkaian Acara & Lokasi",
        baseHeight: 1160,
        background: { color: { token: "surface" } },
        elements: [
          {
            id: "el_re_subtitle",
            type: "text",
            frame: { x: 20, y: 40, w: 350, h: 30, rotation: 0 },
            content: { segments: [{ text: "SAVE THE DATE" }] },
            style: {
              fontSize: 12,
              letterSpacing: 4,
              fontWeight: 600,
              color: { token: "gold" },
              textAlign: "center",
            },
          },
          {
            id: "el_re_heading",
            type: "text",
            frame: { x: 20, y: 75, w: 350, h: 45, rotation: 0 },
            content: { segments: [{ text: "Rangkaian Acara" }] },
            style: {
              fontSize: 26,
              fontWeight: 700,
              fontFamily: { token: "display" },
              color: { token: "goldLight" },
              textAlign: "center",
            },
          },
          {
            id: "wdg_re_countdown",
            type: "widget",
            widgetType: "countdown",
            frame: { x: 25, y: 140, w: 340, h: 120, rotation: 0 },
            props: {
              targetDateTime: "2026-11-28T08:00:00+07:00",
              labels: { days: "Hari", hours: "Jam", minutes: "Menit", seconds: "Detik" },
              afterMessage: "Acara Sedang / Telah Berlangsung",
            },
            style: {
              color: "#F3E5AB",
              background: "#2D231F",
              radius: 16,
            },
          },
          {
            id: "wdg_re_timeline",
            type: "widget",
            widgetType: "timeline",
            frame: { x: 25, y: 285, w: 340, h: 440, rotation: 0 },
            props: {
              title: "Jadwal Prosesi",
              events: [
                {
                  time: "08:00 - 10:00 WIB",
                  title: "Akad Nikah",
                  description: "Prosesi Ijab Kabul & Doa Restu Keluarga",
                  location: "Sasana Kriya Grand Ballroom",
                  icon: "ring",
                },
                {
                  time: "11:00 - 14:00 WIB",
                  title: "Resepsi Adat Jawa",
                  description: "Upacara Panggih Penganten & Ramah Tamah",
                  location: "Sasana Kriya Grand Ballroom",
                  icon: "glass",
                },
              ],
            },
            style: {
              color: "#F3E5AB",
              background: "#241C19",
              radius: 16,
            },
          },
          {
            id: "wdg_re_map",
            type: "widget",
            widgetType: "map",
            frame: { x: 25, y: 750, w: 340, h: 350, rotation: 0 },
            props: {
              label: "Sasana Kriya Grand Ballroom, TMII, Jakarta Timur",
              buttonText: "Buka Petunjuk Arah Google Maps",
              coordinate: { lat: -6.3024, lng: 106.8952 },
            },
            style: {
              color: "#F3E5AB",
              background: "#241C19",
              radius: 16,
            },
          },
        ],
      },
      // Section 4: Galeri Momen Bahagia
      {
        id: "sec_ro_gallery",
        name: "Galeri Foto",
        baseHeight: 520,
        background: { color: { token: "darkWalnut" } },
        elements: [
          {
            id: "el_rg_subtitle",
            type: "text",
            frame: { x: 20, y: 40, w: 350, h: 30, rotation: 0 },
            content: { segments: [{ text: "PORTFOLIO MEMORI" }] },
            style: {
              fontSize: 12,
              letterSpacing: 4,
              fontWeight: 600,
              color: { token: "gold" },
              textAlign: "center",
            },
          },
          {
            id: "el_rg_heading",
            type: "text",
            frame: { x: 20, y: 75, w: 350, h: 45, rotation: 0 },
            content: { segments: [{ text: "Galeri Foto" }] },
            style: {
              fontSize: 26,
              fontWeight: 700,
              fontFamily: { token: "display" },
              color: { token: "goldLight" },
              textAlign: "center",
            },
          },
          {
            id: "wdg_rg_gallery",
            type: "widget",
            widgetType: "gallery",
            frame: { x: 25, y: 140, w: 340, h: 330, rotation: 0 },
            props: {
              title: "Momen Bahagia Mempelai",
              layout: "grid",
              items: [
                { src: "/images/template-jawa.jpg", alt: "Momen Adat Jawa 1" },
                { src: "/images/template-botanical.jpg", alt: "Momen Adat Jawa 2" },
                { src: "/images/template-boho.jpg", alt: "Momen Adat Jawa 3" },
              ],
            },
            style: {
              color: "#F3E5AB",
              background: "#241C19",
              radius: 16,
            },
          },
        ],
      },
      // Section 5: RSVP & Wishes
      {
        id: "sec_ro_rsvp",
        name: "RSVP & Buku Tamu",
        baseHeight: 880,
        background: { color: { token: "surface" } },
        elements: [
          {
            id: "el_rr_subtitle",
            type: "text",
            frame: { x: 20, y: 40, w: 350, h: 30, rotation: 0 },
            content: { segments: [{ text: "KONFIRMASI KEHADIRAN" }] },
            style: {
              fontSize: 12,
              letterSpacing: 4,
              fontWeight: 600,
              color: { token: "gold" },
              textAlign: "center",
            },
          },
          {
            id: "el_rr_heading",
            type: "text",
            frame: { x: 20, y: 75, w: 350, h: 45, rotation: 0 },
            content: { segments: [{ text: "Buku Tamu & RSVP" }] },
            style: {
              fontSize: 26,
              fontWeight: 700,
              fontFamily: { token: "display" },
              color: { token: "goldLight" },
              textAlign: "center",
            },
          },
          {
            id: "wdg_rr_rsvp",
            type: "widget",
            widgetType: "rsvp",
            frame: { x: 25, y: 140, w: 340, h: 380, rotation: 0 },
            props: {
              title: "Konfirmasi Kehadiran",
              enablePartySize: true,
              enableMessage: true,
              deadline: "2026-11-20T23:59:59+07:00",
            },
            style: {
              color: "#F3E5AB",
              background: "#2D231F",
              radius: 16,
            },
          },
          {
            id: "wdg_rr_wishes",
            type: "widget",
            widgetType: "wishes",
            frame: { x: 25, y: 550, w: 340, h: 290, rotation: 0 },
            props: {
              title: "Ucapan & Doa Restu",
              subtitle: "Kumpulan doa penuh berkah dari keluarga & sahabat",
              items: [
                {
                  name: "H. Bambang Sugiarto",
                  message: "Barakallahu lakum wa baraka 'alaikum wa jama'a bainakuma fii khoir. Selamat ya Mas Danang & Mbak Sekar!",
                  presence: "hadir",
                  date: "Baru saja",
                },
                {
                  name: "Anisa Rahmawati",
                  message: "Selamat menempuh hidup baru sahabatku tercantik! Semoga bahagia selamanya ya Sekar & Mas Danang 💕",
                  presence: "hadir",
                  date: "2 jam lalu",
                },
              ],
            },
            style: {
              color: "#F3E5AB",
              background: "#241C19",
              radius: 16,
            },
          },
        ],
      },
      // Section 6: Amplop Digital & Gift
      {
        id: "sec_ro_gift",
        name: "Amplop Digital",
        baseHeight: 560,
        background: { color: { token: "darkWalnut" } },
        elements: [
          {
            id: "el_rgt_subtitle",
            type: "text",
            frame: { x: 20, y: 40, w: 350, h: 30, rotation: 0 },
            content: { segments: [{ text: "TANDA KASIH" }] },
            style: {
              fontSize: 12,
              letterSpacing: 4,
              fontWeight: 600,
              color: { token: "gold" },
              textAlign: "center",
            },
          },
          {
            id: "el_rgt_heading",
            type: "text",
            frame: { x: 20, y: 75, w: 350, h: 45, rotation: 0 },
            content: { segments: [{ text: "Amplop Digital" }] },
            style: {
              fontSize: 26,
              fontWeight: 700,
              fontFamily: { token: "display" },
              color: { token: "goldLight" },
              textAlign: "center",
            },
          },
          {
            id: "el_rgt_desc",
            type: "text",
            frame: { x: 25, y: 135, w: 340, h: 60, rotation: 0 },
            content: {
              segments: [
                {
                  text: "Doa restu Anda merupakan karunia terindah bagi kami. Bagi keluarga & sahabat yang ingin memberikan tanda kasih secara digital:",
                },
              ],
            },
            style: {
              fontSize: 13,
              lineHeight: 1.6,
              color: "#D6CFBE",
              textAlign: "center",
            },
          },
          {
            id: "wdg_rgt_gift",
            type: "widget",
            widgetType: "gift",
            frame: { x: 25, y: 210, w: 340, h: 300, rotation: 0 },
            props: {
              title: "Transfer Rekening & Kado",
              accounts: [
                { bank: "BCA", accountNumber: "8820192831", accountName: "Danang Prasetyo" },
                { bank: "Bank Mandiri", accountNumber: "1370019283741", accountName: "Sekar Arum" },
              ],
            },
            style: {
              color: "#F3E5AB",
              background: "#241C19",
              radius: 16,
              variant: "gold-ornament",
            },
          },
        ],
      },
      // Section 7: Penutup & Audio Player
      {
        id: "sec_ro_footer",
        name: "Penutup & Musik",
        baseHeight: 540,
        background: { color: "#140F0E" },
        elements: [
          {
            id: "el_rf_closing",
            type: "text",
            frame: { x: 25, y: 40, w: 340, h: 80, rotation: 0 },
            content: {
              segments: [
                {
                  text: "Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara(i) berkenan hadir dan memberikan doa restu kepada kami.",
                },
              ],
            },
            style: {
              fontSize: 13,
              lineHeight: 1.8,
              color: "#D6CFBE",
              textAlign: "center",
            },
          },
          {
            id: "el_rf_regards",
            type: "text",
            frame: { x: 20, y: 140, w: 350, h: 30, rotation: 0 },
            content: { segments: [{ text: "KAMI YANG BERBAHAGIA" }] },
            style: {
              fontSize: 12,
              letterSpacing: 4,
              fontWeight: 600,
              color: { token: "gold" },
              textAlign: "center",
            },
          },
          {
            id: "el_rf_names",
            type: "text",
            frame: { x: 20, y: 180, w: 350, h: 50, rotation: 0 },
            content: { segments: [{ text: "Danang & Sekar" }] },
            style: {
              fontSize: 30,
              fontWeight: 700,
              fontFamily: { token: "display" },
              color: { token: "goldLight" },
              textAlign: "center",
            },
          },
          {
            id: "el_rf_family",
            type: "text",
            frame: { x: 25, y: 245, w: 340, h: 40, rotation: 0 },
            content: {
              segments: [
                { text: "Keluarga Besar Bpk. Bambang Widjaja & Bpk. Hartono Subagyo" },
              ],
            },
            style: {
              fontSize: 13,
              color: { token: "muted" },
              textAlign: "center",
            },
          },
          {
            id: "wdg_rf_music",
            type: "widget",
            widgetType: "music",
            frame: { x: 25, y: 310, w: 340, h: 80, rotation: 0 },
            props: {
              title: "Gending Pengantin - Instrumental Romantis",
              src: "https://actions.google.com/sounds/v1/ambiences/wind_chimes.ogg",
              autoplay: true,
            },
            style: {
              color: "#F3E5AB",
              background: "#241C19",
              radius: 40,
            },
          },
          {
            id: "el_rf_credit",
            type: "text",
            frame: { x: 20, y: 460, w: 350, h: 30, rotation: 0 },
            content: { segments: [{ text: "Created with Undangan.id Digital Invitation Builder" }] },
            style: {
              fontSize: 11,
              color: "#6B6357",
              textAlign: "center",
            },
          },
        ],
      },
    ],
  });
}

/** 2. Classic Floral (Botanical Sage Green Theme) */
export function createClassicFloralDemoDocument(): CanonicalDocument {
  return canonicalDocumentSchema.parse({
    schemaVersion: 1,
    design: {
      baseWidth: 390,
      tokens: {
        colors: {
          sage: "#8A9A86",
          ivory: "#F4F1EA",
          forest: "#4A5847",
          paper: "#FAF7F2",
          dark: "#2A3229",
          muted: "#7B8678",
        },
        fonts: {
          display: "Playfair Display",
          body: "Plus Jakarta Sans",
        },
      },
      background: {
        color: "#FAF7F2",
      },
    },
    variables: [
      { key: "guest.name", type: "guest-context", label: "Nama Tamu" },
    ],
    sections: [
      {
        id: "sec_cf_cover",
        name: "Cover Pembuka",
        baseHeight: 844,
        isOpening: true,
        background: { color: "#FAF7F2" },
        elements: [
          {
            id: "el_cf_tag",
            type: "text",
            frame: { x: 20, y: 80, w: 350, h: 30, rotation: 0 },
            content: { segments: [{ text: "THE WEDDING CELEBRATION OF" }] },
            style: {
              fontSize: 12,
              letterSpacing: 4,
              fontWeight: 600,
              color: "#8A9A86",
              textAlign: "center",
            },
          },
          {
            id: "el_cf_title",
            type: "text",
            frame: { x: 20, y: 130, w: 350, h: 90, rotation: 0 },
            content: { segments: [{ text: "Raka & Salsabila" }] },
            style: {
              fontSize: 38,
              fontWeight: 700,
              fontFamily: { token: "display" },
              color: "#2A3229",
              textAlign: "center",
            },
          },
          {
            id: "el_cf_date",
            type: "text",
            frame: { x: 20, y: 230, w: 350, h: 30, rotation: 0 },
            content: { segments: [{ text: "MINGGU, 13 DESEMBER 2026" }] },
            style: {
              fontSize: 14,
              letterSpacing: 3,
              color: "#4A5847",
              textAlign: "center",
            },
          },
          {
            id: "wdg_cf_greeting",
            type: "widget",
            widgetType: "guestGreeting",
            frame: { x: 25, y: 380, w: 340, h: 140, rotation: 0 },
            props: {
              guestName: { bind: "guest.name" },
              prefix: "Kepada Yth. Bapak/Ibu/Saudara(i):",
              fallback: "Tamu Undangan",
            },
            style: {
              color: "#2A3229",
              background: "#F4F1EA",
              radius: 16,
            },
          },
          {
            id: "el_cf_hint",
            type: "text",
            frame: { x: 20, y: 550, w: 350, h: 30, rotation: 0 },
            content: { segments: [{ text: "Sentuh layar untuk membuka undangan" }] },
            style: {
              fontSize: 13,
              color: "#7B8678",
              textAlign: "center",
            },
          },
        ],
      },
      {
        id: "sec_cf_couple",
        name: "Profil Mempelai",
        baseHeight: 880,
        background: { color: "#F4F1EA" },
        elements: [
          {
            id: "el_cfc_subtitle",
            type: "text",
            frame: { x: 20, y: 40, w: 350, h: 30, rotation: 0 },
            content: { segments: [{ text: "GROOM & BRIDE" }] },
            style: {
              fontSize: 12,
              letterSpacing: 4,
              fontWeight: 600,
              color: "#4A5847",
              textAlign: "center",
            },
          },
          {
            id: "el_cfc_title",
            type: "text",
            frame: { x: 20, y: 75, w: 350, h: 45, rotation: 0 },
            content: { segments: [{ text: "Mempelai Berbahagia" }] },
            style: {
              fontSize: 26,
              fontWeight: 700,
              fontFamily: { token: "display" },
              color: "#2A3229",
              textAlign: "center",
            },
          },
          {
            id: "wdg_cfc_couple",
            type: "widget",
            widgetType: "coupleProfile",
            frame: { x: 20, y: 140, w: 350, h: 680, rotation: 0 },
            props: {
              order: "groom_first",
              connector: "&",
              nameFont: "Playfair Display",
              showParents: true,
              showInstagram: true,
              groom: {
                name: "Raka",
                fullName: "Raka Pradipta, S.T.",
                role: "Mempelai Pria",
                parents: "Putra pertama dari Bpk. Hendra Gunawan & Ibu Ratna Dewi",
                instagram: "raka.pradipta",
              },
              bride: {
                name: "Salsabila",
                fullName: "Salsabila Khairunnisa, S.I.Kom.",
                role: "Mempelai Wanita",
                parents: "Putri bungsu dari Bpk. H. Ahmad Fauzi & Ibu Hj. Nur Aini",
                instagram: "salsabila.k",
              },
            },
            style: {
              color: "#2A3229",
              background: "#FAF7F2",
              radius: 20,
            },
          },
        ],
      },
      {
        id: "sec_cf_events",
        name: "Acara & Lokasi",
        baseHeight: 1100,
        background: { color: "#FAF7F2" },
        elements: [
          {
            id: "el_cfe_title",
            type: "text",
            frame: { x: 20, y: 60, w: 350, h: 45, rotation: 0 },
            content: { segments: [{ text: "Waktu & Tempat Acara" }] },
            style: {
              fontSize: 26,
              fontWeight: 700,
              fontFamily: { token: "display" },
              color: "#2A3229",
              textAlign: "center",
            },
          },
          {
            id: "wdg_cfe_countdown",
            type: "widget",
            widgetType: "countdown",
            frame: { x: 25, y: 120, w: 340, h: 120, rotation: 0 },
            props: {
              targetDateTime: "2026-12-13T09:00:00+07:00",
              labels: { days: "Hari", hours: "Jam", minutes: "Menit", seconds: "Detik" },
            },
            style: {
              color: "#2A3229",
              background: "#F4F1EA",
              radius: 16,
            },
          },
          {
            id: "wdg_cfe_timeline",
            type: "widget",
            widgetType: "timeline",
            frame: { x: 25, y: 265, w: 340, h: 440, rotation: 0 },
            props: {
              title: "Rangkaian Acara",
              events: [
                {
                  time: "08:30 - 10:00 WIB",
                  title: "Akad Nikah",
                  description: "Ijab kabul di hadapan penghulu & saksi",
                  location: "Glass House Garden",
                  icon: "ring",
                },
                {
                  time: "11:30 - 14:30 WIB",
                  title: "Resepsi Botanical",
                  description: "Pesta taman outdoor & ramah tamah",
                  location: "Pine Hill Botanical Hall",
                  icon: "glass",
                },
              ],
            },
            style: {
              color: "#2A3229",
              background: "#F4F1EA",
              radius: 16,
            },
          },
          {
            id: "wdg_cfe_map",
            type: "widget",
            widgetType: "map",
            frame: { x: 25, y: 725, w: 340, h: 340, rotation: 0 },
            props: {
              label: "Pine Hill Garden, Lembang, Bandung Barat",
              buttonText: "Buka Lokasi di Google Maps",
              coordinate: { lat: -6.8234, lng: 107.6321 },
            },
            style: {
              color: "#2A3229",
              background: "#F4F1EA",
              radius: 16,
            },
          },
        ],
      },
      {
        id: "sec_cf_rsvp",
        name: "RSVP & Ucapan",
        baseHeight: 820,
        background: { color: "#F4F1EA" },
        elements: [
          {
            id: "el_cfr_title",
            type: "text",
            frame: { x: 20, y: 50, w: 350, h: 45, rotation: 0 },
            content: { segments: [{ text: "Konfirmasi Kehadiran" }] },
            style: {
              fontSize: 26,
              fontWeight: 700,
              fontFamily: { token: "display" },
              color: "#2A3229",
              textAlign: "center",
            },
          },
          {
            id: "wdg_cfr_rsvp",
            type: "widget",
            widgetType: "rsvp",
            frame: { x: 25, y: 110, w: 340, h: 370, rotation: 0 },
            props: {
              title: "RSVP Online",
              enablePartySize: true,
              enableMessage: true,
            },
            style: {
              color: "#2A3229",
              background: "#FAF7F2",
              radius: 16,
            },
          },
          {
            id: "wdg_cfr_gift",
            type: "widget",
            widgetType: "gift",
            frame: { x: 25, y: 500, w: 340, h: 280, rotation: 0 },
            props: {
              title: "Amplop Digital",
              accounts: [
                { bank: "BCA", accountNumber: "7219028312", accountName: "Raka Pradipta" },
                { bank: "Bank BNI", accountNumber: "0491823912", accountName: "Salsabila K" },
              ],
            },
            style: {
              color: "#2A3229",
              background: "#FAF7F2",
              radius: 16,
            },
          },
        ],
      },
      {
        id: "sec_cf_footer",
        name: "Penutup",
        baseHeight: 460,
        background: { color: "#2A3229" },
        elements: [
          {
            id: "el_cff_thanks",
            type: "text",
            frame: { x: 25, y: 60, w: 340, h: 60, rotation: 0 },
            content: {
              segments: [
                {
                  text: "Terima kasih atas doa dan restu Anda yang melengkapi hari bahagia kami.",
                },
              ],
            },
            style: {
              fontSize: 14,
              lineHeight: 1.8,
              color: "#F4F1EA",
              textAlign: "center",
            },
          },
          {
            id: "el_cff_names",
            type: "text",
            frame: { x: 20, y: 140, w: 350, h: 50, rotation: 0 },
            content: { segments: [{ text: "Raka & Salsabila" }] },
            style: {
              fontSize: 32,
              fontWeight: 700,
              fontFamily: { token: "display" },
              color: "#F4F1EA",
              textAlign: "center",
            },
          },
          {
            id: "wdg_cff_music",
            type: "widget",
            widgetType: "music",
            frame: { x: 25, y: 220, w: 340, h: 80, rotation: 0 },
            props: {
              title: "Acoustic Wedding Love Melody",
              src: "https://actions.google.com/sounds/v1/ambiences/wind_chimes.ogg",
              autoplay: true,
            },
            style: {
              color: "#2A3229",
              background: "#F4F1EA",
              radius: 40,
            },
          },
        ],
      },
    ],
  });
}

/** 3. Modern Minimal (Contemporary Editorial Terracotta Theme) */
export function createModernMinimalDemoDocument(): CanonicalDocument {
  return canonicalDocumentSchema.parse({
    schemaVersion: 1,
    design: {
      baseWidth: 390,
      tokens: {
        colors: {
          terracotta: "#C86D51",
          mocha: "#583B2B",
          sand: "#F7F2EE",
          surface: "#EFE8E1",
          dark: "#231B17",
        },
        fonts: {
          display: "Playfair Display",
          body: "Plus Jakarta Sans",
        },
      },
      background: {
        color: "#F7F2EE",
      },
    },
    variables: [
      { key: "guest.name", type: "guest-context", label: "Nama Tamu" },
    ],
    sections: [
      {
        id: "sec_mm_cover",
        name: "Cover",
        baseHeight: 844,
        isOpening: true,
        background: { color: "#F7F2EE" },
        elements: [
          {
            id: "el_mm_tag",
            type: "text",
            frame: { x: 20, y: 90, w: 350, h: 30, rotation: 0 },
            content: { segments: [{ text: "WEDDING INVITATION" }] },
            style: {
              fontSize: 12,
              letterSpacing: 5,
              fontWeight: 600,
              color: "#C86D51",
              textAlign: "center",
            },
          },
          {
            id: "el_mm_title",
            type: "text",
            frame: { x: 20, y: 140, w: 350, h: 90, rotation: 0 },
            content: { segments: [{ text: "Aditya & Clarissa" }] },
            style: {
              fontSize: 36,
              fontWeight: 700,
              fontFamily: { token: "display" },
              color: "#583B2B",
              textAlign: "center",
            },
          },
          {
            id: "wdg_mm_greeting",
            type: "widget",
            widgetType: "guestGreeting",
            frame: { x: 25, y: 380, w: 340, h: 140, rotation: 0 },
            props: {
              guestName: { bind: "guest.name" },
              prefix: "Kepada Yth. Bapak/Ibu/Saudara(i):",
              fallback: "Tamu Undangan",
            },
            style: {
              color: "#583B2B",
              background: "#EFE8E1",
              radius: 12,
            },
          },
          {
            id: "el_mm_hint",
            type: "text",
            frame: { x: 20, y: 550, w: 350, h: 30, rotation: 0 },
            content: { segments: [{ text: "Klik untuk membuka undangan" }] },
            style: {
              fontSize: 13,
              color: "#A08A7C",
              textAlign: "center",
            },
          },
        ],
      },
      {
        id: "sec_mm_events",
        name: "Acara & Countdown",
        baseHeight: 920,
        background: { color: "#EFE8E1" },
        elements: [
          {
            id: "el_mme_title",
            type: "text",
            frame: { x: 20, y: 50, w: 350, h: 45, rotation: 0 },
            content: { segments: [{ text: "Waktu & Tempat" }] },
            style: {
              fontSize: 26,
              fontWeight: 700,
              fontFamily: { token: "display" },
              color: "#583B2B",
              textAlign: "center",
            },
          },
          {
            id: "wdg_mme_countdown",
            type: "widget",
            widgetType: "countdown",
            frame: { x: 25, y: 110, w: 340, h: 120, rotation: 0 },
            props: {
              targetDateTime: "2026-10-24T10:00:00+07:00",
            },
            style: {
              color: "#583B2B",
              background: "#F7F2EE",
              radius: 12,
            },
          },
          {
            id: "wdg_mme_timeline",
            type: "widget",
            widgetType: "timeline",
            frame: { x: 25, y: 250, w: 340, h: 380, rotation: 0 },
            props: {
              title: "Jadwal Acara",
              events: [
                { time: "09:00 - 11:00 WIB", title: "Pemberkatan Nikah", location: "Katedral Santo Yohanes", icon: "church" },
                { time: "18:00 - 21:00 WIB", title: "Dinner Reception", location: "Plataran Menteng", icon: "glass" },
              ],
            },
            style: {
              color: "#583B2B",
              background: "#F7F2EE",
              radius: 12,
            },
          },
          {
            id: "wdg_mme_map",
            type: "widget",
            widgetType: "map",
            frame: { x: 25, y: 650, w: 340, h: 240, rotation: 0 },
            props: {
              label: "Plataran Menteng, Jakarta Pusat",
              buttonText: "Lihat Peta Lokasi",
              coordinate: { lat: -6.1952, lng: 106.8329 },
            },
            style: {
              color: "#583B2B",
              background: "#F7F2EE",
              radius: 12,
            },
          },
        ],
      },
      {
        id: "sec_mm_rsvp",
        name: "RSVP",
        baseHeight: 520,
        background: { color: "#F7F2EE" },
        elements: [
          {
            id: "wdg_mmr_rsvp",
            type: "widget",
            widgetType: "rsvp",
            frame: { x: 25, y: 40, w: 340, h: 360, rotation: 0 },
            props: {
              title: "Konfirmasi Kehadiran",
            },
            style: {
              color: "#583B2B",
              background: "#EFE8E1",
              radius: 12,
            },
          },
        ],
      },
    ],
  });
}

/**
 * Resolves a demo invitation for template previews and live demo links.
 * Checks known template identifiers or resolves via database template slug.
 */
export async function getDemoInvitation(
  slug: string,
  rawGuestTokenOrName?: string,
): Promise<PublicInvitationModel | null> {
  const clean = slug.trim().toLowerCase();
  if (!clean || clean.length > 120) return null;

  const guestName = formatGuestName(rawGuestTokenOrName);
  const guestData = guestName ? { name: guestName } : {};

  // Check known presets by keywords
  let doc: CanonicalDocument | null = null;
  let title = "Undangan Pernikahan Digital";

  if (
    clean === "demo-royal-elegant" ||
    clean === "royal-elegant-jawa" ||
    clean === "royal-elegant" ||
    clean.includes("royal") ||
    clean.includes("jawa")
  ) {
    doc = createRoyalElegantDemoDocument();
    title = "Danang & Sekar — Royal Elegant";
  } else if (
    clean === "demo-classic-floral" ||
    clean === "classic-floral-botanical" ||
    clean === "classic-floral" ||
    clean.includes("floral") ||
    clean.includes("botanical") ||
    clean.includes("garden")
  ) {
    doc = createClassicFloralDemoDocument();
    title = "Raka & Salsabila — Classic Floral";
  } else if (
    clean === "demo-modern-minimal" ||
    clean === "modern-minimal-boho" ||
    clean === "modern-minimal" ||
    clean.includes("modern") ||
    clean.includes("minimal") ||
    clean.includes("boho")
  ) {
    doc = createModernMinimalDemoDocument();
    title = "Aditya & Clarissa — Modern Minimal";
  } else if (clean.startsWith("demo-")) {
    // Any other demo-* slug defaults to luxury Royal Elegant demo
    doc = createRoyalElegantDemoDocument();
    title = `Demo Undangan — ${clean.replace(/^demo-/, "").replace(/-/g, " ").toUpperCase()}`;
  } else {
    // Try to find if slug matches a published template in DB
    try {
      const { getDb } = await import("@/lib/db/client");
      const db = await getDb();
      const tpl = await findTemplateBySlug(db, clean);
      if (tpl) {
        if (tpl.draftDocument && tpl.draftDocument.sections && tpl.draftDocument.sections.length > 0) {
          doc = tpl.draftDocument;
        } else {
          // Empty draft template falls back to royal elegant or classic floral
          doc = createRoyalElegantDemoDocument();
        }
        title = `Demo Template: ${tpl.name}`;
      }
    } catch {
      // In tests or offline DB, ignore DB lookup failure
    }
  }

  if (!doc) return null;

  const resolved = resolveDocument(doc, {}, guestData);

  return {
    title,
    slug: clean,
    revisionNo: 1,
    resolved,
    ...(guestName && { guestName }),
    hasGuest: Boolean(guestName),
  };
}
