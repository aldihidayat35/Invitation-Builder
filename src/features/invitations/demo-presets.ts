/**
 * Pure CanonicalDocument generators for demo presets.
 * Free of database dependencies to prevent circular imports.
 */
import { canonicalDocumentSchema, type CanonicalDocument } from "@/lib/schema";

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
              address: "Sasana Kriya Grand Ballroom, TMII, Jakarta Timur",
              buttonText: "Buka Petunjuk Arah Google Maps",
              latitude: -6.3024,
              longitude: 106.8952,
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
              address: "Pine Hill Garden, Lembang, Bandung Barat",
              buttonText: "Buka Lokasi di Google Maps",
              latitude: -6.8234,
              longitude: 107.6321,
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
              address: "Plataran Menteng, Jakarta Pusat",
              buttonText: "Lihat Peta Lokasi",
              latitude: -6.1952,
              longitude: 106.8329,
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

/** 4. Master Showcase (Complete All 13 Variable Types & All 14 System Widgets) */
export function createAllFeaturesShowcaseDocument(): CanonicalDocument {
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
      audio: {
        enabled: true,
        src: "https://actions.google.com/sounds/v1/ambiences/wind_chimes.ogg",
        title: "Canon in D - Romantic Acoustic Orchestra",
        position: "bottom-right",
        loop: true,
        autoplayOnOpen: true,
      },
    },
    variables: [
      // 1. Text
      {
        key: "event.title",
        type: "text",
        label: "Judul Acara",
        description: "Judul utama perayaan pernikahan",
        default: "The Grand Wedding Celebration",
        required: true,
      },
      {
        key: "couple.groomName",
        type: "text",
        label: "Nama Pengantin Pria",
        default: "Arya Wijaya Pratama",
        required: true,
      },
      {
        key: "couple.brideName",
        type: "text",
        label: "Nama Pengantin Wanita",
        default: "dr. Nabila Putri Saraswati",
        required: true,
      },
      {
        key: "event.location.address",
        type: "text",
        label: "Alamat Lengkap Lokasi Acara",
        default: "Grand Ballroom Hotel Indonesia Kempinski, Jl. M.H. Thamrin No. 1, Jakarta Pusat",
        required: true,
      },
      {
        key: "gift.bank",
        type: "text",
        label: "Jenis Rekening / Bank (Utama)",
        default: "BCA",
        required: true,
      },
      {
        key: "gift.accountNumber",
        type: "text",
        label: "Nomor Rekening (Utama)",
        default: "5420198821",
        required: true,
      },
      {
        key: "gift.accountName",
        type: "text",
        label: "Atas Nama Rekening (Utama)",
        default: "Arya Wijaya",
        required: true,
      },
      {
        key: "audio.title",
        type: "text",
        label: "Judul Lagu Musik",
        default: "Canon in D - Romantic Acoustic Orchestra",
        required: true,
      },
      // 2. RichText
      {
        key: "story.content",
        type: "richText",
        label: "Kisah Perjalanan Cinta (Rich Text)",
        description: "Format teks kaya dengan penekanan kata bercetak tebal dan miring",
        default: [
          { text: "Pertemuan pertama kami bersemi pada tahun 2020 di Jakarta. ", bold: false },
          { text: "Setelah 6 tahun merajut komitmen bersama dalam suka dan duka, ", bold: true },
          { text: "kini kami siap melangkah ke jenjang suci pernikahan.", italic: true },
        ],
        required: false,
      },
      // 3. Number
      {
        key: "event.location.lat",
        type: "number",
        label: "Latitude Koordinat Lokasi",
        default: -6.1952,
        required: true,
      },
      {
        key: "event.location.lng",
        type: "number",
        label: "Longitude Koordinat Lokasi",
        default: 106.8231,
        required: true,
      },
      {
        key: "event.maxPartySize",
        type: "number",
        label: "Maksimal Tamu per Undangan",
        default: 5,
        integer: true,
        required: false,
      },
      // 4. Date
      {
        key: "event.date",
        type: "date",
        label: "Tanggal Acara (ISO)",
        description: "Format kalender tanggal resmi YYYY-MM-DD",
        default: "2026-12-25",
        required: true,
      },
      // 5. Datetime
      {
        key: "event.datetime",
        type: "datetime",
        label: "Waktu & Tanggal Acara Lengkap",
        description: "Waktu mulai acara dengan zona waktu IANA",
        default: {
          local: "2026-12-25T09:00",
          timeZone: "Asia/Jakarta",
        },
        required: true,
      },
      // 6. Image
      {
        key: "couple.heroPhoto",
        type: "image",
        label: "Foto Sampul Utama",
        description: "Aset foto utama pengantin",
        default: { assetId: "a0000000-0000-4000-8000-000000000001" },
        required: false,
      },
      // 7. URL
      {
        key: "audio.url",
        type: "url",
        label: "Link / URL Audio Lagu",
        default: "https://actions.google.com/sounds/v1/ambiences/wind_chimes.ogg",
        required: true,
      },
      {
        key: "event.liveStreaming",
        type: "url",
        label: "Link Siaran Langsung (YouTube Live)",
        default: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        required: false,
      },
      // 8. Color
      {
        key: "theme.primaryColor",
        type: "color",
        label: "Warna Utama Tema",
        default: "#D4AF37",
        required: false,
      },
      // 9. Boolean
      {
        key: "feature.showLiveStream",
        type: "boolean",
        label: "Tampilkan Siaran Langsung",
        default: true,
        required: false,
      },
      // 10. Coordinate
      {
        key: "venue.exactCoords",
        type: "coordinate",
        label: "Titik Koordinat Presisi Gedung",
        default: {
          lat: -6.1952,
          lng: 106.8231,
        },
        required: false,
      },
      // 11. Select
      {
        key: "event.dressCode",
        type: "select",
        label: "Kode Busana Tamu",
        description: "Pilihan panduan busana bagi tamu undangan",
        options: [
          { value: "formal_batik", label: "Batik Formal / Nusantara" },
          { value: "black_tie", label: "Black Tie / Jas & Gaun Malam" },
          { value: "pastel_earth", label: "Pastel & Earth Tone Elegan" },
        ],
        default: "formal_batik",
        required: false,
      },
      // 12. Collection
      {
        key: "gift.accountsList",
        type: "collection",
        label: "Daftar Rekening Hadiah",
        description: "Koleksi rekening bank dan e-wallet penerima tanda kasih",
        fields: [
          { key: "bank", label: "Bank / E-Wallet", type: "text", required: true },
          { key: "accountNumber", label: "Nomor Rekening", type: "text", required: true },
          { key: "accountName", label: "Atas Nama", type: "text", required: true },
        ],
        maxItems: 10,
        default: [
          { bank: "BCA", accountNumber: "5420198821", accountName: "Arya Wijaya" },
          { bank: "Bank Mandiri", accountNumber: "1370009876543", accountName: "Nabila Putri" },
          { bank: "DANA / QRIS", accountNumber: "081234567890", accountName: "Arya Wijaya" },
        ],
        required: false,
      },
      // 13. Guest Context
      {
        key: "guest.name",
        type: "guest-context",
        label: "Nama Tamu Undangan",
        description: "Nama tamu yang disematkan secara dinamis pada link undangan",
      },
    ],
    sections: [
      // Section 0: Cover Pembuka (Opening Screen) - Features Widget 1: guestGreeting
      {
        id: "sec_sh_cover",
        name: "Cover Pembuka",
        baseHeight: 844,
        isOpening: true,
        background: { color: { token: "darkWalnut" } },
        elements: [
          {
            id: "el_sh_tag",
            type: "text",
            frame: { x: 20, y: 70, w: 350, h: 30, rotation: 0 },
            content: { segments: [{ text: "THE WEDDING CELEBRATION OF" }] },
            style: {
              fontSize: 12,
              letterSpacing: 6,
              color: { token: "gold" },
              textAlign: "center",
              fontWeight: 600,
            },
          },
          {
            id: "el_sh_title",
            type: "text",
            frame: { x: 20, y: 120, w: 350, h: 90, rotation: 0 },
            content: { segments: [{ text: "Arya & Nabila" }] },
            style: {
              fontSize: 40,
              fontWeight: 700,
              fontFamily: { token: "display" },
              color: { token: "goldLight" },
              textAlign: "center",
            },
          },
          {
            id: "el_sh_date",
            type: "text",
            frame: { x: 20, y: 225, w: 350, h: 30, rotation: 0 },
            content: {
              segments: [
                {
                  bind: "event.date",
                  formatter: { name: "date", style: "full" },
                },
              ],
            },
            style: {
              fontSize: 14,
              letterSpacing: 3,
              color: { token: "gold" },
              textAlign: "center",
              fontWeight: 500,
            },
          },
          {
            id: "el_sh_line",
            type: "shape",
            shapeType: "line",
            frame: { x: 120, y: 275, w: 150, h: 2, rotation: 0 },
            style: {
              stroke: { color: "#D4AF37", width: 1 },
              opacity: 0.6,
            },
          },
          // Widget 1: guestGreeting (P0)
          {
            id: "wdg_sh_greeting",
            type: "widget",
            widgetType: "guestGreeting",
            frame: { x: 25, y: 360, w: 340, h: 140, rotation: 0 },
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
            id: "el_sh_hint",
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

      // Section 1: Blessing & Story Showcase (Demonstrating richText, select, coordinate, text bindings)
      {
        id: "sec_sh_story",
        name: "Ayat Suci & Cerita Cinta",
        baseHeight: 680,
        background: { color: { token: "surface" } },
        elements: [
          {
            id: "el_sh_arabic",
            type: "text",
            frame: { x: 20, y: 40, w: 350, h: 45, rotation: 0 },
            content: { segments: [{ text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ" }] },
            style: {
              fontSize: 22,
              color: { token: "gold" },
              textAlign: "center",
            },
          },
          {
            id: "el_sh_ayat_title",
            type: "text",
            frame: { x: 20, y: 95, w: 350, h: 25, rotation: 0 },
            content: { segments: [{ text: "SURAH AR-RUM : 21" }] },
            style: {
              fontSize: 12,
              letterSpacing: 4,
              fontWeight: 600,
              color: { token: "gold" },
              textAlign: "center",
            },
          },
          {
            id: "el_sh_ayat_quote",
            type: "text",
            frame: { x: 25, y: 130, w: 340, h: 150, rotation: 0 },
            content: {
              segments: [
                {
                  text: "Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.",
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
            id: "el_sh_story_head",
            type: "text",
            frame: { x: 20, y: 310, w: 350, h: 35, rotation: 0 },
            content: { segments: [{ text: "Kisah Perjalanan Kasih" }] },
            style: {
              fontSize: 22,
              fontWeight: 700,
              fontFamily: { token: "display" },
              color: { token: "goldLight" },
              textAlign: "center",
            },
          },
          {
            id: "el_sh_story_body",
            type: "text",
            frame: { x: 25, y: 360, w: 340, h: 140, rotation: 0 },
            content: {
              segments: [
                {
                  text: "Pertemuan pertama kami bersemi pada tahun 2020 di Jakarta. Setelah 6 tahun merajut komitmen bersama dalam suka dan duka, kini dengan penuh rasa syukur kami melangkah ke jenjang suci pernikahan.",
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
          // Card showing Select & Coordinate variables
          {
            id: "el_sh_card_bg",
            type: "shape",
            shapeType: "rectangle",
            frame: { x: 25, y: 530, w: 340, h: 110, rotation: 0 },
            style: {
              fill: "#2D231F",
              radius: 12,
              stroke: { color: "#D4AF37", width: 1 },
              opacity: 0.8,
            },
          },
          {
            id: "el_sh_dresscode_text",
            type: "text",
            frame: { x: 35, y: 545, w: 320, h: 35, rotation: 0 },
            content: {
              segments: [
                { text: "Dress Code: " },
                {
                  bind: "event.dressCode",
                  formatter: { name: "uppercase" },
                },
              ],
            },
            style: {
              fontSize: 13,
              fontWeight: 600,
              color: { token: "goldLight" },
              textAlign: "center",
            },
          },
          {
            id: "el_sh_venue_coords",
            type: "text",
            frame: { x: 35, y: 585, w: 320, h: 40, rotation: 0 },
            content: {
              segments: [
                { text: "Titik Koordinat: Lat -6.1952, Lng 106.8231 (DKI Jakarta)" },
              ],
            },
            style: {
              fontSize: 12,
              color: { token: "muted" },
              textAlign: "center",
            },
          },
        ],
      },

      // Section 2: Profil Mempelai & Bingkai - Features Widget 2 (coupleProfile), Widget 3 (ornamentFrame), Widget 4 (photoFrame)
      {
        id: "sec_sh_couple",
        name: "Profil Mempelai & Bingkai",
        baseHeight: 1450,
        background: { color: { token: "darkWalnut" } },
        elements: [
          {
            id: "el_sh_cp_sub",
            type: "text",
            frame: { x: 20, y: 40, w: 350, h: 25, rotation: 0 },
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
            id: "el_sh_cp_head",
            type: "text",
            frame: { x: 20, y: 70, w: 350, h: 45, rotation: 0 },
            content: { segments: [{ text: "Pasangan Mempelai" }] },
            style: {
              fontSize: 28,
              fontWeight: 700,
              fontFamily: { token: "display" },
              color: { token: "goldLight" },
              textAlign: "center",
            },
          },
          // Widget 2: coupleProfile (P1)
          {
            id: "wdg_sh_couple",
            type: "widget",
            widgetType: "coupleProfile",
            frame: { x: 20, y: 130, w: 350, h: 660, rotation: 0 },
            props: {
              order: "groom-first",
              connector: "&",
              nameFont: "Cinzel",
              showParents: true,
              showInstagram: true,
              groom: {
                name: "Arya",
                fullName: "Arya Wijaya Pratama, S.T., M.Kom.",
                role: "Mempelai Pria",
                parents: "Putra pertama dari Bpk. Bambang Wijaya & Ibu Endang Sulastri",
                instagram: "aryawijaya",
              },
              bride: {
                name: "Nabila",
                fullName: "dr. Nabila Putri Saraswati",
                role: "Mempelai Wanita",
                parents: "Putri kedua dari Bpk. Ir. H. Hartono & Ibu Hj. Siti Aminah",
                instagram: "nabilaputri",
              },
            },
            style: {
              color: "#F3E5AB",
              background: "#241C19",
              radius: 20,
            },
          },
          {
            id: "el_sh_of_heading",
            type: "text",
            frame: { x: 20, y: 815, w: 350, h: 35, rotation: 0 },
            content: { segments: [{ text: "Bingkai Ornamen Artistik" }] },
            style: {
              fontSize: 20,
              fontWeight: 700,
              fontFamily: { token: "display" },
              color: { token: "goldLight" },
              textAlign: "center",
            },
          },
          // Widget 3: ornamentFrame (P1)
          {
            id: "wdg_sh_ornament",
            type: "widget",
            widgetType: "ornamentFrame",
            frame: { x: 30, y: 865, w: 330, h: 320, rotation: 0 },
            props: {
              shape: "arch-window",
              innerGap: 12,
              cornerRadius: 24,
              fillOpacity: 100,
              strokeWidth: 2,
              doubleBorder: true,
              transparentGap: false,
              animationMode: "once",
              animationSpeed: "normal",
              image: "/images/template-boho.jpg",
              imageOpacity: 100,
            },
            style: {
              color: "#D4AF37",
              background: "#241C19",
            },
          },
          {
            id: "el_sh_pf_heading",
            type: "text",
            frame: { x: 20, y: 1210, w: 350, h: 30, rotation: 0 },
            content: { segments: [{ text: "Bingkai Foto Potret" }] },
            style: {
              fontSize: 18,
              fontWeight: 600,
              color: { token: "goldLight" },
              textAlign: "center",
            },
          },
          // Widget 4: photoFrame (P1)
          {
            id: "wdg_sh_photoframe",
            type: "widget",
            widgetType: "photoFrame",
            frame: { x: 35, y: 1255, w: 320, h: 160, rotation: 0 },
            props: {
              image: "/images/template-botanical.jpg",
              caption: "Momen Bahagia Arya & Nabila",
              fit: "cover",
              alt: "Foto Kenangan Mempelai",
            },
            style: {
              radius: 16,
              background: "#241C19",
            },
          },
        ],
      },

      // Section 3: Waktu, Countdown, Rundown & Peta - Features Widget 5 (countdown), Widget 6 (timeline), Widget 7 (map)
      {
        id: "sec_sh_events",
        name: "Rangkaian Acara & Peta Lokasi",
        baseHeight: 1140,
        background: { color: { token: "surface" } },
        elements: [
          {
            id: "el_sh_ev_sub",
            type: "text",
            frame: { x: 20, y: 40, w: 350, h: 25, rotation: 0 },
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
            id: "el_sh_ev_head",
            type: "text",
            frame: { x: 20, y: 70, w: 350, h: 45, rotation: 0 },
            content: { segments: [{ text: "Waktu & Tempat Acara" }] },
            style: {
              fontSize: 28,
              fontWeight: 700,
              fontFamily: { token: "display" },
              color: { token: "goldLight" },
              textAlign: "center",
            },
          },
          // Widget 5: countdown (P0) bound to datetime variable event.datetime
          {
            id: "wdg_sh_countdown",
            type: "widget",
            widgetType: "countdown",
            frame: { x: 25, y: 130, w: 340, h: 120, rotation: 0 },
            props: {
              targetDateTime: { bind: "event.datetime" },
              labels: { days: "Hari", hours: "Jam", minutes: "Menit", seconds: "Detik" },
              afterState: "message",
              afterMessage: "Acara Sedang / Telah Berlangsung",
            },
            style: {
              color: "#F3E5AB",
              background: "#2D231F",
              radius: 16,
            },
          },
          // Widget 6: timeline (P1)
          {
            id: "wdg_sh_timeline",
            type: "widget",
            widgetType: "timeline",
            frame: { x: 25, y: 275, w: 340, h: 440, rotation: 0 },
            props: {
              title: "Rundown Acara",
              subtitle: "Rangkaian Prosesi Ijab Kabul & Resepsi",
              events: [
                {
                  time: "08:00 - 10:00 WIB",
                  title: "Akad Nikah",
                  description: "Prosesi Ijab Kabul & Doa Bersama Keluarga Besar",
                  location: "Masjid Raya Kempinski",
                  icon: "ring",
                },
                {
                  time: "11:00 - 14:00 WIB",
                  title: "Resepsi Pernikahan",
                  description: "Ramah tamah, santap siang & ucapan selamat bahagia",
                  location: "Grand Ballroom Kempinski Jakarta",
                  icon: "glass",
                },
                {
                  time: "19:00 - 21:00 WIB",
                  title: "After Party",
                  description: "Momen keakraban santai bersama sahabat & kerabat",
                  location: "Rooftop Garden Kempinski",
                  icon: "sparkles",
                },
              ],
            },
            style: {
              color: "#F3E5AB",
              background: "#241C19",
              radius: 16,
            },
          },
          // Widget 7: map (P0) bound to location variables
          {
            id: "wdg_sh_map",
            type: "widget",
            widgetType: "map",
            frame: { x: 25, y: 740, w: 340, h: 360, rotation: 0 },
            props: {
              latitude: { bind: "event.location.lat" },
              longitude: { bind: "event.location.lng" },
              address: { bind: "event.location.address" },
              label: "Grand Ballroom Hotel Indonesia Kempinski Jakarta",
              buttonText: "Buka Petunjuk Arah Google Maps",
            },
            style: {
              color: "#F3E5AB",
              background: "#241C19",
              radius: 16,
            },
          },
        ],
      },

      // Section 4: Media, Video & Animasi - Features Widget 8 (video), Widget 9 (gallery), Widget 10 (gif)
      {
        id: "sec_sh_media",
        name: "Video, Galeri & Animasi",
        baseHeight: 1100,
        background: { color: { token: "darkWalnut" } },
        elements: [
          {
            id: "el_sh_med_sub",
            type: "text",
            frame: { x: 20, y: 40, w: 350, h: 25, rotation: 0 },
            content: { segments: [{ text: "PORTFOLIO & MEMORI" }] },
            style: {
              fontSize: 12,
              letterSpacing: 4,
              fontWeight: 600,
              color: { token: "gold" },
              textAlign: "center",
            },
          },
          {
            id: "el_sh_med_head",
            type: "text",
            frame: { x: 20, y: 70, w: 350, h: 45, rotation: 0 },
            content: { segments: [{ text: "Video & Galeri Foto" }] },
            style: {
              fontSize: 28,
              fontWeight: 700,
              fontFamily: { token: "display" },
              color: { token: "goldLight" },
              textAlign: "center",
            },
          },
          // Widget 8: video (P1)
          {
            id: "wdg_sh_video",
            type: "widget",
            widgetType: "video",
            frame: { x: 25, y: 130, w: 340, h: 230, rotation: 0 },
            props: {
              sourceType: "youtube",
              url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
              caption: "Video Teaser Prewedding Arya & Nabila",
              autoplayOnScroll: false,
              loop: true,
              muted: true,
              showControls: true,
              aspectRatio: "16:9",
            },
            style: {
              color: "#F3E5AB",
              background: "#241C19",
              radius: 16,
            },
          },
          // Widget 9: gallery (P1)
          {
            id: "wdg_sh_gallery",
            type: "widget",
            widgetType: "gallery",
            frame: { x: 25, y: 385, w: 340, h: 360, rotation: 0 },
            props: {
              title: "Galeri Foto Kenangan Bahagia",
              layout: "grid",
              items: [
                { src: "/images/template-botanical.jpg", alt: "Momen Romantis 1" },
                { src: "/images/template-jawa.jpg", alt: "Momen Adat Nusantara 2" },
                { src: "/images/template-boho.jpg", alt: "Momen Sunset 3" },
              ],
            },
            style: {
              color: "#F3E5AB",
              background: "#241C19",
              radius: 16,
            },
          },
          {
            id: "el_sh_gif_label",
            type: "text",
            frame: { x: 20, y: 770, w: 350, h: 30, rotation: 0 },
            content: { segments: [{ text: "Stiker Animasi Cinta (GIF Widget)" }] },
            style: {
              fontSize: 16,
              fontWeight: 600,
              color: { token: "goldLight" },
              textAlign: "center",
            },
          },
          // Widget 10: gif (P1)
          {
            id: "wdg_sh_gif",
            type: "widget",
            widgetType: "gif",
            frame: { x: 85, y: 815, w: 220, h: 240, rotation: 0 },
            props: {
              url: "https://media.giphy.com/media/l41lO3n0gIuY7vM0E/giphy.gif",
              caption: "With Love & Happiness",
              fit: "contain",
              loop: true,
              alignment: "center",
            },
            style: {
              radius: 16,
              background: "#241C19",
            },
          },
        ],
      },

      // Section 5: Konfirmasi Kehadiran & Doa Restu - Features Widget 11 (rsvp), Widget 12 (wishes)
      {
        id: "sec_sh_rsvp_wishes",
        name: "RSVP & Buku Tamu",
        baseHeight: 960,
        background: { color: { token: "surface" } },
        elements: [
          {
            id: "el_sh_rw_sub",
            type: "text",
            frame: { x: 20, y: 40, w: 350, h: 25, rotation: 0 },
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
            id: "el_sh_rw_head",
            type: "text",
            frame: { x: 20, y: 70, w: 350, h: 45, rotation: 0 },
            content: { segments: [{ text: "RSVP & Buku Tamu" }] },
            style: {
              fontSize: 28,
              fontWeight: 700,
              fontFamily: { token: "display" },
              color: { token: "goldLight" },
              textAlign: "center",
            },
          },
          // Widget 11: rsvp (P1)
          {
            id: "wdg_sh_rsvp",
            type: "widget",
            widgetType: "rsvp",
            frame: { x: 25, y: 130, w: 340, h: 380, rotation: 0 },
            props: {
              title: "Konfirmasi Kehadiran Tamu",
              enablePartySize: true,
              enableMessage: true,
              maxParty: 5,
              deadline: {
                local: "2026-12-20T23:59",
                timeZone: "Asia/Jakarta",
              },
            },
            style: {
              color: "#F3E5AB",
              background: "#2D231F",
              radius: 16,
            },
          },
          // Widget 12: wishes (P1)
          {
            id: "wdg_sh_wishes",
            type: "widget",
            widgetType: "wishes",
            frame: { x: 25, y: 535, w: 340, h: 380, rotation: 0 },
            props: {
              title: "Untaian Doa & Ucapan",
              subtitle: "Doa restu Anda merupakan karunia yang sangat berarti bagi kami",
              maxDisplay: 6,
              items: [
                {
                  name: "Dimas & Sarah",
                  message: "Selamat menempuh hidup baru Arya & Nabila! Semoga senantiasa sakinah, mawaddah, warahmah. Bahagia selalu!",
                  presence: "hadir",
                  date: "Baru saja",
                },
                {
                  name: "Bpk. Ir. H. Hendra & Keluarga",
                  message: "Barakallahu lakum wa baraka 'alaikum wa jama'a bainakuma fii khoir. Selamat berbahagia untuk kedua mempelai dan keluarga besar.",
                  presence: "hadir",
                  date: "1 jam lalu",
                },
                {
                  name: "Citra Amelia",
                  message: "Happy wedding Arya & Nabila tercinta! Semoga dilancarkan semua niat baiknya sampai hari H dan langgeng selamanya 💕",
                  presence: "hadir",
                  date: "3 jam lalu",
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

      // Section 6: Amplop Digital, Penutup & Musik - Features Widget 13 (gift), Widget 14 (music)
      {
        id: "sec_sh_gift_footer",
        name: "Amplop Digital, Penutup & Musik",
        baseHeight: 920,
        background: { color: "#140F0E" },
        elements: [
          {
            id: "el_sh_gt_sub",
            type: "text",
            frame: { x: 20, y: 40, w: 350, h: 25, rotation: 0 },
            content: { segments: [{ text: "TANDA KASIH DIGITAL" }] },
            style: {
              fontSize: 12,
              letterSpacing: 4,
              fontWeight: 600,
              color: { token: "gold" },
              textAlign: "center",
            },
          },
          {
            id: "el_sh_gt_head",
            type: "text",
            frame: { x: 20, y: 70, w: 350, h: 45, rotation: 0 },
            content: { segments: [{ text: "Amplop Digital & Kado" }] },
            style: {
              fontSize: 28,
              fontWeight: 700,
              fontFamily: { token: "display" },
              color: { token: "goldLight" },
              textAlign: "center",
            },
          },
          // Widget 13: gift (P1) bound to gift variables
          {
            id: "wdg_sh_gift",
            type: "widget",
            widgetType: "gift",
            frame: { x: 25, y: 130, w: 340, h: 320, rotation: 0 },
            props: {
              title: "Kirim Hadiah & Tanda Kasih",
              bank: { bind: "gift.bank" },
              accountNumber: { bind: "gift.accountNumber" },
              accountName: { bind: "gift.accountName" },
              bank2: "Bank Mandiri",
              accountNumber2: "1370009876543",
              accountName2: "Nabila Putri",
              accounts: { bind: "gift.accountsList" },
            },
            style: {
              color: "#F3E5AB",
              background: "#241C19",
              radius: 16,
              variant: "gold-ornament",
            },
          },
          {
            id: "el_sh_closing_msg",
            type: "text",
            frame: { x: 25, y: 475, w: 340, h: 75, rotation: 0 },
            content: {
              segments: [
                {
                  text: "Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara(i) berkenan hadir untuk memberikan doa restu kepada kami berdua.",
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
            id: "el_sh_closing_names",
            type: "text",
            frame: { x: 20, y: 565, w: 350, h: 45, rotation: 0 },
            content: { segments: [{ text: "Arya & Nabila" }] },
            style: {
              fontSize: 32,
              fontWeight: 700,
              fontFamily: { token: "display" },
              color: { token: "goldLight" },
              textAlign: "center",
            },
          },
          // Widget 14: music (P1) bound to audio variables
          {
            id: "wdg_sh_music",
            type: "widget",
            widgetType: "music",
            frame: { x: 25, y: 630, w: 340, h: 80, rotation: 0 },
            props: {
              src: { bind: "audio.url" },
              title: { bind: "audio.title" },
              autoplay: true,
            },
            style: {
              color: "#F3E5AB",
              background: "#241C19",
              radius: 40,
            },
          },
          {
            id: "el_sh_credit",
            type: "text",
            frame: { x: 20, y: 740, w: 350, h: 30, rotation: 0 },
            content: {
              segments: [
                { text: "Digital Invitation Builder — All Features Master Showcase" },
              ],
            },
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

