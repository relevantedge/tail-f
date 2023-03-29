import type { Domain, LocalID, Position, TrackerEvent } from "..";

export interface NavigationEvent extends TrackerEvent<"NAVIGATION"> {
  /**
   * The ID of the navigation event. This will be added as {@link TrackerEvent["related"]} to view event that followed after the navigation.
   */
  id: LocalID;

  /** The destination URL of the navigation */
  href: string;

  /** Indicates that the user went away from the site to an external URL. */
  exit?: boolean;

  /** The anchor specified in the href if any. */
  anchor?: string;

  /** Indicates that the navigation is to an external domain  */
  external?: boolean;

  /** The domain of the destination */
  domain?: Domain;

  /**
   * Whether the navigation happened in the current view or a new tab/window was opened.
   */
  self: boolean;

  /**
   * The position in the page where the link was clicked.
   */
  pos?: Position;

  /**
   * The textual content of the link.
   */
  content?: string;
}

export const isNavigationEvent = (ev: TrackerEvent): ev is NavigationEvent =>
  ev.type === "NAVIGATION";
