/**
 * WhatsApp message URL generator for manual transfer top-up confirmation.
 */

export interface WhatsAppTopupConfirmationParams {
  adminPhone?: string;
  ownerPhone?: string;
  agencyName: string;
  requestId?: string;
  creditAmount: number;
  amountPaid: number;
  senderBank: string;
  senderAccountName: string;
  transferDate?: string;
  destinationBank?: string;
  proofUrl?: string;
}

/**
 * Builds a direct `https://wa.me/...` URL with a formatted Indonesian confirmation message.
 */
export function buildWhatsAppConfirmationUrl(params: WhatsAppTopupConfirmationParams): string {
  const defaultPhone = process.env.NEXT_PUBLIC_OWNER_WHATSAPP || "6281234567890";
  const rawPhone = (params.ownerPhone || params.adminPhone || defaultPhone).trim();
  let cleanPhone = rawPhone.replace(/\D/g, "");
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "62" + cleanPhone.slice(1);
  }

  const lines: string[] = [
    "*KONFIRMASI TOP-UP SALDO RESELLER*",
    "Halo Admin / Owner Invitation Studio,",
    "",
    "Saya ingin konfirmasi pengajuan Top-Up Kuota Undangan:",
    `• Agensi: ${params.agencyName}`,
  ];

  if (params.requestId) {
    lines.push(`• ID Pengajuan: #${params.requestId.slice(0, 8)}`);
  }
  lines.push(`• Paket Kuota: +${params.creditAmount} Kredit`);
  lines.push(`• Nominal Transfer: Rp ${params.amountPaid.toLocaleString("id-ID")}`);
  lines.push(`• Pengirim: ${params.senderBank} a.n. ${params.senderAccountName}`);
  if (params.transferDate) {
    lines.push(`• Tanggal Transfer: ${params.transferDate}`);
  }

  if (params.destinationBank) {
    lines.push(`• Rekening Tujuan: ${params.destinationBank}`);
  }
  if (params.proofUrl) {
    lines.push(`• Link Bukti Transfer: ${params.proofUrl}`);
  }

  lines.push("");
  lines.push("Mohon dicek mutasi bank dan diverifikasi. Terima kasih!");

  const text = lines.join("\n");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}
