import type { View } from "@tail-f/types";

export type ReservedVariables = {
  view: View | null;
  tags: string[];
  rendered: boolean;
  consent: boolean;
};
