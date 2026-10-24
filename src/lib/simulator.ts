/** Stateless simulator; generated dataset bundled into Next.js at build time. */
import { DATASET } from "./generated/dataset";
import { shortestRoute } from "./graph";
import type { DemoOriginId, GraphData, Scenario, SimulationResponse, FeatureCollection, GeoLineString, RoadProperties, GeoPolygon, RiskProperties } from "../types/simulation";

const graph = DATASET as unknown as GraphData & {
  metadata: {roadsSource:string;riskSource:string;warning:string};
  roads: FeatureCollection<GeoLineString,RoadProperties>;
  riskZones: FeatureCollection<GeoPolygon,RiskProperties>;
  scenarios: Record<Scenario,{blockedRoadIds:string[];description:string}>;
};
const HOMES:ReadonlySet<string> = new Set(["home_01","home_02","home_03"]);
export const DEMO_ORIGINS: DemoOriginId[] = ["home_01","home_02","home_03"];

export function isDemoOrigin(value:string):value is DemoOriginId{return HOMES.has(value);}
export function isScenario(value:string):value is Scenario{return value==="normal"||value==="blocked";}
export function simulate(scenario:Scenario, originId:DemoOriginId):SimulationResponse {
  if(!isScenario(scenario))throw new Error("INVALID_SCENARIO");
  if(!isDemoOrigin(originId))throw new Error("INVALID_ORIGIN");
  const originNode=graph.placeNodeIds[originId];
  const meetingNode=graph.placeNodeIds.meeting_01;
  if(!originNode||!meetingNode)throw new Error("DATASET_INCOMPLETE");
  const blockedRoadIds = [...graph.scenarios[scenario].blockedRoadIds];
  const calculated = shortestRoute(graph, originNode, meetingNode, new Set(blockedRoadIds));
  const warning=graph.metadata.warning + (calculated ? "" : " No existe ruta conectada en este escenario modelado.");
  return {
    scenario,originId,destinationId:"meeting_01",
    roads:graph.roads,
    riskZones:scenario==="blocked"?graph.riskZones:{type:"FeatureCollection",features:[]},
    blockedRoadIds,
    route:calculated?{
      type:"Feature",properties:{kind:"route",scenario},
      geometry:{type:"LineString",coordinates:calculated.coordinates}
    }:null,
    routeDistanceM:calculated?.lengthM ?? null,
    warning,
    provenance:{roads:graph.metadata.roadsSource,riskZones:graph.metadata.riskSource}
  };
}
/** Exported for tests; returns road IDs rather than just a visual line. */
export function debugRoute(scenario:Scenario,originId:DemoOriginId){
  return shortestRoute(graph,graph.placeNodeIds[originId],graph.placeNodeIds.meeting_01,
    new Set(graph.scenarios[scenario].blockedRoadIds));
}
export function getDemoGraph():GraphData{return graph;}
