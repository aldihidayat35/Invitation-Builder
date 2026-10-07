/**
 * Component and Unit tests for Editor Dual Theme: Light and Netflix Dark Neon.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TopBar } from "@/features/editor/components/TopBar";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import {
  createEditorStore,
  EDITOR_THEME_STORAGE_KEY,
  getInitialEditorTheme,
} from "@/features/editor/core/store";
import { fullDocument } from "../../helpers/documents";
import { canonicalDocumentSchema, type CanonicalDocument } from "@/lib/schema";

describe("Editor Dual Theme (Light vs Netflix Dark Neon)", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-editor-theme");
    document.body.removeAttribute("data-editor-theme");
  });

  function setup(initialTheme?: "light" | "dark") {
    const rawDoc = fullDocument();
    const doc: CanonicalDocument = canonicalDocumentSchema.parse(rawDoc);
    const store = createEditorStore({
      document: doc,
      revision: 1,
      theme: initialTheme,
    });
    const currentRevision = vi.fn().mockResolvedValue(1);

    const utils = render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <TopBar
          templateId="tmpl_theme_test"
          templateName="Wedding Invitation"
          currentRevision={currentRevision}
        />
      </EditorProvider>,
    );

    return { ...utils, store, doc };
  }

  it("defaults to light theme and syncs with localStorage", () => {
    expect(getInitialEditorTheme()).toBe("light");

    localStorage.setItem(EDITOR_THEME_STORAGE_KEY, "dark");
    expect(getInitialEditorTheme()).toBe("dark");

    const rawDoc = fullDocument();
    const doc = canonicalDocumentSchema.parse(rawDoc);
    // SSR-safe default: createEditorStore defaults to "light" to match server render
    const store = createEditorStore({ document: doc, revision: 1 });
    expect(store.getState().theme).toBe("light");

    // Explicit theme initialization
    const customStore = createEditorStore({ document: doc, revision: 1, theme: "dark" });
    expect(customStore.getState().theme).toBe("dark");

    // Synchronizing from localStorage after mount
    store.getState().syncThemeFromStorage();
    expect(store.getState().theme).toBe("dark");

    store.getState().setTheme("light");
    expect(store.getState().theme).toBe("light");
    expect(localStorage.getItem(EDITOR_THEME_STORAGE_KEY)).toBe("light");
    expect(document.documentElement.getAttribute("data-editor-theme")).toBe("light");
  });

  it("renders theme toggle buttons with active state in TopBar", () => {
    const { store } = setup("light");

    const lightBtn = screen.getByTestId("theme-toggle-light");
    const darkBtn = screen.getByTestId("theme-toggle-dark");

    expect(lightBtn).toBeInTheDocument();
    expect(darkBtn).toBeInTheDocument();
    expect(lightBtn.getAttribute("data-active")).toBe("true");
    expect(darkBtn.getAttribute("data-active")).toBe("false");

    // Click dark button to switch to Netflix Dark Neon
    fireEvent.click(darkBtn);

    expect(store.getState().theme).toBe("dark");
    expect(darkBtn.getAttribute("data-active")).toBe("true");
    expect(lightBtn.getAttribute("data-active")).toBe("false");
    expect(localStorage.getItem(EDITOR_THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.getAttribute("data-editor-theme")).toBe("dark");

    // Switch back to light
    fireEvent.click(lightBtn);

    expect(store.getState().theme).toBe("light");
    expect(lightBtn.getAttribute("data-active")).toBe("true");
    expect(darkBtn.getAttribute("data-active")).toBe("false");
    expect(localStorage.getItem(EDITOR_THEME_STORAGE_KEY)).toBe("light");
  });

  it("syncThemeFromStorage loads theme saved by another session", () => {
    const rawDoc = fullDocument();
    const doc = canonicalDocumentSchema.parse(rawDoc);
    const store = createEditorStore({ document: doc, revision: 1, theme: "light" });

    expect(store.getState().theme).toBe("light");

    localStorage.setItem(EDITOR_THEME_STORAGE_KEY, "dark");
    store.getState().syncThemeFromStorage();

    expect(store.getState().theme).toBe("dark");
    expect(document.documentElement.getAttribute("data-editor-theme")).toBe("dark");
  });
});
