"use client";

import { useState } from "react";
import { StorefrontCatalogView, type StorefrontTemplateItem } from "./StorefrontCatalogView";
import { OrderBookingForm } from "./OrderBookingForm";
import styles from "./seller-storefront.module.css";

interface StorefrontInteractiveSectionProps {
  sellerSlug: string;
  idempotencyKey: string;
  agencyName: string;
  whatsappContact: string;
  templates: StorefrontTemplateItem[];
}

export function StorefrontInteractiveSection({
  sellerSlug,
  idempotencyKey,
  agencyName,
  whatsappContact,
  templates,
}: StorefrontInteractiveSectionProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
  };

  return (
    <>
      {/* Catalog Section */}
      <section id="katalog-desain" className={styles.sectionSpacing}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionEyebrow}>Katalog Pilihan</div>
          <h2 className={styles.sectionTitle}>Desain & Tema Undangan Digital</h2>
          <p className={styles.sectionLead}>
            Pilih tema yang sesuai dengan konsep pernikahan impian Anda. Klik detail untuk melihat fitur lengkap atau pesan langsung melalui WhatsApp.
          </p>
        </div>

        <StorefrontCatalogView
          templates={templates}
          agencyName={agencyName}
          whatsappContact={whatsappContact}
          onSelectTemplate={handleSelectTemplate}
        />
      </section>

      {/* Order Booking Section */}
      <section className={styles.sectionSpacing}>
        <OrderBookingForm
          sellerSlug={sellerSlug}
          idempotencyKey={idempotencyKey}
          agencyName={agencyName}
          templates={templates}
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={handleSelectTemplate}
        />
      </section>
    </>
  );
}
