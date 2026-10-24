/** RescueTwin AI — geo module types conforming to SYNAPSE api-contracts v1.0.1 */
export type Scenario = "normal" | "blocked";
export type DemoOriginId = "home_01" | "home_02" | "home_03";
export type Coordinates = [longitude: number, latitude: number];
export interface FeatureCollection<G, P> {
  type: "FeatureCollection";
  features: Array<{ type: "Feature"; properties: P; geometry: G }>;
}
export interface GeoLineString { type: "LineString"; coordinates: Coordinates[] }
export interface GeoPolygon { type: "Polygon"; coordinates: Coordinates[][] }
export interface RoadProperties {
  roadId: string; lengthM: number; simulated: boolean; name?: string;
}
export interface RiskProperties {
  riskLevel: "low" | "medium" | "high";
  sourceType: "illustrative" | "official";
  label: string;
}
export interface RouteProperties { kind: "route"; scenario: Scenario }
export interface SimulationResponse {
  scenario: Scenario;
  originId: DemoOriginId;
  destinationId: "meeting_01";
  roads: FeatureCollection<GeoLineString, RoadProperties>;
  riskZones: FeatureCollection<GeoPolygon, RiskProperties>;
  blockedRoadIds: string[];
  route: { type: "Feature"; properties: RouteProperties; geometry: GeoLineString } | null;
  routeDistanceM: number | null;
  warning: string;
  provenance: { roads: string; riskZones: string };
}
export interface RoadSegment {
  roadId: string;
  a: string;
  b: string;
  lengthM: number;
  coordinates: Coordinates[];
  name: string;
  highway?: string;
}
export interface GraphData {
  nodes: Record<string, Coordinates>;
  edges: RoadSegment[];
  placeNodeIds: Record<DemoOriginId | "meeting_01", string>;
}
export interface RouteCalculation {
  coordinates: Coordinates[];
  lengthM: number;
  roadIds: string[];
}
