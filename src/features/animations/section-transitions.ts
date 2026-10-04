import type { SectionTransition, SectionTransitionType } from "@/lib/schema";

export interface SectionTransitionMeta {
  readonly id: SectionTransitionType;
  readonly label: string;
  readonly description: string;
  readonly category: "Dasar" | "Geser" | "Zoom & 3D" | "Sinematik";
  readonly iconName: string;
}

export const SECTION_TRANSITIONS_CATALOG: readonly SectionTransitionMeta[] = [
  {
    id: "none",
    label: "Tanpa Transisi",
    description: "Section langsung tampil statis tanpa efek gerakan.",
    category: "Dasar",
    iconName: "none",
  },
  {
    id: "fade",
    label: "Pudar Halus (Fade)",
    description: "Section memudar lembut ke opasitas penuh saat masuk layar.",
    category: "Dasar",
    iconName: "fade",
  },
  {
    id: "slideUp",
    label: "Geser Naik (Slide Up)",
    description: "Section meluncur anggun dari bawah ke atas.",
    category: "Geser",
    iconName: "slideUp",
  },
  {
    id: "slideDown",
    label: "Geser Turun (Slide Down)",
    description: "Section meluncur turun dari atas ke posisi normal.",
    category: "Geser",
    iconName: "slideDown",
  },
  {
    id: "slideLeft",
    label: "Geser Masuk Kiri (Slide Left)",
    description: "Section meluncur dari sisi kanan layar ke tengah.",
    category: "Geser",
    iconName: "slideLeft",
  },
  {
    id: "slideRight",
    label: "Geser Masuk Kanan (Slide Right)",
    description: "Section meluncur dari sisi kiri layar ke tengah.",
    category: "Geser",
    iconName: "slideRight",
  },
  {
    id: "zoomIn",
    label: "Membesar Masuk (Zoom In)",
    description: "Section membesar perlahan dari skala 88% ke ukuran utuh.",
    category: "Zoom & 3D",
    iconName: "zoomIn",
  },
  {
    id: "zoomOut",
    label: "Mengecil Masuk (Zoom Out)",
    description: "Section mengecil perlahan dari skala 112% ke ukuran utuh.",
    category: "Zoom & 3D",
    iconName: "zoomOut",
  },
  {
    id: "flipUp",
    label: "Balik 3D Bawah (Flip Up)",
    description: "Section berputar 3D ke depan dengan perspektif panggung megah.",
    category: "Zoom & 3D",
    iconName: "flipUp",
  },
  {
    id: "flipDown",
    label: "Balik 3D Atas (Flip Down)",
    description: "Section berputar 3D dari atas menghadap pemirsa.",
    category: "Zoom & 3D",
    iconName: "flipDown",
  },
  {
    id: "curtain",
    label: "Tirai Terbuka (Curtain)",
    description: "Sapuan tirai elegan membuka visual section dari atas ke bawah.",
    category: "Sinematik",
    iconName: "curtain",
  },
  {
    id: "blur",
    label: "Fokus Lensa (Blur to Clear)",
    description: "Efek kamera sinematik dari blur lembut menjadi tajam.",
    category: "Sinematik",
    iconName: "blur",
  },
  {
    id: "book",
    label: "Lipatan Buku (Book Fold)",
    description: "Efek visual membuka lipatan kartu undangan mewah.",
    category: "Sinematik",
    iconName: "book",
  },
];

export const EASING_OPTIONS = [
  { value: "cubic-bezier(0.16, 1, 0.3, 1)", label: "Halus Elegan (Smooth Out)" },
  { value: "cubic-bezier(0.65, 0, 0.35, 1)", label: "Masuk-Keluar (Ease In Out)" },
  { value: "cubic-bezier(0.34, 1.56, 0.64, 1)", label: "Membal Lembut (Soft Bounce)" },
  { value: "linear", label: "Konstan (Linear)" },
] as const;

export function getSectionTransitionMeta(id: SectionTransitionType | undefined): SectionTransitionMeta {
  const found = SECTION_TRANSITIONS_CATALOG.find((t) => t.id === id);
  return found ?? SECTION_TRANSITIONS_CATALOG[0]!;
}

/**
 * Returns CSS properties for transition initial vs visible state.
 */
export function getSectionTransitionStyles(
  transition?: SectionTransition,
  isVisible = true,
): React.CSSProperties {
  if (!transition || transition.type === "none") {
    return {};
  }

  const duration = `${transition.durationMs}ms`;
  const delay = `${transition.delayMs}ms`;
  const ease = transition.easing || "cubic-bezier(0.16, 1, 0.3, 1)";

  const transitionProp = [
    `opacity ${duration} ${ease} ${delay}`,
    `transform ${duration} ${ease} ${delay}`,
    `filter ${duration} ${ease} ${delay}`,
    `clip-path ${duration} ${ease} ${delay}`,
  ].join(", ");

  const baseStyle: React.CSSProperties = {
    transition: transitionProp,
    willChange: "opacity, transform",
  };

  if (isVisible) {
    return {
      ...baseStyle,
      opacity: 1,
      transform: "none",
      filter: "none",
      clipPath: "inset(0 0 0 0)",
    };
  }

  // Hidden state before entering viewport
  switch (transition.type) {
    case "fade":
      return { ...baseStyle, opacity: 0 };
    case "slideUp":
      return { ...baseStyle, opacity: 0, transform: "translateY(60px)" };
    case "slideDown":
      return { ...baseStyle, opacity: 0, transform: "translateY(-60px)" };
    case "slideLeft":
      return { ...baseStyle, opacity: 0, transform: "translateX(70px)" };
    case "slideRight":
      return { ...baseStyle, opacity: 0, transform: "translateX(-70px)" };
    case "zoomIn":
      return { ...baseStyle, opacity: 0, transform: "scale(0.88)" };
    case "zoomOut":
      return { ...baseStyle, opacity: 0, transform: "scale(1.12)" };
    case "flipUp":
      return {
        ...baseStyle,
        opacity: 0,
        transform: "perspective(1000px) rotateX(25deg)",
        transformOrigin: "center bottom",
      };
    case "flipDown":
      return {
        ...baseStyle,
        opacity: 0,
        transform: "perspective(1000px) rotateX(-25deg)",
        transformOrigin: "center top",
      };
    case "curtain":
      return {
        ...baseStyle,
        opacity: 0,
        clipPath: "inset(0 0 100% 0)",
        transform: "translateY(20px)",
      };
    case "blur":
      return {
        ...baseStyle,
        opacity: 0,
        filter: "blur(14px)",
        transform: "scale(0.97)",
      };
    case "book":
      return {
        ...baseStyle,
        opacity: 0,
        transform: "perspective(1200px) rotateY(-22deg)",
        transformOrigin: "left center",
      };
    default:
      return baseStyle;
  }
}
