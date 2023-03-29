import { TrackerEvent } from "./TrackerEvent";

/** The event that is triggered when a page scroll to a specific section based on an anchor in the URL (e.g. /page#section-3) */
export interface AnchorEvent extends TrackerEvent<"ANCHOR"> {
  /** The name of the anchor. */
  anchor: string;
}

export const isAnchorEvent = (ev: TrackerEvent): ev is AnchorEvent =>
  ev.type === "Anchor";
