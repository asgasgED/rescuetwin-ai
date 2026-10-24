"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, Share2 } from "lucide-react";
import PlanResult from "@/components/PlanResult";
import { decodePlanHash } from "@/lib/share";
import type { PublicPlanSnapshot } from "@/contracts/api";

export default function SharedPlanPage() {
  const [plan, setPlan] = useState<PublicPlanSnapshot | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const update = () => {
      setPlan(decodePlanHash(window.location.hash));
      setReady(true);
    };
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  return (
    <main className="min-h-screen bg-[#171C1B] px-4 py-8 text-[#EAE5DA] sm:py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm hover:border-[#BAF274]">
            <ArrowLeft size={16} /> Explorar RescueTwin AI
          </Link>
          <span className="inline-flex items-center gap-2 text-sm text-[#BAF274]"><Share2 size={17} /> SYNAPSE</span>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#BAF274]">Plan recibido mediante enlace</p>
          <h1 className="text-3xl font-semibold">Plan familiar compartido</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#B8C5BB]">
            Este enlace contiene un resumen del plan, no información en tiempo real. Cualquiera que tenga el enlace puede leerlo.
          </p>
        </div>
        {!ready ? (
          <p role="status">Cargando plan compartido...</p>
        ) : plan ? (
          <>
            <p className="rounded-xl border border-[#BAF274]/25 bg-[#BAF274]/10 p-4 text-sm text-[#D8F8AF]">
              {plan.scenario === "blocked" ? "Escenario: vías bloqueadas hipotéticamente" : "Escenario: sin bloqueos hipotéticos"}
            </p>
            <PlanResult plan={plan} scenario={plan.scenario} shared />
          </>
        ) : (
          <div role="alert" className="flex items-start gap-3 rounded-2xl border border-[#F38B56]/30 bg-[#F38B56]/10 p-6 text-sm text-[#FFD3B8]">
            <ShieldAlert className="shrink-0" /> El enlace no contiene un plan válido o está incompleto. Pide un enlace nuevo o genera tu propio plan desde RescueTwin AI.
          </div>
        )}
      </div>
    </main>
  );
}
