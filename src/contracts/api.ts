/** RescueTwin AI — SYNAPSE. Contrato congelado v1.0.1.
 * Ubicar en src/contracts/api.ts dentro del proyecto Next.js.
 * Fuente de verdad detallada: docs/api-contracts.md.
 */
export type Scenario = "normal" | "blocked";
export type Coordinates = [longitude: number, latitude: number];

export interface GeoLineString {
  type: "LineString";
  coordinates: Coordinates[];
}
export interface GeoPolygon {
  type: "Polygon";
  coordinates: Coordinates[][];
}
export interface GeoFeature<G, P> {
  type: "Feature";
  geometry: G;
  properties: P;
  id?: string | number;
}
export interface GeoFeatureCollection<G, P> {
  type: "FeatureCollection";
  features: Array<GeoFeature<G, P>>;
}

export interface RoadProperties {
  roadId: string;
  lengthM: number;
  simulated: boolean;
  [extra: string]: unknown;
}
export interface RiskProperties {
  riskLevel: "low" | "medium" | "high";
  sourceType: "official" | "illustrative";
  label: string;
  [extra: string]: unknown;
}
export interface RouteProperties {
  kind: "route";
  scenario: Scenario;
  [extra: string]: unknown;
}
export interface SimulationResponse {
  scenario: Scenario;
  originId: "home_01" | "home_02" | "home_03";
  destinationId: "meeting_01";
  roads: GeoFeatureCollection<GeoLineString, RoadProperties>;
  riskZones: GeoFeatureCollection<GeoPolygon, RiskProperties>;
  blockedRoadIds: string[];
  route: GeoFeature<GeoLineString, RouteProperties> | null;
  routeDistanceM: number | null;
  warning: string;
  provenance: { roads: string; riskZones: string };
}

export interface FamilyProfile {
  /** Personas de 18 a 59 años. */
  adults: number;
  /** Personas menores de 18 años. */
  children: number;
  /** Personas de 60 o más años. */
  olderAdults: number;
  reducedMobility: boolean;
  pets: boolean;
}
export interface PlanRequest {
  scenario: Scenario;
  scenarioSummary: string;
  /** Derivar de SimulationResponse.route !== null; NO implica ruta segura. */
  routeAvailable: boolean;
  family: FamilyProfile;
}
export interface OfficialSource {
  title: string;
  url: string;
}
export interface PlanResponse {
  title: string;
  summary: string;
  before: string[];
  during: string[];
  kit: string[];
  sources: OfficialSource[];
  disclaimer: string;
}
export interface PublicPlanSnapshot extends PlanResponse {
  v: 1;
  scenario: Scenario;
}
export interface ApiErrorResponse {
  error: {
    code:
      | "INVALID_SCENARIO"
      | "INVALID_ORIGIN"
      | "SIMULATION_ERROR"
      | "INVALID_REQUEST"
      | "AI_UNAVAILABLE"
      | "INTERNAL_ERROR";
    message: string;
  };
}
export const SIMULATION_ENDPOINT = "/api/simulate";
export const PLAN_ENDPOINT = "/api/plan";
export const SHARED_PLAN_PATH = "/shared";
