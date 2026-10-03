/**
 * Implementation roadmap shown on the dashboard placeholder.
 * Source: Prompt_Implementasi_Bertahap v1.0 (phase list). This is product
 * delivery metadata only — it contains no invitation/client data (P-02).
 */
export type PhaseStatus = "done" | "in-progress" | "planned";

export interface RoadmapPhase {
  readonly id: `F${number}`;
  readonly title: string;
  readonly prdTargets: readonly string[];
  readonly status: PhaseStatus;
}

export const ROADMAP_PHASES: readonly RoadmapPhase[] = [
  {
    id: "F0",
    title: "Bootstrap & Requirement Traceability",
    prdTargets: ["P-01", "P-03", "P-04", "P-07", "P-09"],
    status: "done",
  },
  {
    id: "F1",
    title: "Data Model, Schemas & Foundation",
    prdTargets: ["FR-TPL-002", "FR-VAR-001", "FR-WDG-001", "NFR-REL-001"],
    status: "done",
  },
  {
    id: "F2",
    title: "Auth, Workspace & Template Library",
    prdTargets: ["FR-AUTH-001", "FR-TPL-001", "FR-TPL-003", "FR-AUD-001"],
    status: "done",
  },
  {
    id: "F3",
    title: "Canonical Document Engine & Variable Binding",
    prdTargets: ["FR-VAR-002", "FR-VAR-003", "FR-INV-002"],
    status: "done",
  },
  {
    id: "F4",
    title: "Editor Core",
    prdTargets: ["FR-EDT-001", "FR-EDT-004", "FR-EDT-009", "AC-08"],
    status: "done",
  },
  {
    id: "F5",
    title: "Asset Pipeline & Image Elements",
    prdTargets: ["FR-EDT-008", "FR-AST-001", "NFR-SEC-002"],
    status: "done",
  },
  {
    id: "F6",
    title: "Widget Registry & P0 Widgets",
    prdTargets: ["FR-WDG-002", "FR-WDG-003", "FR-WDG-004"],
    status: "done",
  },
  {
    id: "F7",
    title: "Animation System",
    prdTargets: ["FR-ANM-001", "FR-ANM-004", "AC-07"],
    status: "done",
  },
  {
    id: "F8",
    title: "Invitation Data Mode, Guest Context & Preview",
    prdTargets: ["FR-INV-001", "FR-GST-002", "FR-PRV-001"],
    status: "done",
  },
  {
    id: "F9",
    title: "HTML Public Renderer & Publishing",
    prdTargets: ["FR-INV-004", "FR-PUB-001", "AC-10", "AC-12"],
    status: "in-progress",
  },
  {
    id: "F10",
    title: "P1 Widgets: RSVP, Gallery, Music, Gift",
    prdTargets: ["FR-WDG-005", "FR-WDG-008", "FR-GST-001"],
    status: "planned",
  },
  {
    id: "F11",
    title: "Hardening, Performance, Security & QA",
    prdTargets: ["NFR-PERF-002", "NFR-A11Y-001", "AC-15"],
    status: "planned",
  },
  {
    id: "F12",
    title: "Production Readiness & Release",
    prdTargets: ["NFR-BACKUP-001", "NFR-OBS-001"],
    status: "planned",
  },
];
