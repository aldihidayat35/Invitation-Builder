import { asc, desc, eq, and, sql } from "drizzle-orm";
import { messageTemplates, type MessageTemplateRow, type NewMessageTemplateRow } from "../schema";
import type { Database } from "../types";

export interface MessageTemplateCategoryMeta {
  key: string;
  label: string;
  icon: string;
  description: string;
}

export const MESSAGE_TEMPLATE_CATEGORIES: MessageTemplateCategoryMeta[] = [
  {
    key: "wedding",
    label: "Pernikahan",
    icon: "💍",
    description: "Format undangan akad, resepsi, dan pesta pernikahan",
  },
  {
    key: "khitanan",
    label: "Khitanan",
    icon: "🕌",
    description: "Format undangan tasyakuran walimatul khitan",
  },
  {
    key: "aqiqah",
    label: "Aqiqah",
    icon: "👶",
    description: "Format undangan tasyakuran kelahiran & aqiqah buah hati",
  },
  {
    key: "birthday",
    label: "Ulang Tahun",
    icon: "🎂",
    description: "Format undangan pesta ulang tahun ceria & santai",
  },
  {
    key: "graduation",
    label: "Wisuda",
    icon: "🎓",
    description: "Format undangan syukuran kelulusan & wisuda akademik",
  },
  {
    key: "corporate",
    label: "Acara Formal / Perusahaan",
    icon: "🏢",
    description: "Format undangan seminar, gathering, dan kegiatan resmi",
  },
  {
    key: "general",
    label: "Umum & Syukuran",
    icon: "✨",
    description: "Format undangan silaturahmi, reuni, dan syukuran umum",
  },
];

export const DEFAULT_MESSAGE_TEMPLATES: Array<Omit<NewMessageTemplateRow, "id" | "createdAt" | "updatedAt">> = [
  // Pernikahan
  {
    category: "wedding",
    title: "Pernikahan — Formal & Santun",
    content: `Halo {guestname},

Tanpa mengurangi rasa hormat, perkenankan kami mengundang Anda untuk hadir di acara pernikahan kami:
*{event_title}*

📅 Waktu: {event_date}
📍 Lokasi: {event_location}

Informasi lengkap dan tautan undangan digital dapat dilihat melalui tautan berikut:
{link}

Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir serta memberikan doa restu.

Terima kasih dan sampai jumpa di hari bahagia kami! 🙏`,
    isDefault: true,
    sortOrder: 1,
  },
  {
    category: "wedding",
    title: "Pernikahan — Nuansa Islami",
    content: `Assalamu'alaikum Warahmatullahi Wabarakatuh,

Dengan memohon rahmat dan ridho Allah SWT, kami bermaksud mengundang {guestname} untuk hadir di acara akad & resepsi pernikahan kami:
*{event_title}*

📅 Hari/Tanggal: {event_date}
📍 Lokasi: {event_location}

Detail informasi acara serta konfirmasi kehadiran dapat diakses melalui tautan berikut:
{link}

Doa restu dan kehadiran Bapak/Ibu/Saudara/i sekalian adalah berkah dan kebahagiaan tak terhingga bagi kami.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.
Hormat kami yang berbahagia. 🙏`,
    isDefault: false,
    sortOrder: 2,
  },
  {
    category: "wedding",
    title: "Pernikahan — Santai & Akrab",
    content: `Hai {guestname}! 👋

Kabar bahagia untuk kita semua! Kami mengundang kamu untuk hadir dan merayakan hari pernikahan kami:
*{event_title}*

📅 Waktu: {event_date}
📍 Tempat: {event_location}

Buka undangan digital dan detail acaranya di sini ya:
{link}

Jangan lupa konfirmasi kehadiranmu (RSVP) di link tersebut. Kehadiran dan keseruanmu sangat berarti untuk kami! See you there! ✨🥂`,
    isDefault: false,
    sortOrder: 3,
  },

  // Khitanan
  {
    category: "khitanan",
    title: "Khitanan — Tasyakuran & Doa Bersama",
    content: `Assalamu'alaikum Warahmatullahi Wabarakatuh,

Dengan penuh rasa syukur atas karunia Allah SWT, kami bermaksud mengundang Bapak/Ibu/Saudara/i {guestname} untuk menghadiri acara Tasyakuran Khitanan putra kami:
*{event_title}*

📅 Hari/Tanggal: {event_date}
📍 Tempat: {event_location}

Detail acara dan buku tamu digital dapat dilihat pada tautan berikut:
{link}

Merupakan suatu kehormatan dan kebahagiaan bagi kami sekeluarga apabila Bapak/Ibu berkenan hadir untuk memberikan doa restu kepada putra kami.

Terima kasih atas perhatian dan doa baiknya.
Wassalamu'alaikum Warahmatullahi Wabarakatuh. 🙏`,
    isDefault: true,
    sortOrder: 1,
  },

  // Aqiqah
  {
    category: "aqiqah",
    title: "Aqiqah — Tasyakuran Kelahiran",
    content: `Assalamu'alaikum Warahmatullahi Wabarakatuh,

Alhamdulillah, puji syukur kami panjatkan atas kelahiran buah hati tercinta kami. Tanpa mengurangi rasa hormat, kami mengundang {guestname} untuk hadir dalam acara Tasyakuran & Aqiqah:
*{event_title}*

📅 Tanggal: {event_date}
📍 Lokasi: {event_location}

Informasi lengkap dan tautan undangan digital:
{link}

Doa dan kehadiran Bapak/Ibu/Saudara/i sekalian menjadi kebahagiaan dan berkah bagi kami sekeluarga.

Wassalamu'alaikum Warahmatullahi Wabarakatuh. 🙏👶`,
    isDefault: true,
    sortOrder: 1,
  },

  // Ulang Tahun
  {
    category: "birthday",
    title: "Ulang Tahun — Ceria & Spesial",
    content: `Hai {guestname}! 🎂🎉

Ada hari spesial yang sayang banget kalau dilewatkan! Aku mengundang kamu untuk ikut merayakan pesta ulang tahun:
*{event_title}*

📅 Hari/Tanggal: {event_date}
📍 Tempat: {event_location}

Yuk intip detail keseruan acaranya dan konfirmasi kehadiranmu di link ini:
{link}

Pastikan kamu datang ya, pesta ini nggak akan lengkap tanpa kehadiranmu! Sampai jumpa! 🥳🎈`,
    isDefault: true,
    sortOrder: 1,
  },

  // Wisuda
  {
    category: "graduation",
    title: "Wisuda — Syukuran Kelulusan",
    content: `Halo {guestname},

Dengan rasa syukur yang mendalam atas kelulusan dan pencapaian akademik ini, perkenankan kami mengundang Anda untuk hadir pada acara Syukuran Wisuda:
*{event_title}*

📅 Waktu: {event_date}
📍 Tempat: {event_location}

Informasi dan detail acara dapat diakses melalui link berikut:
{link}

Kehadiran dan doa restu Anda sangat berarti bagi kami dalam menyongsong babak baru ini. Terima kasih! 🎓✨`,
    isDefault: true,
    sortOrder: 1,
  },

  // Corporate
  {
    category: "corporate",
    title: "Acara Formal & Perusahaan",
    content: `Yth. {guestname},

Dengan hormat, kami mengundang Bapak/Ibu/Rekan untuk menghadiri agenda resmi kami:
*{event_title}*

📅 Waktu: {event_date}
📍 Lokasi: {event_location}

Agenda kegiatan, susunan acara, dan registrasi kehadiran dapat dilihat melalui tautan resmi berikut:
{link}

Besar harapan kami agar Bapak/Ibu dapat meluangkan waktu untuk hadir. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih. 🤝`,
    isDefault: true,
    sortOrder: 1,
  },

  // General
  {
    category: "general",
    title: "Umum — Silaturahmi & Syukuran",
    content: `Halo {guestname},

Tanpa mengurangi rasa hormat, kami mengundang Anda untuk hadir dan bersilaturahmi dalam acara:
*{event_title}*

📅 Hari/Tanggal: {event_date}
📍 Lokasi: {event_location}

Informasi lengkap dan tautan undangan dapat dilihat di:
{link}

Merupakan suatu kebahagiaan bagi kami apabila Anda berkenan hadir dan memberikan doa restu. Terima kasih banyak! 🙏`,
    isDefault: true,
    sortOrder: 1,
  },
];

/** Ensures table existence and seeds initial default message templates if empty. */
export async function ensureMessageTemplatesTable(db: Database): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "message_templates" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "category" text DEFAULT 'wedding' NOT NULL,
        "title" text NOT NULL,
        "content" text NOT NULL,
        "is_default" boolean DEFAULT false NOT NULL,
        "sort_order" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "message_templates_cat_idx" ON "message_templates" ("category", "sort_order");
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "message_templates_default_idx" ON "message_templates" ("category", "is_default");
    `);

    // Check count and seed if empty
    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(messageTemplates);

    if ((countRow?.count ?? 0) === 0) {
      for (const item of DEFAULT_MESSAGE_TEMPLATES) {
        await db.insert(messageTemplates).values(item).onConflictDoNothing();
      }
    }
  } catch (err) {
    console.warn("[ensureMessageTemplatesTable] notice:", err);
  }
}

/** Lists all message templates (for admin management). */
export async function listAdminMessageTemplates(db: Database): Promise<MessageTemplateRow[]> {
  await ensureMessageTemplatesTable(db);
  return db
    .select()
    .from(messageTemplates)
    .orderBy(asc(messageTemplates.category), desc(messageTemplates.isDefault), asc(messageTemplates.sortOrder), desc(messageTemplates.createdAt));
}

/** Lists templates for a specific category + general templates. */
export async function listMessageTemplatesForCategory(
  db: Database,
  category: string,
): Promise<MessageTemplateRow[]> {
  await ensureMessageTemplatesTable(db);
  const normalizedCategory = category.toLowerCase().trim();

  const all = await db
    .select()
    .from(messageTemplates)
    .where(
      sql`${messageTemplates.category} = ${normalizedCategory} OR ${messageTemplates.category} = 'general'`,
    )
    .orderBy(
      sql`CASE WHEN ${messageTemplates.category} = ${normalizedCategory} THEN 0 ELSE 1 END`,
      desc(messageTemplates.isDefault),
      asc(messageTemplates.sortOrder),
    );

  return all;
}

/** Finds a specific template by ID. */
export async function findMessageTemplateById(
  db: Database,
  id: string,
): Promise<MessageTemplateRow | undefined> {
  await ensureMessageTemplatesTable(db);
  const [row] = await db.select().from(messageTemplates).where(eq(messageTemplates.id, id)).limit(1);
  return row;
}

export interface CreateMessageTemplateInput {
  category: string;
  title: string;
  content: string;
  isDefault?: boolean;
  sortOrder?: number;
}

/** Creates a new message template. */
export async function createMessageTemplate(
  db: Database,
  input: CreateMessageTemplateInput,
): Promise<MessageTemplateRow> {
  await ensureMessageTemplatesTable(db);
  const category = input.category.trim().toLowerCase();
  const title = input.title.trim();
  const content = input.content.trim();
  const isDefault = Boolean(input.isDefault);

  // If set as default, unset other defaults in the same category
  if (isDefault) {
    await db
      .update(messageTemplates)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(messageTemplates.category, category));
  }

  const [created] = await db
    .insert(messageTemplates)
    .values({
      category,
      title,
      content,
      isDefault,
      sortOrder: input.sortOrder ?? 0,
    })
    .returning();

  if (!created) throw new Error("Gagal membuat template pesan.");
  return created;
}

export interface UpdateMessageTemplateInput {
  category?: string;
  title?: string;
  content?: string;
  isDefault?: boolean;
  sortOrder?: number;
}

/** Updates an existing message template. */
export async function updateMessageTemplate(
  db: Database,
  id: string,
  input: UpdateMessageTemplateInput,
): Promise<MessageTemplateRow> {
  await ensureMessageTemplatesTable(db);
  const existing = await findMessageTemplateById(db, id);
  if (!existing) throw new Error("Template pesan tidak ditemukan.");

  const category = input.category ? input.category.trim().toLowerCase() : existing.category;
  const isDefault = input.isDefault !== undefined ? input.isDefault : existing.isDefault;

  if (isDefault) {
    await db
      .update(messageTemplates)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(and(eq(messageTemplates.category, category), sql`${messageTemplates.id} != ${id}`));
  }

  const [updated] = await db
    .update(messageTemplates)
    .set({
      ...(input.category ? { category } : {}),
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.content !== undefined ? { content: input.content.trim() } : {}),
      isDefault,
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      updatedAt: new Date(),
    })
    .where(eq(messageTemplates.id, id))
    .returning();

  if (!updated) throw new Error("Gagal memperbarui template pesan.");
  return updated;
}

/** Sets a template as the default for its category. */
export async function setDefaultMessageTemplate(
  db: Database,
  id: string,
): Promise<MessageTemplateRow> {
  await ensureMessageTemplatesTable(db);
  const target = await findMessageTemplateById(db, id);
  if (!target) throw new Error("Template pesan tidak ditemukan.");

  // Unset previous defaults in this category
  await db
    .update(messageTemplates)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(eq(messageTemplates.category, target.category));

  // Set this one as default
  const [updated] = await db
    .update(messageTemplates)
    .set({ isDefault: true, updatedAt: new Date() })
    .where(eq(messageTemplates.id, id))
    .returning();

  if (!updated) throw new Error("Gagal menetapkan template default.");
  return updated;
}

/** Deletes a message template. */
export async function deleteMessageTemplate(
  db: Database,
  id: string,
): Promise<void> {
  await ensureMessageTemplatesTable(db);
  await db.delete(messageTemplates).where(eq(messageTemplates.id, id));
}

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
    .replace(/\{lokasi_acara\}/gi, eventLocation);
}
