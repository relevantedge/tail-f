import type { TrackerCommand } from "..";

/**
 * Causes all queued events to be posted to the server immediately.
 */
export type FlushCommand = "flush" | boolean;
export const isFlushCommand = (
  command: TrackerCommand
): command is FlushCommand =>
  typeof command === "boolean" || command === "flush";
