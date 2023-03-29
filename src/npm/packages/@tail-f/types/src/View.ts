import type { ExternalReference } from ".";

export interface View extends ExternalReference {
  language?: string;
  version?: string;
  params?: Record<string, string>;
}
