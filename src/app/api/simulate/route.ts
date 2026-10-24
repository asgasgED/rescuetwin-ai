import { isDemoOrigin, isScenario, simulate } from "../../../lib/simulator";
function asJson(body:unknown,status=200):Response {
  return new Response(JSON.stringify(body),{
    status,
    headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}
  });
}

export async function GET(request:Request):Promise<Response>{
  const url=new URL(request.url);
  const scenario=url.searchParams.get("scenario")??"";
  const originId=url.searchParams.get("originId")??"";
  if(!isScenario(scenario)){
    return asJson({error:{code:"INVALID_SCENARIO",message:"Escenario no válido. Usa normal o blocked."}},400);
  }
  if(!isDemoOrigin(originId)){
    return asJson({error:{code:"INVALID_ORIGIN",message:"Origen no válido. Usa home_01, home_02 o home_03."}},400);
  }
  try {
    return asJson(simulate(scenario,originId));
  }catch {
    return asJson({error:{code:"SIMULATION_ERROR",message:"No se pudo generar la simulación. Intenta nuevamente."}},500);
  }
}
