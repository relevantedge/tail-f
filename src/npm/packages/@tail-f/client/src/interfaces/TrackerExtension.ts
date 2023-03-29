import { TrackerEvent } from "@tail-f/types";
import { TrackerCommand, Tracker } from "..";

export type TrackerExtension = {
  /**
   * Optionally adds extra properties to events before they are posted.
   * If this returns false the event is skipped, and extensions after this one will not see the event.
   */
  decorate?(eventData: TrackerEvent): void | boolean;

  /**
   * Optionally implements custom logic in response to a command.
   * Returning `true` indcates that the extension handled the command.
   *
   * If no extensions processed the command, an error occurs.
   */
  processCommand?(command: TrackerCommand): boolean;
};

export type TrackerExtensionFactory = {
  readonly id: string;
  setup(tracker: Tracker): TrackerExtension | void;
};
