import type { ExternalReference } from "./common";

export interface Personalization {
  /**
   * The identifier for the set of variants if applicable to this kind of personalization.
   */
  set?: ExternalReference;

  /**
   * The variant selected for the user if applicable to this kind of personalization.
   */
  variant?: ExternalReference;

  /**
   * Indicates whether no personalization took place. Defaults to true if no variant is specified; false otherwise.
   */
  default?: boolean;

  /**
   * The variant that would have been otherwise shown had testing or similar not decided to put the user in the control group.
   */
  supressedVariant?: ExternalReference;

  /**
   * All variants that could have been chosen for user if applicable to this kind of personalization. \
   */
  eligibleVariants?: ExternalReference[];

  /**
   * Optionally the test that was involved in selecting the variant for the user.
   */
  test?: ExternalReference;

  /**
   * The algorithm used to select the variant for the user when applicable to this kind of personalization.
   */
  algorithm?: ExternalReference;

  /**
   * The algorithmic decisions summarized in a way that supports insights and evaluation of its efficiency.
   */
  decisions?: AlgorithmicDecision[];

  /**
   * The criteria used to select the variant for the user if applicable to this kind of personalization.
   */
  evaluatedCriteria?: PersonalizationCriterion[];
}

export type AlgorithmicDecision = ExternalReference & {
  value?: String;
};

export type PersonalizationCriterion = ExternalReference & {
  /**
   * @default true
   */
  matched?: boolean;

  /**
   * The user's value evaluated against the criterion.
   */
  matchedValue: string;
};
