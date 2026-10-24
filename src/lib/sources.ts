import catalog from "../data/official_sources.json";
import type { PlanRequest, SourceCitation } from "../types/plan";

type CatalogEntry = { id: string; title: string; url: string; facts: string[] };
const entries: CatalogEntry[] = catalog;

/** 2-4 documentos seleccionados del catálogo de páginas gubernamentales previamente verificadas. */
export function chooseSources(input: PlanRequest): CatalogEntry[] {
  const selected = [entries[0], entries[1]];
  if (input.family.children > 0 || input.family.olderAdults > 0 || input.family.reducedMobility) selected.push(entries[2]);
  if (input.family.pets) selected.push(entries[4]);
  else if (input.scenario === "blocked" && selected.length < 4) selected.push(entries[3]);
  return selected.slice(0, 4);
}

export function buildSourceContext(entriesSelected: CatalogEntry[]): string {
  return entriesSelected.map((e) => `${e.title}\n${e.facts.map((f) => "- " + f).join("\n")}`).join("\n\n");
}

/** URLs nunca se delegan al LLM: se sirven desde el catálogo local. */
export function citationsFor(entriesSelected: CatalogEntry[]): SourceCitation[] {
  return entriesSelected.map(({ title, url }) => ({ title, url }));
}
