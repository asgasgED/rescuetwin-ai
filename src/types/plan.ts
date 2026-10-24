/** Contrato de SYNAPSE v1.0.1. No ampliar ni renombrar campos sin aprobación. */
export type Scenario = "normal" | "blocked";

export interface FamilyInput {
  adults: number;
  children: number;
  olderAdults: number;
  reducedMobility: boolean;
  pets: boolean;
}

export interface PlanRequest {
  scenario: Scenario;
  scenarioSummary: string;
  routeAvailable: boolean;
  family: FamilyInput;
}

export interface SourceCitation { title: string; url: string; }
export interface FamilyPlan {
  title: string;
  summary: string;
  before: string[];
  during: string[];
  kit: string[];
  sources: SourceCitation[];
  disclaimer: string;
}

export interface ApiErrorBody {
  error: { code: "INVALID_REQUEST" | "AI_UNAVAILABLE" | "INTERNAL_ERROR"; message: string };
}
