import { TrackerEvent } from "@tail-f/types";
import { EngineHost } from "../EngineHost";
import { Tracker } from "../Tracker";
import { TrackerExtension } from "../TrackerExtension";

export class EventLogger implements TrackerExtension {
  public readonly name = "event-logger";

  constructor(public readonly group: string) {}

  async post(
    events: TrackerEvent<string>[],
    tracker: Tracker,
    host: EngineHost
  ): Promise<void> {
    for (const ev of events) {
      await host.log({
        group: this.group,
        level: "info",
        source: this.name,
        data: ev,
      });
    }
  }
}
