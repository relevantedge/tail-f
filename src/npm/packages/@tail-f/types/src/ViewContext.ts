import type { Duration, LocalID, UUID } from ".";

export interface ViewContext {
  /**
   * The ID of the {@link ViewEvent} where the event was triggered.
   */
  id: LocalID;

  duration?: {
    /**
     * The time the user has been active in the view. Interactive time is measured as the time where the user is actively scrolling, typing or similar.
     * Specifically defined as [transient activation](https://developer.mozilla.org/en-US/docs/Glossary/Transient_activation) with a timeout of 20 seconds.
     */
    interactive: Duration;

    /**
     * The time the view has been visible.
     */
    visible: Duration;

    /**
     * The time elapsed since the view was opened.
     */
    total: Duration;

    /**
     * The number of times the user toggled away from the view and back.
     */
    activations: number;
  };
}
