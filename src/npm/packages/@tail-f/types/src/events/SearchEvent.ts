import { ExternalReference } from "../common";
import { Personalization } from "../Personalization";
import type { TrackerEvent } from "..";

export interface SearchEvent extends TrackerEvent<"SEARCH"> {
  query?: string;
  additionalParameters?: Record<string, SearchParameter>;
  resultCount?: number;
  significantResults?: SearchResult[];
  p13n?: Record<string, Personalization>;
}

export type SearchResult = ExternalReference & {
  rank: number;
};

export type SearchParameter = ExternalReference & {
  value: string | number | boolean;
  comparison?: "lt" | "eq" | "gt";
};

export const isSearchEvent = (ev: TrackerEvent): ev is SearchEvent =>
  ev.type === "SEARCH";
