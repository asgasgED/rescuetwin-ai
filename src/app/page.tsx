
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import FamilyForm from "@/components/FamilyForm";
import type {
  DemoOriginId,
  Scenario,
  SimulationResponse,
} from "@/types/simulation";

import {
  Activity,
  Check,
  House,
  Layers3,
  MapPinned,
  Route,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

const homes: {
  id: DemoOriginId;
  label: string;
  number: string;
}[] = [
  { id: "home_01", label: "Hogar 1", number: "01" },
  { id: "home_02", label: "Hogar 2", number: "02" },
  { id: "home_03", label: "Hogar 3", number: "03" },
];

const MapView = dynamic(
  () => import("@/components/MapView"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[440px] items-center justify-center bg-[#252D29] text-sm text-[#B8B9AC]">
        Preparando explorador geoespacial...
      </div>
    ),
  }
);

export default function Home() {
  const [selectedHome, setSelectedHome] =
    useState<DemoOriginId>("home_01");

  const [scenario, setScenario] =
    useState<Scenario>("normal");

  const [simulation, setSimulation] =
    useState<SimulationResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadSimulation() {
      setLoading(true);
      setError("");
      setSimulation(null);

      try {
        const params = new URLSearchParams({
          scenario,
          originId: selectedHome,
        });

        const response = await fetch(
          `/api/simulate?${params.toString()}`,
          {
            signal: controller.signal,
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error("No se pudo consultar el simulador.");
        }

        const data =
          (await response.json()) as SimulationResponse;

        if (
          data.scenario !== scenario ||
          data.originId !== selectedHome
        ) {
          throw new Error("La respuesta no coincide con la selección.");
        }

        if (!controller.signal.aborted) {
          setSimulation(data);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "Error al cargar la simulación."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadSimulation();

    return () => controller.abort();
  }, [scenario, selectedHome]);

  const isBlocked = scenario === "blocked";

  const distance =
    simulation?.routeDistanceM != null
      ? `${Math.round(simulation.routeDistanceM).toLocaleString("es-PE")} m`
      : loading
        ? "..."
        : "—";

  const blockedCount =
    simulation?.blockedRoadIds.length ?? 0;

  const routeStatus = loading
    ? "Calculando recorrido..."
    : error
      ? "Simulación no disponible"
      : simulation?.route
        ? "Recorrido calculado"
        : "Sin recorrido disponible";

  return (
    <main className="min-h-screen min-w-0 overflow-x-clip bg-[#171C1B] text-[#EAE5DA]">
      <header className="border-b border-white/10 bg-[#1B221F]">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-8 xl:px-12">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#BAF274]/25 bg-[#BAF274]/10">
              <MapPinned
                size={23}
                className="text-[#BAF274]"
              />
            </div>

            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                RescueTwin{" "}
                <span className="text-[#BAF274]">AI</span>
              </h1>

              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#A9B4A9]">
                SYNAPSE / Inteligencia geoespacial
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-[#A9B4A9] md:inline">
              Catacaos · Piura, Perú
            </span>

            <span className="inline-flex items-center gap-2 rounded-full border border-[#BAF274]/25 bg-[#BAF274]/10 px-3 py-2 text-[11px] font-medium text-[#D5F5B0]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#BAF274]" />
              Demo
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 pb-8 pt-7 sm:px-5 md:px-8 xl:px-12">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#BAF274]">
              <span className="h-px w-6 bg-[#BAF274]" />
              Exploración de escenarios
            </div>

            <h2 className="max-w-3xl text-3xl font-medium leading-[1.13] tracking-[-0.05em] sm:text-4xl lg:text-[46px]">
              Entiende tu entorno.
              <br />
              <span className="text-[#BAF274]">
                Prepárate para lo inesperado.
              </span>
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#B8B9AC]">
              Compara rutas calculadas sobre calles de Catacaos, explora cierres hipotéticos y prepara un plan familiar personalizado.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#252D29] px-4 py-3">
            <div className="rounded-lg bg-[#BAF274]/10 p-2">
              <Activity
                size={18}
                className="text-[#BAF274]"
              />
            </div>

            <div>
              <p className="text-xs font-medium">
                Simulación interactiva
              </p>
              <p className="text-[11px] text-[#A9B4A9]">
                3 hogares · 2 escenarios
              </p>
            </div>
          </div>
        </div>
        <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
          <section className="order-2 min-w-0 overflow-hidden rounded-[26px] xl:order-1 border border-white/10 bg-[#252D29] shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#2B342E] px-5 py-4 sm:px-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.19em] text-[#A9B4A9]">
                  01 / Territorio
                </p>

                <div className="mt-1 flex items-center gap-2">
                  <h3 className="text-base font-semibold">
                    Explorador de Catacaos
                  </h3>

                  <span className="rounded-md border border-white/15 px-2 py-1 text-[9px] uppercase tracking-widest text-[#A9B4A9]">
                    2D
                  </span>
                </div>
              </div>

              <div
                className={`flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] ${
                  isBlocked
                    ? "border-[#F38B56]/40 bg-[#F38B56]/10 text-[#FFBD99]"
                    : "border-[#BAF274]/30 bg-[#BAF274]/10 text-[#D0F4A0]"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isBlocked
                      ? "bg-[#F38B56]"
                      : "bg-[#BAF274]"
                  }`}
                />
                {isBlocked
                  ? "Bloqueo hipotético"
                  : "Escenario normal"}
              </div>
            </div>
            <div className="relative h-[410px] w-full bg-[#28322B] min-[380px]:h-[470px] sm:h-[550px] lg:h-[600px] xl:h-[650px]">
              <MapView
                originId={selectedHome}
                scenario={scenario}
                simulation={simulation}
                loading={loading}
                simulationError={error}
              />
              <div className="pointer-events-none absolute bottom-3 right-3 z-[1100] hidden max-w-[205px] rounded-xl border border-white/15 bg-[#171C1B]/90 px-4 py-3 shadow-xl backdrop-blur-md sm:block">
                <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.15em] text-[#A9B4A9]">
                  Leyenda
                </p>

                <div className="space-y-2 text-[11px] text-[#EAE5DA]">
                  <div className="flex items-center gap-2">
                    <span className="h-[3px] w-6 rounded-full bg-[#57B9AC]" />
                    Recorrido calculado
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-6 border-t-[3px] border-dashed border-[#F38B56]" />
                    Vía bloqueada
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#BAF274]" />
                    Hogar ilustrativo
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-white/10 bg-[#222A26] p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Route
                    size={17}
                    className="text-[#57B9AC]"
                  />

                  <p className="text-xs font-medium">
                    Lectura del simulador
                  </p>
                </div>

                <span
                  role="status"
                  className="text-[11px] text-[#A9B4A9]"
                >
                  {routeStatus}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-[#303834] p-4">
                  <p className="text-[10px] uppercase tracking-[0.13em] text-[#A9B4A9]">
                    Distancia modelada
                  </p>

                  <p className="mt-2 text-2xl font-semibold tracking-tight text-[#8ED8CB]">
                    {distance}
                  </p>

                  <p className="mt-1 text-[10px] text-[#A9B4A9]">
                    Ruta calculada
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#303834] p-4">
                  <p className="text-[10px] uppercase tracking-[0.13em] text-[#A9B4A9]">
                    Vías bloqueadas
                  </p>

                  <p className="mt-2 text-2xl font-semibold tracking-tight text-[#F8AE87]">
                    {loading ? "..." : error ? "—" : blockedCount}
                  </p>

                  <p className="mt-1 text-[10px] text-[#A9B4A9]">
                    Según el escenario
                  </p>
                </div>
              </div>

              {error && (
                <p
                  role="alert"
                  className="mt-3 text-xs text-[#F8AE87]"
                >
                  {error}
                </p>
              )}
            </div>
          </section>
          <aside className="order-1 grid min-w-0 gap-4 sm:grid-cols-2 xl:order-2 xl:flex xl:flex-col">
            <section className="rounded-[22px] border border-white/10 bg-[#303834] p-5 shadow-[0_10px_35px_rgba(0,0,0,0.12)]">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[#A9B4A9]">
                    02 / Origen
                  </p>

                  <div className="flex items-center gap-2">
                    <House
                      size={18}
                      className="text-[#BAF274]"
                    />
                    <h3 className="font-semibold">
                      Selecciona un hogar
                    </h3>
                  </div>
                </div>

                <span className="text-[10px] text-[#A9B4A9]">
                  01 — 03
                </span>
              </div>

              <div className="space-y-2">
                {homes.map((home) => {
                  const selected =
                    selectedHome === home.id;

                  return (
                    <button
                      key={home.id}
                      type="button"
                      onClick={() => setSelectedHome(home.id)}
                      aria-pressed={selected}
                      className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all ${
                        selected
                          ? "border-[#BAF274]/70 bg-[#BAF274]/10"
                          : "border-white/10 bg-[#252D29] hover:border-white/30"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold ${
                          selected
                            ? "bg-[#BAF274]/20 text-[#BAF274]"
                            : "bg-white/5 text-[#B8B9AC]"
                        }`}
                      >
                        {home.number}
                      </span>

                      <div className="flex-1">
                        <p
                          className={`text-sm font-medium ${
                            selected
                              ? "text-[#D8F8AF]"
                              : "text-[#EAE5DA]"
                          }`}
                        >
                          {home.label}
                        </p>

                        <p className="mt-0.5 text-[10px] text-[#A9B4A9]">
                          Ubicación de demostración
                        </p>
                      </div>

                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                          selected
                            ? "border-[#BAF274] bg-[#BAF274] text-[#171C1B]"
                            : "border-white/30"
                        }`}
                      >
                        {selected && <Check size={12} />}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="mt-4 text-[11px] leading-5 text-[#A9B4A9]">
                Tres hogares ficticios para explorar distintos recorridos.
              </p>
            </section>
            <section className="rounded-[22px] border border-white/10 bg-[#303834] p-5 shadow-[0_10px_35px_rgba(0,0,0,0.12)]">
              <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[#A9B4A9]">
                03 / Escenario
              </p>

              <div className="mb-5 flex items-center gap-2">
                <Layers3
                  size={18}
                  className="text-[#BAF274]"
                />
                <h3 className="font-semibold">
                  Explora qué cambia
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScenario("normal")}
                  aria-pressed={!isBlocked}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    !isBlocked
                      ? "border-[#BAF274]/70 bg-[#BAF274]/10"
                      : "border-white/10 bg-[#252D29] hover:border-white/30"
                  }`}
                >
                  <div className="mb-3 h-2 w-2 rounded-full bg-[#BAF274]" />
                  <p className="text-xs font-semibold">
                    Normal
                  </p>
                  <p className="mt-1 text-[10px] text-[#A9B4A9]">
                    Sin bloqueos
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setScenario("blocked")}
                  aria-pressed={isBlocked}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    isBlocked
                      ? "border-[#F38B56]/70 bg-[#F38B56]/10"
                      : "border-white/10 bg-[#252D29] hover:border-white/30"
                  }`}
                >
                  <div className="mb-3 h-2 w-2 rounded-full bg-[#F38B56]" />
                  <p className="text-xs font-semibold">
                    Bloqueo
                  </p>
                  <p className="mt-1 text-[10px] text-[#A9B4A9]">
                    Hipotético
                  </p>
                </button>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/10 bg-[#252D29] p-3">
                <Activity
                  size={15}
                  className="mt-0.5 shrink-0 text-[#BAF274]"
                />

                <p className="text-[11px] leading-5 text-[#C4CABC]">
                  {isBlocked
                    ? "El simulador excluye las vías bloqueadas e intenta calcular una alternativa."
                    : "El simulador calcula el recorrido sobre la red sin bloqueos hipotéticos."}
                </p>
              </div>
            </section>
            <section className="rounded-[20px] border border-[#F38B56]/30 bg-[#F38B56]/10 p-4 sm:col-span-2 xl:col-span-1">
              <div className="mb-2 flex items-center gap-2">
                <ShieldAlert
                  size={18}
                  className="text-[#F8AE87]"
                />

                <h3 className="text-xs font-semibold text-[#FFD3B8]">
                  Demo de simulación
                </h3>
              </div>

              <p className="text-[11px] leading-5 text-[#E7D4C5]">
                Las rutas se calculan sobre calles de OpenStreetMap, pero no han sido validadas para evacuaciones reales. Los cierres son hipotéticos. Sigue siempre las indicaciones oficiales.
              </p>
            </section>

          </aside>
        </div>
        <section id="plan-familiar" className="mt-5 min-w-0">
          <div className="mb-3 flex items-center gap-2 px-1 text-[#BAF274]">
            <Sparkles size={17} />
            <h3 className="text-sm font-semibold text-[#EAE5DA]">Tu plan familiar</h3>
          </div>
          <FamilyForm
            originId={selectedHome}
            scenario={scenario}
            simulation={simulation}
            simulationLoading={loading}
            simulationError={error}
          />
        </section>
        <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-[11px] text-[#A9B4A9]">
          <p>
            © SYNAPSE · RescueTwin AI
          </p>

          <p>
            Datos geoespaciales y planes de preparación familiar.
          </p>

          <p>
            Demo · Catacaos, Piura
          </p>
        </footer>
      </div>
    </main>
  );
}
