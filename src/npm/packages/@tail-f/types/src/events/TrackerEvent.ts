import type {
  ComponentContext,
  SessionContext,
  Timestamp,
  User,
  ViewContext,
  Position,
  Rectangle,
  LocalID,
} from "..";

/** @internal */
export interface TrackerEvent<Name = string> {
  type: Name;
  /**
   * The timestamp will always have a value before it reaches a backend.
   *
   * @default now.
   */
  timestamp?: Timestamp;
  session?: SessionContext;
  view?: ViewContext;
  component?: ComponentContext;
  user?: User;

  /** The event that caused this event to be triggered. For example a {@link NavigationEvent} may trigger a {@link ViewEvent} */
  related?: LocalID;

  /**
   * The size of the user's view port (e.g. browser window) when the event happened.
   * This can be used to add context to events that includes an {@link Position}
   */
  viewPort?: Rectangle;

  /**
   * Optional tags that can be used to group events.
   *
   * For interaction triggered events these will be read from HTML elements' data-tail-tags attribute and appended to any explicitly specified tags in the event.
   *
   * Tags in HTML attributes are separated by comma. If comma is part of the tag, it must be escaped with a backslash like `\,`.
   */
  tags?: string[];
}

export const isTrackerEvent = (ev: any): ev is TrackerEvent =>
  ev && typeof ev.type === "string";
