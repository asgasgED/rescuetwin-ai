"use strict";
/** Prueba de la función real generatePlan con NVIDIA, sin necesitar Next.js.
 * Ejecutar DESPUÉS de compilar y configurar .env.local. No imprime ninguna key.
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
function loadLocalEnv(){
  const file=path.join(__dirname,"..",".env.local");
  if (!fs.existsSync(file)) return;
  for(const line of fs.readFileSync(file,"utf8").split(/\r?\n/)){
    const match=line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if(!match || process.env[match[1]]) continue;
    let value=match[2];
    if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);
    process.env[match[1]]=value;
  }
}
loadLocalEnv();
const key=process.env.NVIDIA_API_KEY || process.env.RESCUETWIN_LLM_API_KEY;
if(!key || key.includes("REEMPLAZAR") || key.includes("TU_CLAVE")){
  console.error("Falta la API key real. Copia .env.example a .env.local e introduce la clave localmente.");
  process.exit(2);
}
const root=path.join(__dirname,"..");
const compiledAi=path.join(root,".role3-test-build/lib/ai.js");
const originalAi=path.join(root,"src/lib/ai.ts");
if(!fs.existsSync(compiledAi)||fs.statSync(compiledAi).mtimeMs<fs.statSync(originalAi).mtimeMs){
  console.error("Compilación desactualizada: ejecuta powershell -ExecutionPolicy Bypass -File tests\\run_tests.ps1 antes de probar NVIDIA.");
  process.exit(2);
}
const { generatePlan }=require(compiledAi);
const request={scenario:"blocked",scenarioSummary:"Simulación educativa de bloqueo hipotético de vías en Catacaos",routeAvailable:true,family:{adults:2,children:1,olderAdults:1,reducedMobility:false,pets:false}};
(async()=>{
  console.log("Probando generación REAL de Nemotron a través del módulo de SYNAPSE...");
  const start=Date.now();
  const result=await generatePlan(request);
  const keys=["title","summary","before","during","kit","sources","disclaimer"];
  if(keys.some(k=>!(k in result)))throw Error("Respuesta incumple contrato aprobado");
  if(!Array.isArray(result.sources)||result.sources.length===0)throw Error("Sin fuentes verificadas");
  if(!Array.isArray(result.kit)||result.kit.length<3)throw Error("Kit inválido");
  console.log("OK — LLM real, contrato v1.0.1, fuentes y campos obligatorios. Tiempo: "+((Date.now()-start)/1000).toFixed(1)+" s");
  console.log("Título:",result.title);
  console.log("Resumen:",result.summary);
  console.log("Acciones antes/durante/kit:",result.before.length,result.during.length,result.kit.length);
  console.log("Advertencia servidor:",result.disclaimer);
  const root=path.join(__dirname,"..");
  const hashes={};
  for (const name of ["src/lib/ai.ts", "src/app/api/plan/route.ts", "src/lib/plan-validation.ts", "src/lib/sources.ts", "src/data/official_sources.json"]) {
    hashes[name]=crypto.createHash("sha256").update(fs.readFileSync(path.join(root,name))).digest("hex");
  }
  const dist=path.join(root,"dist"); fs.mkdirSync(dist,{recursive:true});
  fs.writeFileSync(path.join(dist,"role3_live_check.json"),JSON.stringify({
    passed:true,provider:"NVIDIA Build",model:process.env.RESCUETWIN_LLM_MODEL||"nvidia/nemotron-3.5-super-vl-120b-a12b",
    checkedAt:new Date().toISOString(), sourceHashes:hashes
  },null,2),"utf8");
  console.log("Prueba real confirmada: dist/role3_live_check.json (sin clave ni datos familiares)");
  console.log("No se ha guardado el contenido del plan ni se ha mostrado la API key.");
})().catch(err=>{console.error("ERROR en prueba REAL:",err.message);process.exitCode=1});
