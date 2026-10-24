/** Compartición sin servidor, según el contrato SYNAPSE v1.0.1. */
import LZString from "lz-string";
import type { FamilyPlan, Scenario } from "@/types/plan";
import type { PublicPlanSnapshot } from "@/contracts/api";

const MAX_URL_LENGTH = 3500;
const MAX_TOKEN_LENGTH = 3500;

function safeLine(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function safeList(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string")
    .slice(0, maxItems).map((x) => safeLine(x, 165)).filter(Boolean);
}

function safeSources(value: unknown): { title: string; url: string }[] {
  if (!Array.isArray(value)) return [];
  const result: { title: string; url: string }[] = [];
  for (const candidate of value.slice(0, 5)) {
    if (!candidate || typeof candidate !== "object") continue;
    const obj = candidate as Record<string, unknown>;
    const title = safeLine(obj.title, 95);
    const url = safeLine(obj.url, 400);
    try {
      const parsed = new URL(url);
      if (title && parsed.protocol === "https:") result.push({ title, url: parsed.href });
    } catch { /* Se omiten enlaces no válidos. */ }
    if (result.length === 2) break;
  }
  return result;
}

export function makePublicSnapshot(plan: FamilyPlan, scenario: Scenario): PublicPlanSnapshot {
  return {
    v: 1,
    scenario,
    title: safeLine(plan.title, 100),
    summary: safeLine(plan.summary, 350),
    before: safeList(plan.before, 4),
    during: safeList(plan.during, 4),
    kit: safeList(plan.kit, 4),
    sources: safeSources(plan.sources),
    disclaimer: safeLine(plan.disclaimer, 350),
  };
}

export function encodePlanUrl(plan: FamilyPlan, scenario: Scenario, siteOrigin: string): string | null {
  const snapshot = makePublicSnapshot(plan, scenario);
  const token = LZString.compressToEncodedURIComponent(JSON.stringify(snapshot));
  const url = `${siteOrigin}/shared#plan=v1.${token}`;
  return url.length <= MAX_URL_LENGTH ? url : null;
}

export function decodePlanHash(hash: string): PublicPlanSnapshot | null {
  if (!hash.startsWith("#plan=v1.")) return null;
  const token = hash.slice("#plan=v1.".length);
  if (!token || token.length > MAX_TOKEN_LENGTH || !/^[A-Za-z0-9+\-$]+$/.test(token)) return null;
  try {
    const decoded = LZString.decompressFromEncodedURIComponent(token);
    if (!decoded || decoded.length > 12000) return null;
    const raw: unknown = JSON.parse(decoded);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const value = raw as Record<string, unknown>;
    if (value.v !== 1 || (value.scenario !== "normal" && value.scenario !== "blocked")) return null;
    if (!safeLine(value.title, 100) || !safeLine(value.summary, 350) || !safeLine(value.disclaimer, 350)) return null;
    if (!["before", "during", "kit", "sources"].every((key) => Array.isArray(value[key]))) return null;
    const result = makePublicSnapshot(value as unknown as FamilyPlan, value.scenario);
    if (!result.before.length || !result.during.length || !result.kit.length) return null;
    return result;
  } catch { return null; }
}

export function shareText(plan: FamilyPlan): string {
  const items = (values: string[]) => values.map((item) => `• ${item}`);
  const sources = plan.sources
    .filter((source) => { try { return new URL(source.url).protocol === "https:"; } catch { return false; } })
    .map((source) => `• ${source.title}: ${source.url}`);
  return [
    "RescueTwin AI — SYNAPSE",
    "PLAN FAMILIAR DE PREPARACIÓN",
    "",
    plan.title,
    plan.summary,
    "",
    "ANTES DEL EVENTO", ...items(plan.before),
    "",
    "DURANTE EL EVENTO", ...items(plan.during),
    "",
    "KIT FAMILIAR", ...items(plan.kit),
    ...(sources.length ? ["", "FUENTES DE REFERENCIA", ...sources] : []),
    "",
    plan.disclaimer,
    "No es una alerta oficial. Sigue las indicaciones de las autoridades.",
  ].join("\n");
}

export async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(value); return; } catch { /* Se utiliza el método alternativo. */ }
  }
  const input = document.createElement("textarea");
  input.value = value;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  const success = document.execCommand("copy");
  input.remove();
  if (!success) throw new Error("No se pudo copiar. Selecciona y copia el texto manualmente.");
}
