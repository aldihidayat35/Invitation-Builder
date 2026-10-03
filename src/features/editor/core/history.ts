/**
 * Undo/redo history (FR-EDT-004: at least 50 actions per session).
 *
 * Immutable structure over committed snapshots only. Transient pointer state
 * (drag/resize in progress) never enters history: callers commit once at
 * pointer end. Snapshots share structure (ops copy only what changes), so 100
 * entries stay cheap.
 */

export const HISTORY_LIMIT = 100;

export interface History<T> {
  readonly past: readonly T[];
  readonly present: T;
  readonly future: readonly T[];
  /** Key of the last commit, used to coalesce rapid edits of the same field. */
  readonly lastKey: string | null;
}

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [], lastKey: null };
}

export interface CommitOptions {
  /** Consecutive commits with the same key replace each other (one undo step). */
  readonly coalesceKey?: string;
  readonly limit?: number;
}

export function commit<T>(history: History<T>, next: T, options: CommitOptions = {}): History<T> {
  if (Object.is(next, history.present)) return history;
  const key = options.coalesceKey ?? null;
  const limit = options.limit ?? HISTORY_LIMIT;

  if (key !== null && key === history.lastKey && history.past.length > 0) {
    // Same field edited again: keep the original "before" snapshot.
    return { past: history.past, present: next, future: [], lastKey: key };
  }
  const past = [...history.past, history.present];
  return {
    past: past.length > limit ? past.slice(past.length - limit) : past,
    present: next,
    future: [],
    lastKey: key,
  };
}

export const canUndo = (h: History<unknown>) => h.past.length > 0;
export const canRedo = (h: History<unknown>) => h.future.length > 0;

export function undo<T>(history: History<T>): History<T> {
  const previous = history.past[history.past.length - 1];
  if (previous === undefined) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
    lastKey: null,
  };
}

export function redo<T>(history: History<T>): History<T> {
  const next = history.future[0];
  if (next === undefined) return history;
  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
    lastKey: null,
  };
}
