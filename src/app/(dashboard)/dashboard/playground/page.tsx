import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VariableFields } from "@/features/invitations";
import {
  buildFormFields,
  formatFormValue,
  groupFormFields,
  parseFormSubmission,
  resolveDocument,
  validateInvitationData,
  createVariableRegistry,
  type GuestData,
  type InvitationData,
  type ResolvedDocument,
} from "@/lib/engine";
import { createSampleTemplate, SAMPLE_DATASETS } from "@/lib/engine/samples";
import styles from "./playground.module.css";

export const metadata: Metadata = { title: "Engine playground", robots: { index: false } };

const FORM_PREFIX = "v.";
const FORM_TIME_ZONE = "Asia/Jakarta";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function elementLines(resolved: ResolvedDocument) {
  return resolved.sections.flatMap((section) =>
    section.elements.map((element) => ({
      key: `${section.id}/${element.id}`,
      section: section.name ?? section.id,
      id: element.id,
      hidden: element.hidden,
      text: element.type === "text" ? element.text : `(${element.type})`,
    })),
  );
}

/**
 * Development-only playground (Fase 3, step 6): renders RESOLVED text/JSON for
 * sample data. Not a public surface and not the final Data Mode UI (F8).
 */
export default async function PlaygroundPage({ searchParams }: PageProps<"/dashboard/playground">) {
  if (process.env.NODE_ENV === "production") notFound();

  const params = await searchParams;
  const template = createSampleTemplate();
  const registry = createVariableRegistry(template.variables);
  const fields = buildFormFields(template.variables);
  const groups = groupFormFields(fields);

  const presetId = first(params.set) === "b" ? "b" : "a";
  const preset = SAMPLE_DATASETS.find((d) => d.id === presetId) ?? SAMPLE_DATASETS[0]!;

  const submitted: Record<string, string> = {};
  for (const [name, value] of Object.entries(params)) {
    if (name.startsWith(FORM_PREFIX)) {
      const v = first(value);
      if (v !== undefined) submitted[name.slice(FORM_PREFIX.length)] = v;
    }
  }
  const fromForm = Object.keys(submitted).length > 0;

  let data: InvitationData = preset.data;
  const errors: Record<string, string> = {};
  if (fromForm) {
    const parsed = parseFormSubmission(template.variables, submitted, { timeZone: FORM_TIME_ZONE });
    data = parsed.data;
    for (const issue of parsed.issues) errors[issue.key] = issue.message;
  } else {
    for (const issue of validateInvitationData(registry, preset.data)) {
      errors[issue.key] = issue.message;
    }
  }
  const guest: GuestData = fromForm
    ? { name: first(params.guest)?.trim() || undefined }
    : preset.guest;

  const values: Record<string, string> = {};
  for (const field of fields) {
    values[field.key] = fromForm
      ? (submitted[field.key] ?? "")
      : formatFormValue(field, (data as Record<string, unknown>)[field.key]);
  }

  const resolved = resolveDocument(template, data, guest);
  const compare = SAMPLE_DATASETS.map((d) => ({
    dataset: d,
    resolved: resolveDocument(template, d.data, d.guest),
  }));

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Fase 3 - hanya development</p>
        <h1 className={styles.title}>Engine playground</h1>
        <p className={styles.lead}>
          Satu template, banyak dataset. Template tidak pernah diubah; hanya model hasil resolve
          yang berbeda (P-02).
        </p>
      </header>

      <nav className={styles.tabs} aria-label="Dataset contoh">
        {SAMPLE_DATASETS.map((d) => (
          <Link
            key={d.id}
            href={`/dashboard/playground?set=${d.id}`}
            className={styles.tab}
            aria-current={!fromForm && d.id === presetId ? "page" : undefined}
          >
            {d.label}
          </Link>
        ))}
      </nav>

      <div className={styles.grid}>
        <section className={styles.panel} aria-labelledby="form-heading">
          <h2 id="form-heading" className={styles.panelTitle}>
            Form dari variable schema
          </h2>
          <form method="get" action="/dashboard/playground" id="playground-form">
            <VariableFields
              groups={groups}
              values={values}
              namePrefix={FORM_PREFIX}
              errors={errors}
            />
            <label className={styles.guest}>
              Nama tamu (runtime <code>guest.name</code>)
              <input
                name="guest"
                type="text"
                defaultValue={guest.name ?? ""}
                className={styles.guestInput}
              />
            </label>
            <button type="submit" className={styles.submit} id="playground-apply">
              Terapkan
            </button>
          </form>
        </section>

        <section className={styles.panel} aria-labelledby="resolved-heading">
          <h2 id="resolved-heading" className={styles.panelTitle}>
            Hasil resolve {fromForm ? "(form)" : `(${preset.label})`}
          </h2>
          <p className={resolved.ok ? styles.ok : styles.bad} id="resolve-status">
            {resolved.ok ? "Siap dirender" : `${resolved.issues.length} masalah`}
          </p>
          <ul className={styles.lines} id="resolved-lines">
            {elementLines(resolved).map((line) => (
              <li key={line.key} data-hidden={line.hidden ? "true" : undefined}>
                <span className={styles.lineMeta}>
                  {line.section} / {line.id}
                  {line.hidden ? " - disembunyikan" : ""}
                </span>
                <span className={styles.lineText}>{line.text}</span>
              </li>
            ))}
          </ul>
          {resolved.issues.length > 0 ? (
            <ul className={styles.issues} id="resolve-issues">
              {resolved.issues.map((issue, i) => (
                <li key={i}>
                  <code>{issue.code}</code> {issue.message}
                </li>
              ))}
            </ul>
          ) : null}
          <details className={styles.json}>
            <summary>Resolved JSON</summary>
            <pre>{JSON.stringify(resolved, null, 2)}</pre>
          </details>
        </section>
      </div>

      <section className={styles.panel} aria-labelledby="compare-heading">
        <h2 id="compare-heading" className={styles.panelTitle}>
          Template yang sama, dua dataset
        </h2>
        <div className={styles.compare} id="compare">
          {compare.map(({ dataset, resolved: r }) => (
            <div key={dataset.id} data-testid={`compare-${dataset.id}`}>
              <h3 className={styles.compareTitle}>{dataset.label}</h3>
              <ul className={styles.lines}>
                {elementLines(r).map((line) => (
                  <li key={line.key} data-hidden={line.hidden ? "true" : undefined}>
                    <span className={styles.lineMeta}>{line.id}</span>
                    <span className={styles.lineText}>{line.hidden ? "-" : line.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
