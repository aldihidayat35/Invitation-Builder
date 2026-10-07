"use client";

import { TOPUP_PACKAGES, type TopupPackage } from "../types";
import styles from "./reseller.module.css";

interface TopupPackageSelectorProps {
  selectedPackage: TopupPackage;
  onSelect: (pkg: TopupPackage) => void;
}

export function TopupPackageSelector({
  selectedPackage,
  onSelect,
}: TopupPackageSelectorProps) {
  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px 0", color: "var(--dash-text)" }}>
        1. Pilih Paket Kuota Undangan
      </h3>

      <div className={styles.packageGrid}>
        {TOPUP_PACKAGES.map((pkg) => {
          const isSelected = selectedPackage.id === pkg.id;

          return (
            <div
              key={pkg.id}
              className={`${styles.packageCard} ${isSelected ? styles.packageCardSelected : ""}`}
              onClick={() => onSelect(pkg)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelect(pkg);
              }}
            >
              {pkg.badge ? <span className={styles.packageBadge}>{pkg.badge}</span> : null}
              <h4 className={styles.packageTitle}>{pkg.title}</h4>
              <div className={styles.packagePrice}>Rp {pkg.price.toLocaleString("id-ID")}</div>
              <div className={styles.packageCredits}>+{pkg.creditAmount} Kredit Undangan</div>
              <p className={styles.packageDesc}>{pkg.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
