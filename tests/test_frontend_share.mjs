/** Prueba sin navegador de codificación/validación de enlaces. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Module from 'node:module';
import assert from 'node:assert/strict';
import ts from 'typescript';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sourceFile = path.resolve(__dirname, '../src/lib/share.ts');
const raw = fs.readFileSync(sourceFile, 'utf8');
const js = ts.transpileModule(raw, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
const m = new Module(sourceFile);
m.filename = sourceFile;
m.paths = Module._nodeModulePaths(path.dirname(sourceFile));
m._compile(js, sourceFile);
const { encodePlanUrl, decodePlanHash, makePublicSnapshot, shareText } = m.exports;
const plan = {
  title: 'Preparación para inundaciones',
  summary: 'La familia prepara documentos y suministros sin asumir rutas oficiales.',
  before: ['Elaborar un plan familiar', 'Organizar documentos', 'Preparar contactos'],
  during: ['Seguir indicaciones de autoridades', 'Evitar zonas con agua'],
  kit: ['Agua', 'Medicinas', 'Linterna'],
  sources: [{title:'Referencia oficial',url:'https://www.gob.pe/indeci'}, {title:'Potencialmente malicioso',url:'javascript:alert(1)'}],
  disclaimer: 'Simulación educativa, no ruta oficial de evacuación.'
};
let count = 0;
function check(condition, message) { assert.ok(condition, message); count++; }
const snapshot = makePublicSnapshot(plan, 'blocked');
check(snapshot.scenario === 'blocked' && snapshot.v === 1, 'escenario/version');
check(!('family' in snapshot), 'sin datos familiares');
check(snapshot.sources.length === 1, 'solo https');
const url = encodePlanUrl(plan, 'blocked', 'https://rescuetwin.example');
check(typeof url === 'string' && url.length <= 3500, 'URL dentro del límite');
check(url.includes('/shared#plan=v1.'), 'ruta del contrato');
const decoded = decodePlanHash(new URL(url).hash);
check(decoded?.title === plan.title, 'roundtrip');
check(decoded?.scenario === 'blocked', 'escenario compartido');
check(decodePlanHash('#plan=v1.%%%%') === null, 'rechazo token corrupto');
check(decodePlanHash('#plan=v2.xxx') === null, 'rechazo versión no soportada');
check(decodePlanHash('#plan=v1.' + 'x'.repeat(4000)) === null, 'rechazo token demasiado grande');
check(shareText(plan).includes('No es') || shareText(plan).includes('no es'), 'advertencia de seguridad');
const long = { ...plan, summary: 'Texto largo '.repeat(600), before: Array(6).fill('Elaborar un plan de preparación exhaustivo y documentado '.repeat(10)), during: Array(6).fill('Mantenerse informado '.repeat(8)), kit: Array(8).fill('Recursos de ejemplo '.repeat(8)) };
const longSnapshot = makePublicSnapshot(long, 'normal');
check(longSnapshot.summary.length <= 350 && longSnapshot.before.length <= 4, 'recorte seguro');
console.log(`OK — SYNAPSE Frontend: ${count} comprobaciones de compartición superadas.`);
