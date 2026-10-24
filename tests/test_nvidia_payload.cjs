"use strict";
// Contract test without internet, no NVIDIA API key. Compiled JS from tsc -p.
const assert = require("node:assert/strict");
const { generatePlan, DEFAULT_NVIDIA_MODEL, PLAN_JSON_SCHEMA } = require("../.role3-test-build/lib/ai.js");
const req = { scenario:"blocked", scenarioSummary:"Bloqueo hipotético de la vía principal en Catacaos", routeAvailable:true, family:{ adults:2, children:1, olderAdults:1, reducedMobility:false, pets:false } };
const expected = {title:"Plan preventivo familiar de Catacaos",summary:"Organizar roles y verificar la información oficial antes de decidir acciones.",before:["Asignar responsabilidades entre adultos y preparar contactos.","Conocer el plan oficial de emergencia de las autoridades."],during:["Mantenerse lejos de áreas inundadas y seguir alertas oficiales.","Acompañar a niños y adultos mayores durante una emergencia."],kit:["Agua potable y alimentos no perecederos.","Linterna y baterías de repuesto.","Documentos personales protegidos contra el agua."]};
let checks=0;
const check=(x,m)=>{assert.ok(x,m);checks++};
(async()=>{
  const old=Object.fromEntries(["RESCUETWIN_LLM_API_KEY","NVIDIA_API_KEY","RESCUETWIN_LLM_MODEL","RESCUETWIN_LLM_BASE_URL","RESCUETWIN_LLM_JSON_MODE"].map(k=>[k,process.env[k]]));
  delete process.env.NVIDIA_API_KEY;
  process.env.RESCUETWIN_LLM_API_KEY="TEST_ONLY_NOT_REAL";
  delete process.env.RESCUETWIN_LLM_MODEL;
  delete process.env.RESCUETWIN_LLM_BASE_URL;
  delete process.env.RESCUETWIN_LLM_JSON_MODE;
  try {
    let calls=0, firstBody;
    const fetchMock=async(url, opts)=>{
      calls++;
      check(url==="https://integrate.api.nvidia.com/v1/chat/completions","NVIDIA endpoint");
      check(opts.headers.Authorization==="Bearer TEST_ONLY_NOT_REAL","Bearer used privately");
      const body=JSON.parse(opts.body); if(!firstBody)firstBody=body;
      return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(expected)}}]}), {status:200});
    };
    const got=await generatePlan(req,fetchMock);
    check(calls===1,"one request on valid output");
    check(DEFAULT_NVIDIA_MODEL==="nvidia/nemotron-3.5-super-vl-120b-a12b","default model id");
    check(firstBody.model===DEFAULT_NVIDIA_MODEL,"selected model used");
    check(firstBody.stream===false,"non-streamed JSON");
    check(firstBody.chat_template_kwargs.enable_thinking===false,"thinking disabled for deterministic structured output");
    check(firstBody.max_tokens===3072,"output cap");
    check(firstBody.response_format.type==="json_schema","schema mode on by default");
    check(firstBody.response_format.json_schema.schema.properties.title.type==="string","schema structure");
    check(PLAN_JSON_SCHEMA.required.length===5,"all five generated keys required");
    check(Object.keys(got).sort().join()==="before,disclaimer,during,kit,sources,summary,title","unchanged Rol3 public API");
    check(got.sources.length>0 && got.disclaimer.includes("hipotéticos"),"server verifies sources and disclaimer");
    check(!JSON.stringify(got).includes("TEST_ONLY_NOT_REAL"),"key never exposed");

    // On NVIDIA 422 for constrained JSON, retry prompt-only without changing the external contract.
    let bodies=[];
    const schemaFallback=async(_url,opts)=>{
      const body=JSON.parse(opts.body); bodies.push(body);
      if(bodies.length===1) return new Response("unsupported schema",{status:422});
      return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(expected)}}]}),{status:200});
    };
    const recovered=await generatePlan(req,schemaFallback);
    check(bodies.length===2,"exactly one retry on unsupported schema");
    check(Boolean(bodies[0].response_format) && !bodies[1].response_format,"fallback removes schema constraint only");
    check(Boolean(recovered.title),"fallback validated and returned structured plan");

    process.env.RESCUETWIN_LLM_JSON_MODE="false";
    bodies=[];
    await generatePlan(req,async(_url,opts)=>{
      bodies.push(JSON.parse(opts.body));
      return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(expected)}}]}),{status:200});
    });
    check(!bodies[0].response_format,"schema mode may be disabled by env");
  } finally {for(const [k,v] of Object.entries(old)) v===undefined?delete process.env[k]:process.env[k]=v;}
  console.log(`OK — NVIDIA Nemotron 3.5 Super VL: ${checks} comprobaciones sobre API, payload, JSON Schema, fallback y contrato.`);
})().catch(err=>{console.error(err);process.exitCode=1});
