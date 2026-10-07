/**
 * WhatsApp message URL generator for customer order intake on seller storefront.
 */

export interface WhatsAppCustomerOrderParams {
  sellerPhone: string;
  agencyName: string;
  orderId?: string;
  customerName: string;
  customerWhatsapp: string;
  templateTitle?: string;
  groomBrideNames?: string;
  eventDate?: string;
  eventLocation?: string;
  notes?: string;
}

/**
 * Builds a direct `https://wa.me/...` URL with a formatted Indonesian order inquiry message.
 */
export function buildCustomerOrderWhatsAppUrl(params: WhatsAppCustomerOrderParams): string {
  const rawPhone = (params.sellerPhone || "6281234567890").trim();
  let cleanPhone = rawPhone.replace(/\D/g, "");
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "62" + cleanPhone.slice(1);
  }

  const lines: string[] = [
    `*PESANAN BARU WEBSITE UNDANGAN - ${params.agencyName.toUpperCase()}*`,
    `Halo ${params.agencyName}, saya ingin mengonfirmasi pemesanan website undangan digital:`,
    "",
    `• Nama Pemesan: ${params.customerName}`,
    `• WhatsApp Pemesan: ${params.customerWhatsapp}`,
  ];

  if (params.groomBrideNames) {
    lines.push(`• Nama Mempelai: ${params.groomBrideNames}`);
  }

  if (params.templateTitle) {
    lines.push(`• Desain Tema Pilihan: ${params.templateTitle}`);
  }

  if (params.eventDate) {
    lines.push(`• Tanggal Acara: ${params.eventDate}`);
  }

  if (params.eventLocation) {
    lines.push(`• Lokasi Acara: ${params.eventLocation}`);
  }

  if (params.notes) {
    lines.push(`• Catatan Khusus: ${params.notes}`);
  }

  if (params.orderId) {
    lines.push(`• Kode Referensi: #${params.orderId.slice(0, 8)}`);
  }

  lines.push("");
  lines.push("Mohon info langkah selanjutnya dan estimasi pengerjaan. Terima kasih!");

  const text = lines.join("\n");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}
