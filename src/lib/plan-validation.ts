import type { FamilyPlan, PlanRequest } from "../types/plan";

export class InvalidInputError extends Error {
  constructor(message = "Datos del formulario inválidos.") { super(message); this.name = "InvalidInputError"; }
}
export class InvalidModelOutputError extends Error {
  constructor(message = "Salida de IA inválida.") { super(message); this.name = "InvalidModelOutputError"; }
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}
function isCount(x: unknown): x is number { return Number.isInteger(x) && (x as number) >= 0 && (x as number) <= 12; }

/** Usa únicamente los campos aprobados; no transmite extras como direcciones o nombres. */
export function parsePlanRequest(raw: unknown): PlanRequest {
  if (!isRecord(raw) || !isRecord(raw.family)) throw new InvalidInputError();
  const f = raw.family;
  if (raw.scenario !== "normal" && raw.scenario !== "blocked") throw new InvalidInputError("Escenario no válido.");
  if (typeof raw.scenarioSummary !== "string" || raw.scenarioSummary.trim().length < 1 || raw.scenarioSummary.trim().length > 280)
    throw new InvalidInputError("El resumen del escenario debe tener entre 1 y 280 caracteres.");
  if (typeof raw.routeAvailable !== "boolean") throw new InvalidInputError("Falta disponibilidad de ruta.");
  if (!isCount(f.adults) || !isCount(f.children) || !isCount(f.olderAdults)) throw new InvalidInputError("Cantidades de personas inválidas (0-12 por grupo).");
  const total = f.adults + f.children + f.olderAdults;
  if (total < 1 || total > 20) throw new InvalidInputError("La familia debe tener entre 1 y 20 personas.");
  if (typeof f.reducedMobility !== "boolean" || typeof f.pets !== "boolean") throw new InvalidInputError("Faltan preferencias familiares.");
  return {
    scenario: raw.scenario,
    scenarioSummary: raw.scenarioSummary.trim(),
    routeAvailable: raw.routeAvailable,
    family: {
      adults: f.adults, children: f.children, olderAdults: f.olderAdults,
      reducedMobility: f.reducedMobility, pets: f.pets,
    },
  };
}

function modelText(value: unknown, name: string, min: number, max: number): string {
  if (typeof value !== "string") throw new InvalidModelOutputError(`Falta ${name}.`);
  const s = value.trim();
  if (s.length < min || s.length > max) throw new InvalidModelOutputError(`Longitud inválida: ${name}.`);
  return s;
}
function modelList(value: unknown, name: string, min: number, max: number): string[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) throw new InvalidModelOutputError(`Lista inválida: ${name}.`);
  return value.map((x, i) => modelText(x, `${name}[${i}]`, 5, 280));
}

/** Validar solamente campos que produce el LLM. Fuentes y disclaimer SIEMPRE vienen del servidor. */
export function parseGeneratedContent(raw: unknown): Pick<FamilyPlan, "title" | "summary" | "before" | "during" | "kit"> {
  if (!isRecord(raw)) throw new InvalidModelOutputError();
  const output = {
    title: modelText(raw.title, "title", 3, 100),
    summary: modelText(raw.summary, "summary", 10, 600),
    before: modelList(raw.before, "before", 2, 6),
    during: modelList(raw.during, "during", 2, 6),
    kit: modelList(raw.kit, "kit", 3, 8),
  };
  const all = [output.title, output.summary, ...output.before, ...output.during, ...output.kit].join(" ");
  if (/\b(?:routeavailable|originid|blockedroadids|meeting_01|home_0[123]|road[ _-]?uphill|true|false|json|endpoint)\b/i.test(all)) {
    throw new InvalidModelOutputError("El plan contiene términos técnicos no aptos para el público.");
  }
  // Evitar presentación engañosa del mapa hipotético como ruta oficial verificada.
  if (/ruta(?:s)? (?:calculada(?:s)? )?(?:es|son|está|están) segura(?:s)?/i.test(all) ||
      /(?:meeting_01|home_0[123]).{0,60}(?:refugio oficial|zona segura oficial)/i.test(all) ||
      /alerta (?:oficial |vigente |meteorológica )?(?:emitida|activada) (?:ahora|hoy)/i.test(all)) {
    throw new InvalidModelOutputError("El plan atribuye seguridad o alertas a la simulación.");
  }
  return output;
}
