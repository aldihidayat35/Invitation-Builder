import type { ImportPlan } from "../csv";

/** Result shape returned by invitation server actions to `useActionState`. */
export interface ActionState {
  ok?: boolean;
  message?: string;
  error?: string;
}

export type InvitationAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/** Result of an autosave round trip (Data Mode). */
export interface SaveDataState {
  readonly ok: boolean;
  /** Validation message per variable key (required/type); saving still succeeds for required gaps. */
  readonly errors: Readonly<Record<string, string>>;
  readonly error?: string;
}

export type SaveDataAction = (
  invitationId: string,
  values: Record<string, string>,
) => Promise<SaveDataState>;

/** Result of the guest CSV import preview/commit (FR-GST-001). */
export interface ImportState {
  readonly error?: string;
  readonly plan?: ImportPlan;
  /** Guests created by the last commit (undefined for previews). */
  readonly created?: number;
}

export type ImportAction = (prev: ImportState, formData: FormData) => Promise<ImportState>;
