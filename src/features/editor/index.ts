/** Public entry point for `src/features/editor`. Core logic is pure; UI lives in `components/`. */
export { EditorShell, type EditorShellProps } from "./components/EditorShell";
export { createEditorStore } from "./core/store";
export { createAutosaver, type SaveResult } from "./core/autosave";
