import { TrackerEvent } from "./TrackerEvent";

/**
 * An event that a client may send regularly to indicate that it is online.
 */
export interface HeartBeatEvent extends TrackerEvent<"HEART_BEAT"> {}

export const isHeartBeatEvent = (ev: TrackerEvent): ev is HeartBeatEvent =>
  ev.type === "HEART_BEAT";
