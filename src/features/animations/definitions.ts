/**
 * Predefined Animation Presets (PRD §12, FR-ANM-001..004).
 *
 * Data-only definitions (P-09). All animations are transform/opacity-first
 * (NFR-PERF-001 / Rule 9) and never mutate layout-heavy attributes.
 */
import type { AnimationPreset } from "./types";

const ALL_ELEMENT_TYPES = ["text", "image", "shape", "widget"] as const;
const TEXT_ONLY = ["text"] as const;

export const P0_ENTER_PRESETS: readonly AnimationPreset[] = [
  {
    id: "fadeIn",
    category: "enter",
    label: "Pudar Masuk (Fade In)",
    description: "Elemen muncul perlahan dengan transisi opasitas murni.",
    applicableElements: ALL_ELEMENT_TYPES,
    defaultDurationMs: 600,
    defaultDelayMs: 0,
    defaultEasing: "power2.out",
    keyframes: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
  },
  {
    id: "slideUp",
    category: "enter",
    label: "Geser Naik (Slide Up)",
    description: "Elemen meluncur naik dari bawah ke posisi akhir.",
    applicableElements: ALL_ELEMENT_TYPES,
    defaultDurationMs: 700,
    defaultDelayMs: 0,
    defaultEasing: "power2.out",
    keyframes: {
      from: { opacity: 0, y: 40 },
      to: { opacity: 1, y: 0 },
    },
  },
  {
    id: "slideDown",
    category: "enter",
    label: "Geser Turun (Slide Down)",
    description: "Elemen meluncur turun dari atas ke posisi akhir.",
    applicableElements: ALL_ELEMENT_TYPES,
    defaultDurationMs: 700,
    defaultDelayMs: 0,
    defaultEasing: "power2.out",
    keyframes: {
      from: { opacity: 0, y: -40 },
      to: { opacity: 1, y: 0 },
    },
  },
  {
    id: "slideLeft",
    category: "enter",
    label: "Geser dari Kanan (Slide Left)",
    description: "Elemen meluncur dari arah kanan ke kiri.",
    applicableElements: ALL_ELEMENT_TYPES,
    defaultDurationMs: 700,
    defaultDelayMs: 0,
    defaultEasing: "power2.out",
    keyframes: {
      from: { opacity: 0, x: 40 },
      to: { opacity: 1, x: 0 },
    },
  },
  {
    id: "slideRight",
    category: "enter",
    label: "Geser dari Kiri (Slide Right)",
    description: "Elemen meluncur dari arah kiri ke kanan.",
    applicableElements: ALL_ELEMENT_TYPES,
    defaultDurationMs: 700,
    defaultDelayMs: 0,
    defaultEasing: "power2.out",
    keyframes: {
      from: { opacity: 0, x: -40 },
      to: { opacity: 1, x: 0 },
    },
  },
  {
    id: "zoomIn",
    category: "enter",
    label: "Perbesar Masuk (Zoom In)",
    description: "Elemen membesar perlahan dari skala 80% ke 100%.",
    applicableElements: ALL_ELEMENT_TYPES,
    defaultDurationMs: 650,
    defaultDelayMs: 0,
    defaultEasing: "back.out",
    keyframes: {
      from: { opacity: 0, scale: 0.8 },
      to: { opacity: 1, scale: 1 },
    },
  },
  {
    id: "rotateInSoft",
    category: "enter",
    label: "Rotasi Lembut (Rotate In Soft)",
    description: "Elemen berputar halus dan membesar masuk ke posisi kanonik.",
    applicableElements: ALL_ELEMENT_TYPES,
    defaultDurationMs: 800,
    defaultDelayMs: 0,
    defaultEasing: "power2.out",
    keyframes: {
      from: { opacity: 0, rotation: -8, scale: 0.95 },
      to: { opacity: 1, rotation: 0, scale: 1 },
    },
  },
];

export const TEXT_PRESETS: readonly AnimationPreset[] = [
  {
    id: "charFade",
    category: "text",
    label: "Teks Huruf Pudar (Char Fade)",
    description: "Teks muncul huruf demi huruf secara berurutan.",
    applicableElements: TEXT_ONLY,
    defaultDurationMs: 500,
    defaultDelayMs: 0,
    defaultEasing: "power1.out",
    defaultStaggerUnit: "char",
    defaultStaggerAmountMs: 40,
    keyframes: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
  },
  {
    id: "charRise",
    category: "text",
    label: "Teks Huruf Naik (Char Rise)",
    description: "Teks muncul huruf demi huruf sembari terangkat dari bawah.",
    applicableElements: TEXT_ONLY,
    defaultDurationMs: 600,
    defaultDelayMs: 0,
    defaultEasing: "back.out",
    defaultStaggerUnit: "char",
    defaultStaggerAmountMs: 45,
    keyframes: {
      from: { opacity: 0, y: 20 },
      to: { opacity: 1, y: 0 },
    },
  },
  {
    id: "wordReveal",
    category: "text",
    label: "Teks Muncul Kata (Word Reveal)",
    description: "Teks muncul bertahap kata demi kata.",
    applicableElements: TEXT_ONLY,
    defaultDurationMs: 650,
    defaultDelayMs: 0,
    defaultEasing: "power2.out",
    defaultStaggerUnit: "word",
    defaultStaggerAmountMs: 80,
    keyframes: {
      from: { opacity: 0, y: 15 },
      to: { opacity: 1, y: 0 },
    },
  },
  {
    id: "letterSpread",
    category: "text",
    label: "Teks Rentang Huruf (Letter Spread)",
    description: "Teks menyebar masuk dari arah samping per karakter.",
    applicableElements: TEXT_ONLY,
    defaultDurationMs: 600,
    defaultDelayMs: 0,
    defaultEasing: "power2.out",
    defaultStaggerUnit: "char",
    defaultStaggerAmountMs: 40,
    keyframes: {
      from: { opacity: 0, x: -10 },
      to: { opacity: 1, x: 0 },
    },
  },
];

export const ATTENTION_PRESETS: readonly AnimationPreset[] = [
  {
    id: "float",
    category: "attention",
    label: "Melayang (Float)",
    description: "Elemen melayang naik turun secara halus berulang.",
    applicableElements: ALL_ELEMENT_TYPES,
    defaultDurationMs: 1800,
    defaultDelayMs: 0,
    defaultEasing: "ease-in-out",
    loop: true,
    yoyo: true,
    keyframes: {
      from: { y: 0 },
      to: { y: -10 },
    },
  },
  {
    id: "pulseSoft",
    category: "attention",
    label: "Denyut Halus (Pulse Soft)",
    description: "Elemen membesar dan mengecil secara halus berulang.",
    applicableElements: ALL_ELEMENT_TYPES,
    defaultDurationMs: 1200,
    defaultDelayMs: 0,
    defaultEasing: "ease-in-out",
    loop: true,
    yoyo: true,
    keyframes: {
      from: { scale: 1 },
      to: { scale: 1.05 },
    },
  },
  {
    id: "sway",
    category: "attention",
    label: "Goyang Halus (Sway)",
    description: "Elemen berayun lembut kiri dan kanan berulang.",
    applicableElements: ALL_ELEMENT_TYPES,
    defaultDurationMs: 2000,
    defaultDelayMs: 0,
    defaultEasing: "ease-in-out",
    loop: true,
    yoyo: true,
    keyframes: {
      from: { rotation: -3 },
      to: { rotation: 3 },
    },
  },
];

export const EXIT_PRESETS: readonly AnimationPreset[] = [
  {
    id: "fadeOut",
    category: "exit",
    label: "Pudar Keluar (Fade Out)",
    description: "Elemen memudar hingga tidak tampak.",
    applicableElements: ALL_ELEMENT_TYPES,
    defaultDurationMs: 500,
    defaultDelayMs: 0,
    defaultEasing: "power2.out",
    keyframes: {
      from: { opacity: 1 },
      to: { opacity: 0 },
    },
  },
  {
    id: "slideOut",
    category: "exit",
    label: "Geser Keluar (Slide Out)",
    description: "Elemen meluncur ke bawah meninggalkan layar.",
    applicableElements: ALL_ELEMENT_TYPES,
    defaultDurationMs: 550,
    defaultDelayMs: 0,
    defaultEasing: "power2.out",
    keyframes: {
      from: { opacity: 1, y: 0 },
      to: { opacity: 0, y: 40 },
    },
  },
  {
    id: "zoomOut",
    category: "exit",
    label: "Mengecil Keluar (Zoom Out)",
    description: "Elemen mengecil hingga memudar habis.",
    applicableElements: ALL_ELEMENT_TYPES,
    defaultDurationMs: 500,
    defaultDelayMs: 0,
    defaultEasing: "power2.out",
    keyframes: {
      from: { opacity: 1, scale: 1 },
      to: { opacity: 0, scale: 0.8 },
    },
  },
];

export const ALL_PRESETS: readonly AnimationPreset[] = [
  ...P0_ENTER_PRESETS,
  ...TEXT_PRESETS,
  ...ATTENTION_PRESETS,
  ...EXIT_PRESETS,
];
