/**
 * Shared types of the document engine (pure, framework-free).
 *
 * PRD refs: FR-VAR-002, FR-VAR-003, FR-INV-002, P-02, P-03.
 * Invitation data and the canonical template are SEPARATE inputs (P-02): the
 * engine never stores or caches client data inside the template.
 */

/**
 * Invitation (client) data, keyed by the stable dot-path variable key, e.g.
 * `{ "couple.bride.nickname": "Anin" }`. Values are untrusted until validated.
 */
export type InvitationData = Readonly<Record<string, unknown>>;

/**
 * Runtime guest context (PRD section 10: `guest.name` is "runtime").
 * Field `name` is addressed from bindings as `guest.name`.
 */
export interface GuestData {
  readonly name?: string | undefined;
}

export type DataIssueCode = "missing_required" | "wrong_type" | "unknown_key";

/** Problem found while validating invitation data against variable definitions. */
export interface DataIssue {
  readonly key: string;
  readonly code: DataIssueCode;
  readonly message: string;
}

export type ResolveIssueCode =
  "missing_required" | "invalid_value" | "unknown_variable" | "formatter_incompatible";

/** Problem found while resolving a binding inside a document. */
export interface ResolveIssue {
  readonly code: ResolveIssueCode;
  readonly key: string;
  readonly message: string;
  /** Pointer into the canonical document, when resolving a whole document. */
  readonly path?: readonly (string | number)[];
  readonly sectionId?: string;
  readonly elementId?: string;
}

/** Issue codes that make a resolved document unfit for publishing. */
export const BLOCKING_RESOLVE_CODES: ReadonlySet<ResolveIssueCode> = new Set([
  "missing_required",
  "invalid_value",
  "unknown_variable",
]);
