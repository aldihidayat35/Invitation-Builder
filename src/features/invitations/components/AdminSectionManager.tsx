"use client";

import { useActionState, useState } from "react";
import type { ClassifiedSection } from "@/features/invitations/sections-classifier";
import type { ActionState, InvitationAction } from "./action-state";
import styles from "./invitations.module.css";

export interface AdminSectionManagerProps {
  invitationId: string;
  sections: ClassifiedSection[];
  disabledSections?: string[];
  canWrite: boolean;
  saveAction: InvitationAction;
}

export function AdminSectionManager({
  invitationId,
  sections,
  disabledSections = [],
  canWrite,
  saveAction,
}: AdminSectionManagerProps) {
  const [disabledSet, setDisabledSet] = useState<Set<string>>(new Set(disabledSections));
  const [initialSet, setInitialSet] = useState<Set<string>>(new Set(disabledSections));
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const res = await saveAction(prev, formData);
      if (res.ok) {
        setInitialSet(new Set(disabledSet));
      }
      return res;
    },
    {},
  );

  const hasChanges = (() => {
    if (disabledSet.size !== initialSet.size) return true;
    for (const id of disabledSet) {
      if (!initialSet.has(id)) return true;
    }
    return false;
  })();

  const toggleSection = (id: string, isMandatory: boolean) => {
    if (!canWrite || isMandatory) return;

    setDisabledSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const disabledCount = sections.filter((s) => !s.isMandatory && disabledSet.has(s.id)).length;
  const activeCount = sections.length - disabledCount;

  return (
    <section className={styles.panel} aria-labelledby="section-manager-title">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
        <div>
          <h2 id="section-manager-title" className={styles.panelTitle} style={{ margin: 0 }}>
            📑 Kelola Section Undangan
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--dash-muted)" }}>
            Atur section yang tampil di halaman undangan sebelum dipublikasikan.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", margin: "4px 0 8px" }}>
        <span
          style={{
            fontSize: "0.72rem",
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: "999px",
            background: "rgba(16, 185, 129, 0.12)",
            color: "#059669",
          }}
        >
          {activeCount} Aktif
        </span>
        {disabledCount > 0 && (
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: "999px",
              background: "rgba(239, 68, 68, 0.12)",
              color: "#dc2626",
            }}
          >
            {disabledCount} Dinonaktifkan
          </span>
        )}
      </div>

      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <input type="hidden" name="invitationId" value={invitationId} />
        <input
          type="hidden"
          name="disabledSections"
          value={JSON.stringify(Array.from(disabledSet))}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            maxHeight: "360px",
            overflowY: "auto",
            paddingRight: "4px",
          }}
        >
          {sections.map((section) => {
            const isOff = !section.isMandatory && disabledSet.has(section.id);
            const isLocked = section.isMandatory;

            return (
              <div
                key={section.id}
                onClick={() => toggleSection(section.id, section.isMandatory)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: isOff
                    ? "1px solid var(--dash-border)"
                    : "1px solid rgba(212, 175, 55, 0.3)",
                  background: isOff ? "rgba(0,0,0,0.02)" : "rgba(212, 175, 55, 0.04)",
                  cursor: isLocked || !canWrite ? "default" : "pointer",
                  opacity: isOff ? 0.7 : 1,
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                  <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{section.icon}</span>
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          color: "var(--dash-text)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {section.name}
                      </span>
                      {isLocked && (
                        <span
                          style={{
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            padding: "1px 5px",
                            borderRadius: "4px",
                            background: "rgba(245, 158, 11, 0.15)",
                            color: "#d97706",
                          }}
                        >
                          Wajib
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "var(--dash-muted)" }}>
                      {section.category}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={!isOff}
                    disabled={isLocked || !canWrite || pending}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSection(section.id, section.isMandatory);
                    }}
                    style={{
                      width: "16px",
                      height: "16px",
                      accentColor: "#d4af37",
                      cursor: isLocked || !canWrite ? "default" : "pointer",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {canWrite && (
          <div style={{ marginTop: "6px" }}>
            <button
              type="submit"
              className={`${styles.primary} ${styles.small}`}
              disabled={!hasChanges || pending}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {pending ? "Menyimpan…" : "Simpan Perubahan Section"}
            </button>
          </div>
        )}

        {state.message && (
          <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#059669", fontWeight: 600 }}>
            ✓ {state.message}
          </p>
        )}
        {state.error && (
          <p role="alert" className={styles.formError} style={{ margin: "4px 0 0" }}>
            {state.error}
          </p>
        )}
      </form>
    </section>
  );
}
