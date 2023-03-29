import type { Position, TrackerEvent } from "..";

export interface ComponentClickEvent extends TrackerEvent<"COMPONENT_CLICK"> {
  /** The position on the page where the user clicked. */
  pos: Position;

  /** The textual content of the element that was clicked (e.g. label on a button) */
  content?: string;
}

export const isComponentClickEvent = (
  ev: TrackerEvent
): ev is ComponentClickEvent => ev.type === "COMPONENT_CLICK";
