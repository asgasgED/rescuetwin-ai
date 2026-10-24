import { AiUnavailableError, generatePlan } from "../../../lib/ai";
import { InvalidInputError, parsePlanRequest } from "../../../lib/plan-validation";
import type { ApiErrorBody } from "../../../types/plan";

export const maxDuration = 60;

const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store, max-age=0" };
function errorResponse(code: ApiErrorBody["error"]["code"], message: string, status: number): Response {
  return new Response(JSON.stringify({ error: { code, message } }), { status, headers });
}

export async function POST(req: Request): Promise<Response> {
  try {
    if ((Number(req.headers.get("content-length")) || 0) > 10000) return errorResponse("INVALID_REQUEST", "Solicitud demasiado grande.", 400);
    if (!(req.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) return errorResponse("INVALID_REQUEST", "Se necesita application/json.", 400);
    const content = await req.text();
    if (new TextEncoder().encode(content).length > 10000) return errorResponse("INVALID_REQUEST", "Solicitud demasiado grande.", 400);
    let raw: unknown;
    try { raw = JSON.parse(content) as unknown; }
    catch { return errorResponse("INVALID_REQUEST", "JSON inválido.", 400); }
    const input = parsePlanRequest(raw);
    const result = await generatePlan(input);
    return new Response(JSON.stringify(result), { status: 200, headers });
  } catch (error) {
    if (error instanceof InvalidInputError) return errorResponse("INVALID_REQUEST", error.message, 400);
    if (error instanceof AiUnavailableError) return errorResponse("AI_UNAVAILABLE", error.message, 503);
    // No logs de datos personales ni de contenido del proveedor.
    return errorResponse("INTERNAL_ERROR", "Ocurrió un error al generar el plan.", 500);
  }
}
