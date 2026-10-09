import { describe, it, expect } from "vitest";
import {
  addSection,
  createElement,
  deleteElements,
  duplicateElements,
  findGroupElements,
  groupElements,
  renameGroup,
  ungroupElements,
  updateGroupAnimation,
  updateGroupStyle,
} from "@/features/editor/core/ops";
import { resolveShortcut } from "@/features/editor/core/shortcuts";
import { canonicalDocumentSchema, createEmptyDocument, type CanonicalDocument } from "@/lib/schema";

const assertValid = (doc: CanonicalDocument) => {
  const parsed = canonicalDocumentSchema.safeParse(doc);
  expect(parsed.success, JSON.stringify(parsed.success ? "" : parsed.error?.issues)).toBe(true);
};

describe("Editor Group and Ungroup Operations", () => {
  function createSetupDoc(): { doc: CanonicalDocument; sectionId: string; el1Id: string; el2Id: string; el3Id: string } {
    let doc = createEmptyDocument();
    const secRes = addSection(doc);
    doc = secRes.document;
    const secId = secRes.sectionId;

    const el1 = createElement(doc, secId, "text");
    doc = el1.document;
    const el2 = createElement(doc, secId, "text");
    doc = el2.document;
    const el3 = createElement(doc, secId, "rectangle");
    doc = el3.document;

    return {
      doc,
      sectionId: secId,
      el1Id: el1.elementId!,
      el2Id: el2.elementId!,
      el3Id: el3.elementId!,
    };
  }

  it("groups elements together with a shared groupId and groupName", () => {
    const { doc, el1Id, el2Id } = createSetupDoc();
    const grouped = groupElements(doc, [el1Id, el2Id], "Grup Teks");

    expect(grouped.groupId).toBeDefined();
    assertValid(grouped.document);

    const members = findGroupElements(grouped.document, grouped.groupId!);
    expect(members).toHaveLength(2);
    expect(members.map((m) => m.id).sort()).toEqual([el1Id, el2Id].sort());
    expect(members[0]!.groupId).toBe(grouped.groupId);
    expect(members[0]!.groupName).toBe("Grup Teks");
    expect(members[1]!.groupId).toBe(grouped.groupId);
    expect(members[1]!.groupName).toBe("Grup Teks");
  });

  it("does not group if less than 2 elements are provided", () => {
    const { doc, el1Id } = createSetupDoc();
    const res = groupElements(doc, [el1Id]);
    expect(res.groupId).toBeNull();
    expect(res.document).toEqual(doc);
  });

  it("ungroups elements, clearing groupId and groupName", () => {
    const { doc, el1Id, el2Id } = createSetupDoc();
    const grouped = groupElements(doc, [el1Id, el2Id]);
    const unGroupedDoc = ungroupElements(grouped.document, [el1Id]);

    const members = findGroupElements(unGroupedDoc, grouped.groupId!);
    expect(members).toHaveLength(0);
    assertValid(unGroupedDoc);

    const sec = unGroupedDoc.sections[0]!;
    const el1 = sec.elements.find((e) => e.id === el1Id);
    const el2 = sec.elements.find((e) => e.id === el2Id);
    expect(el1?.groupId).toBeUndefined();
    expect(el1?.groupName).toBeUndefined();
    expect(el2?.groupId).toBeUndefined();
    expect(el2?.groupName).toBeUndefined();
  });

  it("renames group for all member elements", () => {
    const { doc, el1Id, el2Id } = createSetupDoc();
    const grouped = groupElements(doc, [el1Id, el2Id], "Nama Lama");
    const renamedDoc = renameGroup(grouped.document, grouped.groupId!, "Nama Baru");

    const members = findGroupElements(renamedDoc, grouped.groupId!);
    expect(members).toHaveLength(2);
    expect(members.every((m) => m.groupName === "Nama Baru")).toBe(true);
    assertValid(renamedDoc);
  });

  it("synchronizes animations across all elements in the group ('satu animasi yang sama')", () => {
    const { doc, el1Id, el2Id, el3Id } = createSetupDoc();
    const grouped = groupElements(doc, [el1Id, el2Id]);

    const animConfig = {
      enter: {
        presetId: "fadeUp",
        durationMs: 800,
        delayMs: 150,
        easing: "ease-out" as const,
        trigger: "onEnterViewport" as const,
        repeat: 0,
        yoyo: false,
        staggerUnit: "none" as const,
        staggerAmountMs: 0,
        once: true,
      },
    };

    const animatedDoc = updateGroupAnimation(grouped.document, grouped.groupId!, animConfig);
    assertValid(animatedDoc);

    const sec = animatedDoc.sections[0]!;
    const e1 = sec.elements.find((e) => e.id === el1Id);
    const e2 = sec.elements.find((e) => e.id === el2Id);
    const e3 = sec.elements.find((e) => e.id === el3Id);

    expect(e1?.animations).toEqual(animConfig);
    expect(e2?.animations).toEqual(animConfig);
    // Element 3 not in group, unaffected
    expect(e3?.animations).toBeUndefined();
  });

  it("updates group styles (opacity, shadow) across all group members", () => {
    const { doc, el1Id, el2Id } = createSetupDoc();
    const grouped = groupElements(doc, [el1Id, el2Id]);

    const styledDoc = updateGroupStyle(grouped.document, grouped.groupId!, {
      opacity: 0.65,
    });
    assertValid(styledDoc);

    const sec = styledDoc.sections[0]!;
    const e1 = sec.elements.find((e) => e.id === el1Id);
    const e2 = sec.elements.find((e) => e.id === el2Id);

    expect(e1?.style.opacity).toBe(0.65);
    expect(e2?.style.opacity).toBe(0.65);
  });

  it("remaps groupId when duplicating grouped elements so duplicated items form a new group", () => {
    const { doc, el1Id, el2Id } = createSetupDoc();
    const grouped = groupElements(doc, [el1Id, el2Id], "Header Group");
    const dupRes = duplicateElements(grouped.document, [el1Id, el2Id]);

    assertValid(dupRes.document);
    expect(dupRes.ids).toHaveLength(2);

    const sec = dupRes.document.sections[0]!;
    const originalEl1 = sec.elements.find((e) => e.id === el1Id);
    const duplicatedEl1 = sec.elements.find((e) => e.id === dupRes.ids[0]);
    const duplicatedEl2 = sec.elements.find((e) => e.id === dupRes.ids[1]);

    expect(duplicatedEl1?.groupId).toBeDefined();
    expect(duplicatedEl2?.groupId).toBeDefined();
    // They share the new group ID
    expect(duplicatedEl1?.groupId).toBe(duplicatedEl2?.groupId);
    // Which is different from original group ID
    expect(duplicatedEl1?.groupId).not.toBe(originalEl1?.groupId);
    expect(duplicatedEl1?.groupName).toBe("Header Group");
  });

  it("dissolves single-element group when other members are deleted", () => {
    const { doc, el1Id, el2Id } = createSetupDoc();
    const grouped = groupElements(doc, [el1Id, el2Id]);
    const deletedDoc = deleteElements(grouped.document, [el1Id]);

    assertValid(deletedDoc);
    const sec = deletedDoc.sections[0]!;
    const remainingEl2 = sec.elements.find((e) => e.id === el2Id);
    // Since only 1 member remains, group is dissolved automatically
    expect(remainingEl2?.groupId).toBeUndefined();
    expect(remainingEl2?.groupName).toBeUndefined();
  });

  it("resolves Ctrl+G to group and Ctrl+Shift+G to ungroup shortcuts", () => {
    const groupShortcut = resolveShortcut(
      new KeyboardEvent("keydown", { key: "g", ctrlKey: true }),
    );
    expect(groupShortcut).toEqual({ type: "group" });

    const ungroupShortcut = resolveShortcut(
      new KeyboardEvent("keydown", { key: "g", ctrlKey: true, shiftKey: true }),
    );
    expect(ungroupShortcut).toEqual({ type: "ungroup" });

    const macGroupShortcut = resolveShortcut(
      new KeyboardEvent("keydown", { key: "g", metaKey: true }),
    );
    expect(macGroupShortcut).toEqual({ type: "group" });

    const macUngroupShortcut = resolveShortcut(
      new KeyboardEvent("keydown", { key: "g", metaKey: true, shiftKey: true }),
    );
    expect(macUngroupShortcut).toEqual({ type: "ungroup" });
  });
});
