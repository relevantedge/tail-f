import type { TrackerEvent } from "..";

export interface ComponentViewEvent extends TrackerEvent<"COMPONENT_VIEW"> {}

export const isComponentViewEvent = (
  ev: TrackerEvent
): ev is ComponentViewEvent => ev.type === "COMPONENT_VIEW";
