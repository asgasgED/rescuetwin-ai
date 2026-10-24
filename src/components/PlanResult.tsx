"use client";

import { useState } from "react";
import { Check, Copy, Download, ExternalLink, Share2, MessageCircle } from "lucide-react";
import type { FamilyPlan, Scenario } from "@/types/plan";
import { copyText, makePublicSnapshot, shareText } from "@/lib/share";

type Props = {
  plan: FamilyPlan;
  scenario: Scenario;
  shared?: boolean;
};

function makeStoryCard(plan: FamilyPlan, scenario: Scenario): File {
  const snapshot = makePublicSnapshot(plan, scenario);
  const canvas = document.createElement("canvas");
  const w = 1080;
  const h = 1920;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Tu navegador no permite generar la imagen.");
  ctx.fillStyle = "#14201B";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#BAF274";
  ctx.fillRect(74, 76, 125, 10);
  ctx.font = "bold 32px Arial, sans-serif";
  ctx.fillText("RESCUETWIN AI  /  SYNAPSE", 74, 140);
  ctx.fillStyle = "#B9C9C0";
  ctx.font = "26px Arial, sans-serif";
  ctx.fillText("PLAN DE PREPARACIÓN · DEMOSTRACIÓN", 74, 194);
  let y = 275;
  function wrap(text: string, maxWidth: number, font: string, lineHeight: number, maxLines: number): void {
    ctx!.font = font;
    const words = text.split(/\s+/);
    let line = "";
    let lines = 0;
    for (const word of words) {
      const trial = line ? `${line} ${word}` : word;
      if (ctx!.measureText(trial).width > maxWidth && line) {
        ctx!.fillText(line, 74, y);
        y += lineHeight;
        lines += 1;
        line = word;
        if (lines >= maxLines) return;
      } else line = trial;
    }
    if (line && lines < maxLines) { ctx!.fillText(line, 74, y); y += lineHeight; }
  }
  ctx.fillStyle = "#F3F7ED";
  wrap(snapshot.title, 920, "bold 55px Arial, sans-serif", 70, 3);
  y += 16;
  ctx.fillStyle = "#C3D0C6";
  wrap(snapshot.summary, 920, "29px Arial, sans-serif", 40, 5);
  y += 48;
  const sections = [
    { label: "ANTES", items: snapshot.before.slice(0, 3) },
    { label: "DURANTE", items: snapshot.during.slice(0, 3) },
    { label: "KIT FAMILIAR", items: snapshot.kit.slice(0, 3) },
  ];
  for (const section of sections) {
    if (y > 1550) break;
    ctx.fillStyle = "#BAF274";
    ctx.font = "bold 32px Arial, sans-serif";
    ctx.fillText(section.label, 74, y);
    y += 48;
    ctx.fillStyle = "#EAE5DA";
    for (const item of section.items) {
      if (y > 1615) break;
      wrap(`• ${item}`, 910, "27px Arial, sans-serif", 37, 2);
      y += 12;
    }
    y += 40;
  }
  ctx.fillStyle = "#25382E";
  ctx.fillRect(0, 1718, 1080, 202);
  ctx.fillStyle = "#FFD3B8";
  ctx.font = "bold 27px Arial, sans-serif";
  ctx.fillText("DEMO DE SIMULACIÓN, NO ALERTA OFICIAL", 74, 1790);
  ctx.fillStyle = "#D4DDD4";
  ctx.font = "25px Arial, sans-serif";
  ctx.fillText("Rutas y escenarios hipotéticos, no validados", 74, 1842);
  ctx.fillText("para la evacuación. Sigue a las autoridades.", 74, 1880);
  const encoded = canvas.toDataURL("image/png").split(",")[1];
  const raw = window.atob(encoded);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index++) bytes[index] = raw.charCodeAt(index);
  return new File([bytes], "RescueTwin_Plan_Familiar.png", { type: "image/png" });
}

function downloadCard(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function supportsFileSharing(file: File): boolean {
  return typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] });
}

export default function PlanResult({ plan, scenario, shared = false }: Props) {
  const [shareStatus, setShareStatus] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  async function onCopyMessage() {
    setShareStatus("");
    try {
      await copyText(shareText(plan));
      setShareStatus("Plan completo copiado. Puedes pegarlo en WhatsApp o cualquier otra aplicación.");
    } catch (error) {
      setShareStatus(error instanceof Error ? error.message : "No se pudo copiar el plan.");
    }
  }

  async function onWhatsApp() {
    if (isSharing) return;
    setShareStatus("");
    setIsSharing(true);
    try {
      const file = makeStoryCard(plan, scenario);
      if (supportsFileSharing(file)) {
        try {
          await navigator.share({ files: [file], title: "RescueTwin AI — Plan familiar" });
          setShareStatus("Selecciona WhatsApp para enviar la tarjeta a un contacto o publicarla si tu dispositivo lo permite.");
        } catch (error) {
          if (!(error instanceof Error && error.name === "AbortError")) {
            setShareStatus("No se pudo compartir la tarjeta. Prueba guardar el PNG y adjuntarlo en WhatsApp.");
          }
        }
      } else {
        downloadCard(file);
        setShareStatus("Se descargó la tarjeta. Adjunta el PNG en WhatsApp; tu navegador no permite enviarlo automáticamente.");
        const target = `https://wa.me/?text=${encodeURIComponent("Te comparto mi plan familiar de RescueTwin AI. Adjunto la tarjeta con las recomendaciones.")}`;
        const newWindow = window.open(target, "_blank", "noopener,noreferrer");
        if (!newWindow) setShareStatus("Tarjeta guardada. Abre WhatsApp y adjunta el PNG al contacto o estado que prefieras.");
      }
    } catch (error) {
      setShareStatus(error instanceof Error ? error.message : "No fue posible generar la tarjeta.");
    } finally {
      setIsSharing(false);
    }
  }

  async function onNativeShare() {
    if (isSharing) return;
    setShareStatus("");
    setIsSharing(true);
    try {
      const file = makeStoryCard(plan, scenario);
      if (!supportsFileSharing(file)) {
        downloadCard(file);
        setShareStatus("Este navegador no permite compartir archivos. Guardamos la tarjeta para que la adjuntes manualmente.");
        return;
      }
      try {
        await navigator.share({ files: [file], title: "RescueTwin AI — Plan familiar" });
        setShareStatus("Se abrió el menú para compartir la tarjeta. Elige una aplicación disponible.");
      } catch (error) {
        if (!(error instanceof Error && error.name === "AbortError")) {
          setShareStatus("No se pudo compartir la tarjeta. Puedes descargarla e intentarlo desde otra aplicación.");
        }
      }
    } catch (error) {
      setShareStatus(error instanceof Error ? error.message : "No fue posible generar la tarjeta.");
    } finally {
      setIsSharing(false);
    }
  }

  function onSaveCard() {
    try {
      downloadCard(makeStoryCard(plan, scenario));
      setShareStatus("Tarjeta PNG guardada. Puedes enviarla o publicarla en una historia o estado.");
    } catch (error) {
      setShareStatus(error instanceof Error ? error.message : "No se pudo guardar la tarjeta.");
    }
  }

  return (
    <section className="min-w-0 space-y-5 rounded-2xl border border-white/10 bg-[#303834] p-4 text-[#EAE5DA] sm:p-6" aria-label="Plan familiar generado">
      <div>
        <p className="mb-2 text-xs uppercase tracking-widest text-[#BAF274]">Preparación personalizada</p>
        <h2 className="text-2xl font-semibold">{plan.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-[#B8C5BB]">{plan.summary}</p>
      </div>
      {[
        { title: "Antes del evento", items: plan.before },
        { title: "Durante el evento", items: plan.during },
        { title: "Kit familiar", items: plan.kit },
      ].map((section) => (
        <div key={section.title} className="rounded-xl border border-white/10 bg-[#171C1B] p-4">
          <h3 className="mb-3 font-semibold text-[#BAF274]">{section.title}</h3>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
            {section.items.map((item, index) => <li key={`${section.title}-${index}`}>{item}</li>)}
          </ul>
        </div>
      ))}
      <div>
        <h3 className="mb-2 font-semibold">Fuentes de referencia</h3>
        {plan.sources.filter((source) => { try { return new URL(source.url).protocol === "https:"; } catch { return false; } }).map((source, index) => (
          <a key={index} href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 break-words py-2 text-sm text-[#BAF274] underline underline-offset-2">
            <ExternalLink size={14} className="shrink-0" /> {source.title}
          </a>
        ))}
      </div>
      <p className="rounded-xl border border-[#F38B56]/30 bg-[#F38B56]/10 p-4 text-xs leading-relaxed text-[#FFD3B8]">
        {plan.disclaimer}
      </p>
      {!shared && (
        <div className="space-y-3 border-t border-white/10 pt-5">
          <div>
            <h3 className="text-base font-semibold">Comparte tu plan</h3>
            <p className="mt-1 text-xs leading-relaxed text-[#B8C5BB]">
              Copia el mensaje completo o comparte una tarjeta PNG. No se envían nombres ni ubicaciones personales.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button type="button" onClick={onCopyMessage} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#BAF274]/35 bg-[#BAF274]/10 px-3 py-3 text-sm font-medium text-[#D8F8AF] hover:bg-[#BAF274]/20"><Copy size={17} /> Copiar mensaje</button>
            <button type="button" onClick={onWhatsApp} disabled={isSharing} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#BAF274] px-3 py-3 text-sm font-semibold text-[#171C1B] hover:bg-[#D5FFA5] disabled:opacity-50"><MessageCircle size={17} /> Enviar tarjeta por WhatsApp</button>
            <button type="button" onClick={onNativeShare} disabled={isSharing} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-3 py-3 text-sm hover:bg-white/10"><Share2 size={17} /> Compartir desde dispositivo</button>
            <button type="button" onClick={onSaveCard} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-3 py-3 text-sm hover:bg-white/10"><Download size={17} /> Guardar tarjeta PNG</button>
          </div>
          {shareStatus && <p role="status" className="flex items-start gap-2 rounded-xl bg-[#171C1B] p-3 text-xs leading-relaxed text-[#D8F8AF]"><Check size={16} className="shrink-0" /> {shareStatus}</p>}
          <p className="text-[11px] leading-relaxed text-[#B8C5BB]">Las opciones para enviar imágenes o publicarlas como estado dependen del dispositivo y de las aplicaciones instaladas. Si no están disponibles, guarda la tarjeta y adjúntala manualmente.</p>
        </div>
      )}
    </section>
  );
}
