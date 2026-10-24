"use strict";
const assert = require("node:assert/strict");
const { POST } = require("../.role3-test-build/app/api/plan/route.js");
const { parsePlanRequest, parseGeneratedContent } = require("../.role3-test-build/lib/plan-validation.js");
const { chooseSources } = require("../.role3-test-build/lib/sources.js");

const valid = {
  scenario: "blocked",
  scenarioSummary: "Bloqueo hipotético de vías en Catacaos",
  routeAvailable: true,
  family: {adults:2, children:1, olderAdults:1, reducedMobility:false, pets:false}
};
const result = {
  title: "Plan familiar preventivo personalizado",
  summary: "Ante cierres hipotéticos, revisen fuentes oficiales, organicen roles y preparen el hogar con anticipación.",
  before: ["Organizar una reunión familiar y acordar medios de comunicación.", "Identificar rutas oficiales sin asumir seguridad del mapa ilustrativo."],
  during: ["Evitar zonas inundadas y seguir indicaciones oficiales.", "Priorizar la asistencia a niños y adultos mayores."],
  kit: ["Agua potable suficiente para la familia.", "Linterna con pilas de reserva.", "Documentación protegida del agua."]
};
let count = 0;
function check(ok, description) { assert.ok(ok, description); count++; }
function post(value, opts={}) {
  return POST(new Request("http://localhost:3000/api/plan", { method:"POST", headers: {"content-type":"application/json", ...(opts.headers||{})}, body:opts.raw || JSON.stringify(value)}));
}
(async()=>{
  // Validación, rechazo de extras y reglas de la familia.
  check(parsePlanRequest(valid).scenario === "blocked", "valid input");
  check(parsePlanRequest({...valid, name:"DON'T FORWARD", family:{...valid.family, name:"DATO PRIVADO"}}).family.name === undefined, "sanitize extras");
  check(chooseSources(parsePlanRequest(valid)).length >= 2, "curated sources");
  const faulty = [
    {...valid, scenario:"storm"}, {...valid, scenarioSummary:""}, {...valid, scenarioSummary:"x".repeat(281)},
    {...valid, routeAvailable:"true"}, {...valid, family:{...valid.family, adults:-1}},
    {...valid, family:{...valid.family, children:13}},
    {...valid, family:{...valid.family, olderAdults:12, children:12}},
    {...valid, family:{...valid.family, pets:"yes"}},
    {...valid, family:{...valid.family, reducedMobility:null}},
    {...valid, family:{...valid.family, adults:0,children:0,olderAdults:0}}
  ];
  for (const [i, f] of faulty.entries()) {
    const res = await post(f);
    check(res.status === 400, "invalid " + i);
    check((await res.json()).error.code === "INVALID_REQUEST", "error JSON " + i);
  }
  const malformed=await post(valid,{raw:"{invalid"});
  check(malformed.status===400,"malformed JSON");
  const notJson=await post(valid,{headers:{"content-type":"text/plain"}});
  check(notJson.status===400,"wrong content-type");
  const tooLarge=await post(valid,{raw:JSON.stringify({...valid, ignored:"y".repeat(11000)})});
  check(tooLarge.status===400,"oversized request");
  check(parseGeneratedContent(result).kit.length === 3,"valid model output");
  try {parseGeneratedContent({...result,before:[]}); throw Error("expected validation");} catch(e){check(e.name === "InvalidModelOutputError","reject invalid plan output");}
  try {parseGeneratedContent({...result,summary:"La ruta calculada es segura para salir inmediatamente."}); throw Error("expected safety validation");} catch(e){check(e.name === "InvalidModelOutputError","reject safe route assertion");}

  // Sin credenciales nunca simular éxito.
  const prevKey=process.env.RESCUETWIN_LLM_API_KEY;
  const prevNvidiaKey=process.env.NVIDIA_API_KEY;
  const prevModel=process.env.RESCUETWIN_LLM_MODEL;
  delete process.env.RESCUETWIN_LLM_API_KEY;
  delete process.env.NVIDIA_API_KEY;
  delete process.env.RESCUETWIN_LLM_MODEL;
  let res=await post(valid);
  check(res.status===503,"without key -> 503");
  check((await res.json()).error.code==="AI_UNAVAILABLE","without key -> AI_UNAVAILABLE");
  process.env.RESCUETWIN_LLM_API_KEY="FAKE_LOCAL_TEST_ONLY";
  process.env.RESCUETWIN_LLM_MODEL="model-from-fixture";
  process.env.RESCUETWIN_LLM_BASE_URL="http://localhost:9999/v1";
  const originalFetch=global.fetch;
  let interceptedCalls=0;
  let lastBody=null;
  global.fetch=async (url, options) => {
    interceptedCalls++;
    lastBody=JSON.parse(options.body);
    check(url==="http://localhost:9999/v1/chat/completions","model endpoint contract");
    check(options.headers.Authorization==="Bearer FAKE_LOCAL_TEST_ONLY","private auth only on server");
    const message=lastBody.messages[1].content;
    const isFamilyWithPets=message.includes('"pets":true');
    const mock={...result, kit:isFamilyWithPets ? [...result.kit,"Preparar agua y alimento para las mascotas."] : result.kit};
    return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(mock)}}]}), {status:200,headers:{"content-type":"application/json"}});
  };
  res=await post(valid);
  check(res.status===200,"mock provider 200");
  let body=await res.json();
  check(body.title===result.title,"contract title");
  check(Array.isArray(body.before)&&body.before.length===2,"contract before");
  check(Array.isArray(body.during)&&body.during.length===2,"contract during");
  check(Array.isArray(body.kit)&&body.kit.length===3,"contract kit");
  check(body.sources.length>=2,"sources curated");
  check(body.sources.every(x=>x.url.startsWith("https://www.gob.pe/")),"source URLs official");
  check(body.disclaimer.includes("no están verificadas"),"server disclaimer");
  check(!JSON.stringify(body).includes("FAKE_LOCAL_TEST_ONLY"),"no key leak");
  check(lastBody.messages[0].content.includes("Eres el módulo"),"system prompt");
  check(lastBody.messages[1].content.includes('"children":1'),"personalization data");
  check(res.headers.get("cache-control").includes("no-store"),"no-store");
  check(interceptedCalls===1,"real fetch call through mock");
  res=await post({...valid,family:{...valid.family,pets:true}});
  body=await res.json();
  check(body.kit.some(x=>x.includes("mascotas")),"pet customization");
  check(body.sources.some(x=>x.title.includes("inundaciones")),"pet source selection");
  // Salida inválida de LLM -> un reintento controlado y 503 (sin fallback estático).
  let calls=0;
  global.fetch=async()=>{calls++; return new Response(JSON.stringify({choices:[{message:{content:"{invalid"}}]}),{status:200});};
  res=await post(valid);
  check(res.status===503,"invalid LLM JSON -> 503");
  check(calls===2,"one retry only");
  // Clave inválida, no insistir.
  calls=0;
  global.fetch=async()=>{calls++; return new Response("error",{status:401});};
  res=await post(valid);
  check(res.status===503 && calls===1,"authentication failure no retry");
  // caída HTTP 500 -> 503; timeout/network simulated -> 503.
  global.fetch=async()=>new Response("error",{status:500});
  res=await post(valid);
  check(res.status===503,"provider error 503");
  global.fetch=async()=>{throw new Error("timeout")};
  res=await post(valid);
  check(res.status===503,"network timeout 503");
  global.fetch=originalFetch;
  if (prevKey!==undefined) process.env.RESCUETWIN_LLM_API_KEY=prevKey; else delete process.env.RESCUETWIN_LLM_API_KEY;
  if (prevNvidiaKey!==undefined) process.env.NVIDIA_API_KEY=prevNvidiaKey; else delete process.env.NVIDIA_API_KEY;
  if (prevModel!==undefined) process.env.RESCUETWIN_LLM_MODEL=prevModel; else delete process.env.RESCUETWIN_LLM_MODEL;
  console.log(`OK — SYNAPSE Rol 3: ${count} afirmaciones superadas; validación, LLM simulado por mock, API, fuentes, privacidad, seguridad y fallos.`);
  console.log("AVISO: el test utiliza un proveedor FICTICIO; falta probar generación real con una API key legítima en Next.js.");
})().catch(e=>{console.error(e);process.exitCode=1;});
