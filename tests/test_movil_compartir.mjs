import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Module from "node:module";
import assert from "node:assert/strict";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sharePath = path.join(root, "src/lib/share.ts");
const compiled = ts.transpileModule(fs.readFileSync(sharePath, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const module = new Module(sharePath);
module.filename = sharePath;
module.paths = Module._nodeModulePaths(path.dirname(sharePath));
module._compile(compiled, sharePath);

const plan = {
  title: "Plan familiar",
  summary: "Preparación antes de las lluvias",
  before: ["Guardar documentos", "Organizar medicamentos", "Preparar contactos", "Revisar materiales", "Acordar tareas"],
  during: ["Seguir alertas oficiales", "Evitar vías inundadas", "Mantener contacto", "Revisar información de INDECI", "Escuchar autoridades"],
  kit: ["Agua", "Linterna", "Radio", "Medicamentos", "Botiquín"],
  sources: [{ title: "INDECI", url: "https://www.gob.pe/indeci" }],
  disclaimer: "Este plan no sustituye las indicaciones oficiales.",
};
const message = module.exports.shareText(plan);
assert(message.includes("Acordar tareas"), "Debe incluir todas las recomendaciones anteriores.");
assert(message.includes("Escuchar autoridades"), "Debe incluir todas las recomendaciones durante el evento.");
assert(message.includes("Botiquín"), "Debe incluir todos los elementos del kit.");
assert(message.includes("https://www.gob.pe/indeci"), "Debe incluir fuentes verificables.");
assert(!message.includes("localhost"), "No debe compartir direcciones de desarrollo.");

const result = fs.readFileSync(path.join(root, "src/components/PlanResult.tsx"), "utf8");
assert(result.includes("Copiar mensaje"));
assert(result.includes("files: [file]"));
assert(!result.includes("encodePlanUrl"));
assert(!result.includes("window.location.origin"));
const layout = fs.readFileSync(path.join(root, "src/app/page.tsx"), "utf8");
assert(layout.includes('id="plan-familiar"'));
assert(layout.includes("sm:grid-cols-2 xl:order-2"));
assert(layout.includes("xl:grid-cols-"));
const ai = fs.readFileSync(path.join(root, "src/lib/ai.ts"), "utf8");
assert(ai.includes("Nunca escribir nombres de variables"));
const validation = fs.readFileSync(path.join(root, "src/lib/plan-validation.ts"), "utf8");
assert(validation.includes("routeavailable|originid"));
console.log("OK — diseño adaptable, mensaje completo, tarjeta compartible y lenguaje comprensible.");
