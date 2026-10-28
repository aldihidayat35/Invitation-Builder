"use client";

import React, { useState, useTransition } from "react";
import type { ClassifiedSection } from "@/features/invitations/sections-classifier";
import { savePortalSectionsAction } from "../actions";
import {
  LayersIcon,
  CheckIcon,
  XIcon,
  AlertTriangleIcon,
  SaveIcon,
  SectionCategoryIcon,
} from "./PortalIcons";
import styles from "./PortalSectionManager.module.css";

interface PortalSectionManagerProps {
  token: string;
  sections: ClassifiedSection[];
  disabledSections?: string[];
  onNotification?: (msg: string) => void;
}

export function PortalSectionManager({
  token,
  sections,
  disabledSections = [],
  onNotification,
}: PortalSectionManagerProps) {
  // Set of disabled section IDs
  const [disabledSet, setDisabledSet] = useState<Set<string>>(
    new Set(disabledSections),
  );
  // Track initial state to detect unsaved changes
  const [initialSet, setInitialSet] = useState<Set<string>>(
    new Set(disabledSections),
  );
  const [isPending, startTransition] = useTransition();
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Check if there are unsaved changes
  const hasChanges = (() => {
    if (disabledSet.size !== initialSet.size) return true;
    for (const id of disabledSet) {
      if (!initialSet.has(id)) return true;
    }
    return false;
  })();

  const toggleSection = (id: string, isMandatory: boolean) => {
    if (isMandatory) return;

    setSavedSuccess(false);
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

  const handleSave = () => {
    startTransition(async () => {
      const arrayDisabled = Array.from(disabledSet);
      const res = await savePortalSectionsAction(token, arrayDisabled);
      if (res.ok) {
        setInitialSet(new Set(disabledSet));
        setSavedSuccess(true);
        if (onNotification) {
          onNotification(
            res.message || "Pengaturan section undangan berhasil disimpan!",
          );
        }
      } else {
        alert(res.error || "Gagal menyimpan pengaturan section.");
      }
    });
  };

  // Stats
  const totalCount = sections.length;
  const disabledCount = sections.filter((s) => !s.isMandatory && disabledSet.has(s.id)).length;
  const activeCount = totalCount - disabledCount;

  return (
    <div className={styles.container}>
      {/* Header Card */}
      <div className={styles.headerCard}>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>
              <span className={styles.titleIcon}>
                <LayersIcon size={22} />
              </span>
              <span>Pilih Section yang Ditampilkan</span>
            </h2>
            <p className={styles.subtitle}>
              Atur bagian undangan yang ingin Anda gunakan atau sembunyikan. Section
              yang dinonaktifkan tidak akan ditampilkan kepada para tamu di undangan Anda.
            </p>
          </div>
        </div>

        <div className={styles.statsBar}>
          <div className={`${styles.statBadge} ${styles.statBadgeActive}`}>
            <CheckIcon size={14} />
            <span>{activeCount} Section Aktif</span>
          </div>
          {disabledCount > 0 && (
            <div className={`${styles.statBadge} ${styles.statBadgeDisabled}`}>
              <XIcon size={14} />
              <span>{disabledCount} Section Dinonaktifkan</span>
            </div>
          )}
          <div className={styles.statBadge}>
            <LayersIcon size={14} />
            <span>Total {totalCount} Section dalam Tema</span>
          </div>
        </div>
      </div>

      {/* Sections List */}
      <div className={styles.sectionsList}>
        {sections.map((section) => {
          const isOff = !section.isMandatory && disabledSet.has(section.id);
          const isLocked = section.isMandatory;

          return (
            <div
              key={section.id}
              className={`${styles.sectionCard} ${isOff ? styles.sectionCardDisabled : ""}`}
            >
              <div className={styles.sectionLeft}>
                <div className={styles.iconWrapper}>
                  <SectionCategoryIcon
                    category={section.category}
                    iconKey={section.icon}
                    size={22}
                  />
                </div>
                <div className={styles.sectionInfo}>
                  <div className={styles.sectionTitleRow}>
                    <h3 className={styles.sectionName}>{section.name}</h3>
                    <span className={styles.categoryPill}>{section.category}</span>
                    {isLocked && (
                      <span className={styles.mandatoryBadge}>Bagian Utama (Wajib)</span>
                    )}
                  </div>
                  <p className={styles.sectionDesc}>{section.description}</p>
                </div>
              </div>

              <div className={styles.sectionRight}>
                {isLocked ? (
                  <span className={`${styles.statusLabel} ${styles.statusMandatory}`}>
                    Selalu Aktif
                  </span>
                ) : isOff ? (
                  <span className={`${styles.statusLabel} ${styles.statusInactive}`}>
                    Dinonaktifkan
                  </span>
                ) : (
                  <span className={`${styles.statusLabel} ${styles.statusActive}`}>
                    Aktif Ditampilkan
                  </span>
                )}

                <label
                  className={`${styles.switchLabel} ${isLocked ? styles.switchLabelLocked : ""}`}
                  title={
                    isLocked
                      ? "Bagian utama tidak dapat dinonaktifkan."
                      : isOff
                        ? "Klik untuk mengaktifkan section ini"
                        : "Klik untuk menonaktifkan section ini"
                  }
                >
                  <input
                    type="checkbox"
                    className={styles.switchInput}
                    checked={!isOff}
                    disabled={isLocked || isPending}
                    onChange={() => toggleSection(section.id, section.isMandatory)}
                  />
                  <span className={styles.switchSlider} />
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky Save Bar when changes detected or after save */}
      {(hasChanges || savedSuccess) && (
        <div className={styles.saveStickyBar}>
          <div className={styles.saveBarText}>
            {savedSuccess ? (
              <>
                <span style={{ color: "#059669", display: "inline-flex" }}>
                  <CheckIcon size={18} />
                </span>
                <span>Perubahan berhasil disimpan! Undangan Anda telah diperbarui.</span>
              </>
            ) : (
              <>
                <span style={{ color: "#c59b27", display: "inline-flex" }}>
                  <AlertTriangleIcon size={18} />
                </span>
                <span>Ada perubahan section yang belum disimpan.</span>
              </>
            )}
          </div>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={!hasChanges || isPending}
          >
            <SaveIcon size={16} />
            <span>{isPending ? "Menyimpan..." : "Simpan Pengaturan Section"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
