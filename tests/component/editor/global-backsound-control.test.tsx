import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GlobalBacksoundControl } from "@/features/editor/components/GlobalBacksoundControl";
import { EditorProvider } from "@/features/editor/components/EditorProvider";
import { createEditorStore } from "@/features/editor/core/store";
import { fullDocument } from "../../helpers/documents";
import { canonicalDocumentSchema } from "@/lib/schema";
import { BACKSOUND_PRESETS } from "@/features/audio";

describe("GlobalBacksoundControl Component", () => {
  function renderControl(audioEnabled = true, initialSrc?: string) {
    const rawDoc = fullDocument();
    const doc = canonicalDocumentSchema.parse({
      ...rawDoc,
      design: {
        ...rawDoc.design,
        audio: {
          enabled: audioEnabled,
          src: initialSrc || BACKSOUND_PRESETS[0]!.src,
          title: "Canon in D Major",
          position: "bottom-right",
          loop: true,
          autoplayOnOpen: true,
        },
      },
    });

    const store = createEditorStore({ document: doc, revision: 1 });
    const utils = render(
      <EditorProvider store={store} autosaver={null} workspaceId="ws_1">
        <GlobalBacksoundControl />
      </EditorProvider>,
    );

    return { ...utils, store };
  }

  it("renders music preset cards with real titles and categories", () => {
    renderControl(true);

    for (const preset of BACKSOUND_PRESETS) {
      expect(screen.getByTestId(`music-preset-card-${preset.id}`)).toBeInTheDocument();
      expect(screen.getByText(preset.name)).toBeInTheDocument();
    }
  });

  it("selects a card and updates the document audio src", () => {
    const { store } = renderControl(true, BACKSOUND_PRESETS[0]!.src);
    const targetPreset = BACKSOUND_PRESETS[1]!;

    const targetCard = screen.getByTestId(`music-preset-card-${targetPreset.id}`);
    fireEvent.click(targetCard);

    const updatedAudio = store.getState().history.present.design.audio;
    expect(updatedAudio?.src).toBe(targetPreset.src);
    expect(updatedAudio?.title).toContain(targetPreset.name);
  });

  it("has file input with full audio extensions support", () => {
    renderControl(true);

    const fileInput = screen.getByTestId("audio-file-input");
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute("accept", "audio/*,.mp3,.ogg,.wav,.m4a,.aac,.weba,.flac");
  });
});
