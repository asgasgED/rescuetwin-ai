
"use client";

import { useEffect, useRef, useState } from "react";
import { Users, ShieldCheck } from "lucide-react";
import PlanResult from "./PlanResult";
import type { FamilyPlan, Scenario } from "@/types/plan";
import type { SimulationResponse } from "@/types/simulation";

type Props = {
  originId: string;
  scenario: Scenario;
  simulation: SimulationResponse | null;
  simulationLoading: boolean;
  simulationError: string;
};

type GeneratedResult = {
  originId: string;
  scenario: Scenario;
  plan: FamilyPlan;
};

export default function FamilyForm({ originId, scenario, simulation, simulationLoading, simulationError }: Props) {
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [seniors, setSeniors] = useState(0);
  const [mobility, setMobility] = useState(false);
  const [pets, setPets] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GeneratedResult | null>(null);

  const activeRequest = useRef<AbortController | null>(null);
  // Evitar que una respuesta de un hogar/escenario anterior aparezca en pantalla.
  useEffect(() => {
    return () => activeRequest.current?.abort();
  }, [originId, scenario]);

  const total = adults + children + seniors;
  const simulationReady = !!simulation && simulation.originId === originId && simulation.scenario === scenario && !simulationLoading && !simulationError;

  const fields = [
    { label: "Adultos", value: adults, change: setAdults },
    { label: "Menores de 18 años", value: children, change: setChildren },
    { label: "Adultos mayores", value: seniors, change: setSeniors },
  ];

  async function handleGeneratePlan() {
    if (loading || total < 1 || total > 20 || !simulationReady || !simulation) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const routeAvailable = simulation.route !== null;
      const blockedCount = simulation.blockedRoadIds.length;
      const scenarioSummary = scenario === "blocked"
        ? `Escenario de demostración en Catacaos con ${blockedCount} tramos hipotéticamente bloqueados. ${routeAvailable ? "El grafo encuentra un recorrido ilustrativo." : "El grafo no encuentra un recorrido ilustrativo."}`
        : `Escenario de demostración en Catacaos sin bloqueos hipotéticos. ${routeAvailable ? "El grafo encuentra un recorrido ilustrativo." : "El grafo no encuentra un recorrido ilustrativo."}`;
      const controller = new AbortController();
      activeRequest.current?.abort();
      activeRequest.current = controller;

      const planResponse = await fetch("/api/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({
          scenario,
          scenarioSummary,
          routeAvailable,
          family: {
            adults,
            children,
            olderAdults: seniors,
            reducedMobility: mobility,
            pets,
          },
        }),
      });

      const data: unknown = await planResponse.json();

      if (!planResponse.ok) {
        const apiError = data as {
          error?: { message?: string };
        };

        throw new Error(
          apiError.error?.message ||
            "No se pudo generar el plan familiar."
        );
      }

      const plan = data as FamilyPlan;

      if (
        typeof plan.title !== "string" ||
        typeof plan.summary !== "string" ||
        !Array.isArray(plan.before) ||
        !Array.isArray(plan.during) ||
        !Array.isArray(plan.kit) ||
        !Array.isArray(plan.sources) ||
        typeof plan.disclaimer !== "string"
      ) {
        throw new Error("La API devolvió un plan incompleto.");
      }

      if (!controller.signal.aborted) setResult({ originId, scenario, plan });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible generar el plan."
      );
    } finally {
      setLoading(false);
      activeRequest.current = null;
    }
  }

  const currentPlan =
    result?.originId === originId &&
    result?.scenario === scenario
      ? result.plan
      : null;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/10 bg-[#303834] p-4 text-[#EAE5DA] sm:p-6">
        <div className="mb-6 flex items-center gap-3">
          <Users className="text-[#BAF274]" size={24} />
          <div>
            <h2 className="text-xl font-semibold">
              Prepara a tu familia
            </h2>
            <p className="text-sm text-[#B8B9AC]">
              Completa tu perfil familiar
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {fields.map((field) => (
            <div
              key={field.label}
              className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#252D29] px-4 py-3"
            >
              <span className="text-sm">{field.label}</span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={loading}
                  aria-label={`Disminuir ${field.label}`}
                  onClick={() => {
                    field.change(Math.max(0, field.value - 1));
                    setResult(null);
                  }}
                  className="min-h-11 min-w-11 rounded-lg border border-white/20 px-3 py-2 disabled:opacity-50"
                >
                  −
                </button>

                <span className="w-5 text-center">
                  {field.value}
                </span>

                <button
                  type="button"
                  disabled={loading || total >= 20}
                  aria-label={`Aumentar ${field.label}`}
                  onClick={() => {
                    field.change(Math.min(12, field.value + 1));
                    setResult(null);
                  }}
                  className="min-h-11 min-w-11 rounded-lg border border-white/20 px-3 py-2 disabled:opacity-50"
                >
                  +
                </button>
              </div>
            </div>
          ))}
          </div>

          <div className="border-t border-white/10 pt-4">
            <p className="text-sm text-[#BAF274]">
              Total: {total} personas
            </p>
          </div>

          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              disabled={loading}
              checked={mobility}
              onChange={(e) => {
                setMobility(e.target.checked);
                setResult(null);
              }}
              className="h-5 w-5 accent-[#BAF274]"
            />
            ¿Alguien necesita apoyo de movilidad?
          </label>

          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              disabled={loading}
              checked={pets}
              onChange={(e) => {
                setPets(e.target.checked);
                setResult(null);
              }}
              className="h-5 w-5 accent-[#BAF274]"
            />
            ¿Tienen mascotas?
          </label>

          <button
            type="button"
            onClick={handleGeneratePlan}
            disabled={loading || total < 1 || !simulationReady}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#BAF274] px-5 py-4 font-semibold text-[#171C1B] transition hover:bg-[#D5FFA5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShieldCheck size={20} />
            {loading ? "Generando plan..." : "Generar plan con IA"}
          </button>

          {!simulationReady && (
            <p role="status" className="text-xs leading-relaxed text-[#B8C5BB]">
              {simulationError || (simulationLoading ? "Calculando el escenario antes de generar el plan..." : "Selecciona un hogar y espera a que se calcule el escenario.")}
            </p>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-[#F38B56]/40 bg-[#F38B56]/10 p-4 text-sm text-[#FFD4BE]"
            >
              {error}
            </div>
          )}

          <p className="text-xs leading-relaxed text-[#B8B9AC]">
            El plan se adapta a tu familia y se basa en fuentes de preparación. No ingreses nombres, direcciones ni datos personales. Verifica las recomendaciones con las autoridades.
          </p>
        </div>
      </section>

      {currentPlan && <PlanResult plan={currentPlan} scenario={scenario} />}
    </div>
  );
}
