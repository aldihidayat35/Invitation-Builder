/** Interpolates variables into template text. */
export function interpolateMessageTemplate(
  templateContent: string,
  params: {
    guestName?: string;
    link?: string;
    eventTitle?: string;
    eventDate?: string;
    eventLocation?: string;
  },
): string {
  const guestName = params.guestName?.trim() || "Tamu Undangan";
  const link = params.link?.trim() || "";
  const eventTitle = params.eventTitle?.trim() || "Acara Spesial";
  const eventDate = params.eventDate?.trim() || "Waktu Acara";
  const eventLocation = params.eventLocation?.trim() || "Lokasi Acara";

  return templateContent
    .replace(/\{guestname\}/gi, guestName)
    .replace(/\{guest_name\}/gi, guestName)
    .replace(/\{nama_tamu\}/gi, guestName)
    .replace(/\{link\}/gi, link)
    .replace(/\{url\}/gi, link)
    .replace(/\{link_undangan\}/gi, link)
    .replace(/\{event_title\}/gi, eventTitle)
    .replace(/\{judul_acara\}/gi, eventTitle)
    .replace(/\{nama_mempelai\}/gi, eventTitle)
    .replace(/\{event_date\}/gi, eventDate)
    .replace(/\{tanggal_acara\}/gi, eventDate)
    .replace(/\{event_location\}/gi, eventLocation)
    .replace(/\{lokasi_acara\}/gi, eventLocation)
    .replace(/\{alamat_acara\}/gi, eventLocation);
}
