import type { TrackerEvent } from "@tail-f/types";
import type { Tracker, TrackerCommand } from "..";

export type ListenerArgs<T = {}> = T & {
  tracker: Tracker;
  unsubscribe: () => void;
};

export interface Listener {
  set?(key: string, value: any, args: ListenerArgs): void;
  post?(events: TrackerEvent[], args: ListenerArgs): void;
  refresh?(variables: Record<string, any>, args: ListenerArgs): void;
  /**
   * Enables the listener to apply custom logic when a command is posted to the tracker.
   *
   * If this returns `true` it means the command has been handled. If no listener handles a command that is posted to the tracker, an error occurs.
   */
  command?(command: TrackerCommand, args: ListenerArgs): void;
}
