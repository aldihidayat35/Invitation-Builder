"use client";

import { useId } from "react";
import type { Element, ElementAction, ElementActionType, ElementHoverEffect } from "@/lib/schema";
import { selectDoc, useEditor, useEditorStore } from "./EditorProvider";
import { FieldRow, SelectField, TextField } from "./fields";
import styles from "./editor.module.css";

interface ActionPanelProps {
  element: Element;
  readOnly: boolean;
  sectionId: string;
}

const ACTION_TYPE_OPTIONS: readonly { value: ElementActionType; label: string }[] = [
  { value: "url", label: "🌐 Buka URL Web / Link" },
  { value: "scroll_to_section", label: "📍 Scroll ke Section" },
  { value: "open_invitation", label: "✉️ Buka Undangan (Cover Opening)" },
  { value: "whatsapp", label: "💬 Chat WhatsApp" },
  { value: "phone", label: "📞 Telepon / Panggilan" },
  { value: "email", label: "📧 Kirim Email" },
];

const HOVER_EFFECT_OPTIONS: readonly { value: ElementHoverEffect; label: string }[] = [
  { value: "scale", label: "Perbesar Halus (Scale Up)" },
  { value: "opacity", label: "Transparansi (Opacity)" },
  { value: "glow", label: "Cahaya Lembut (Glow)" },
  { value: "none", label: "Kursor Pointer Saja" },
];

const TARGET_OPTIONS = [
  { value: "_blank", label: "Buka di Tab Baru (_blank)" },
  { value: "_self", label: "Buka di Tab yang Sama (_self)" },
];

export function ActionPanel({ element, readOnly, sectionId: _sectionId }: ActionPanelProps) {
  const store = useEditorStore();
  const doc = useEditor(selectDoc);
  const toggleId = useId();

  const action = element.action;
  const isEnabled = Boolean(action);

  const act = () => store.getState();

  const handleToggle = (checked: boolean) => {
    if (readOnly) return;
    if (checked) {
      act().patchElement(element.id, (el) => ({
        ...el,
        action: {
          type: "url",
          url: "https://",
          target: "_blank",
          hoverEffect: "scale",
        },
      }));
    } else {
      act().patchElement(element.id, (el) => {
        const next = { ...el };
        delete next.action;
        return next;
      });
    }
  };

  const updateAction = (patch: Partial<ElementAction>) => {
    if (readOnly || !action) return;
    act().patchElement(element.id, (el) => ({
      ...el,
      action: {
        ...(el.action ?? { type: "url", hoverEffect: "scale", target: "_blank" }),
        ...patch,
      },
    }));
  };

  const sectionOptions = doc.sections.map((s, idx) => ({
    value: s.id,
    label: s.name ? `${idx + 1}. ${s.name}${s.isOpening ? " (Cover)" : ""}` : `Section ${idx + 1}`,
  }));

  return (
    <div className={styles.stack} data-testid="element-action-panel">
      {/* Enable / Disable Switch */}
      <FieldRow label="Jadikan Tombol Klik" htmlFor={toggleId}>
        <input
          id={toggleId}
          type="checkbox"
          checked={isEnabled}
          disabled={readOnly}
          onChange={(e) => handleToggle(e.target.checked)}
          data-testid="element-action-toggle"
          style={{ cursor: "pointer", width: 16, height: 16, accentColor: "#D4AF37" }}
        />
      </FieldRow>

      {isEnabled && action && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
          {/* Action Type Select */}
          <SelectField
            id="insp-action-type"
            label="Tipe Aksi Tombol"
            value={action.type}
            options={ACTION_TYPE_OPTIONS}
            disabled={readOnly}
            onChange={(val) => {
              const nextType = val as ElementActionType;
              const nextPatch: Partial<ElementAction> = { type: nextType };
              if (nextType === "scroll_to_section" && !action.sectionId && sectionOptions[0]) {
                nextPatch.sectionId = sectionOptions[0].value;
              } else if (nextType === "url" && !action.url) {
                nextPatch.url = "https://";
              }
              updateAction(nextPatch);
            }}
          />

          {/* Type-specific Fields */}
          {action.type === "url" && (
            <>
              <TextField
                id="insp-action-url"
                label="Alamat URL Tujuan"
                value={action.url ?? ""}
                placeholder="https://contoh.com/link-tujuan"
                disabled={readOnly}
                onCommit={(url) => updateAction({ url })}
              />
              <SelectField
                id="insp-action-target"
                label="Target Jendela"
                value={action.target ?? "_blank"}
                options={TARGET_OPTIONS}
                disabled={readOnly}
                onChange={(target) => updateAction({ target: target as "_blank" | "_self" })}
              />
            </>
          )}

          {action.type === "scroll_to_section" && (
            <SelectField
              id="insp-action-section"
              label="Tujuan Scroll Section"
              value={action.sectionId ?? sectionOptions[0]?.value ?? ""}
              options={sectionOptions}
              disabled={readOnly}
              onChange={(sectionId) => updateAction({ sectionId })}
            />
          )}

          {action.type === "open_invitation" && (
            <div
              style={{
                borderRadius: 8,
                background: "rgba(212, 175, 55, 0.1)",
                border: "1px solid rgba(212, 175, 55, 0.3)",
                padding: "8px 10px",
                fontSize: "0.72rem",
                color: "var(--dash-text, #2C221E)",
                lineHeight: 1.4,
              }}
            >
              ✉️ <strong>Buka Undangan</strong>: Mengklik elemen ini akan memicu pembukaan amplop cover pembuka (Section 0) dan memulai musik latar otomatis.
            </div>
          )}

          {action.type === "whatsapp" && (
            <>
              <TextField
                id="insp-action-wa-phone"
                label="Nomor WhatsApp"
                value={action.phone ?? ""}
                placeholder="mis. 081234567890"
                disabled={readOnly}
                onCommit={(phone) => updateAction({ phone })}
              />
              <TextField
                id="insp-action-wa-msg"
                label="Pesan Awal (Opsional)"
                value={action.message ?? ""}
                placeholder="mis. Halo, saya ingin konfirmasi..."
                disabled={readOnly}
                onCommit={(message) => updateAction({ message })}
              />
            </>
          )}

          {action.type === "phone" && (
            <TextField
              id="insp-action-phone"
              label="Nomor Telepon"
              value={action.phone ?? ""}
              placeholder="mis. 081234567890"
              disabled={readOnly}
              onCommit={(phone) => updateAction({ phone })}
            />
          )}

          {action.type === "email" && (
            <TextField
              id="insp-action-email"
              label="Alamat Email Tujuan"
              value={action.email ?? ""}
              placeholder="mis. halo@undangan.id"
              disabled={readOnly}
              onCommit={(email) => updateAction({ email })}
            />
          )}

          {/* Hover Effect Selector */}
          <SelectField
            id="insp-action-hover"
            label="Efek Hover Interaktif"
            value={action.hoverEffect ?? "scale"}
            options={HOVER_EFFECT_OPTIONS}
            disabled={readOnly}
            onChange={(val) => updateAction({ hoverEffect: val as ElementHoverEffect })}
          />

          <p style={{ margin: "2px 0 0", fontSize: "0.7rem", color: "var(--dash-muted, #8A7A70)", lineHeight: 1.35 }}>
            💡 Pada website undangan publik, elemen ini memiliki kursor pointer dan dapat diklik oleh tamu.
          </p>
        </div>
      )}
    </div>
  );
}
