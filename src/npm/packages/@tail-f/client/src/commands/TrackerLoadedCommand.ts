import type { Tracker, TrackerCommand } from "..";

export type TrackerLoadedCommand = (tracker: Tracker) => void;
export const isTrackerLoadedCommand = (
  command: TrackerCommand
): command is (tracker: Tracker) => void => typeof command === "function";
