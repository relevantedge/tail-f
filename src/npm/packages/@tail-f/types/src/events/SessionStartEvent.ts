import type { TrackerEvent } from "..";

export interface SessionStartEvent extends TrackerEvent<"SESSION_START"> {
  deviceId: string;
  sessionId: string;
}

export const isSessionStartEvent = (
  ev: TrackerEvent
): ev is SessionStartEvent => ev.type === "SESSION_START";
