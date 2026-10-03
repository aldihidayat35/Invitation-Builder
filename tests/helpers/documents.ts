import validFull from "../fixtures/documents/v1/valid-full.json";
import validMinimal from "../fixtures/documents/v1/valid-minimal.json";
import sampleCouple from "../fixtures/data/sample-couple.json";
import type { CanonicalDocumentV1Input } from "@/lib/schema";

/** Fresh deep copy so tests can mutate freely. */
export function fullDocument(): CanonicalDocumentV1Input {
  return structuredClone(validFull) as unknown as CanonicalDocumentV1Input;
}

export function minimalDocument(): CanonicalDocumentV1Input {
  return structuredClone(validMinimal) as unknown as CanonicalDocumentV1Input;
}

export { sampleCouple };

type Loose = Record<string, unknown>;

/** Clone of the full fixture, typed loosely so tests can inject invalid shapes. */
export function mutatedFull(mutate: (doc: Loose) => void): unknown {
  const doc = structuredClone(validFull) as unknown as Loose;
  mutate(doc);
  return doc;
}

/** Returns the element with `id` from a loosely-typed document. */
export function findElement(doc: Loose, id: string): Loose {
  const sections = doc.sections as Loose[];
  for (const section of sections) {
    for (const element of section.elements as Loose[]) {
      if (element.id === id) return element;
    }
  }
  throw new Error(`Fixture element "${id}" not found`);
}
