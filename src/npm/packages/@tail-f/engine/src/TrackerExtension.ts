import type { TrackerEvent } from "@tail-f/types";
import type { EngineHost, Tracker, ValidationError } from ".";

export type ClientScript =
  | {
      src: string;
      defer?: boolean;
    }
  | {
      inline: string;
      reorder?: boolean;
    };

export interface TrackerExtension {
  readonly name: string;

  initialize?(host: EngineHost): Promise<void>;

  apply?(tracker: Tracker, host: EngineHost): Promise<void>;

  update?(
    event: TrackerEvent,
    tracker: Tracker
  ): Promise<ValidationError | TrackerEvent[] | void>;

  post?(
    events: TrackerEvent[],
    tracker: Tracker,
    host: EngineHost
  ): Promise<void>;

  getClientScripts?(
    tracker: Tracker,
    host: EngineHost
  ): Promise<ClientScript[]>;
}
