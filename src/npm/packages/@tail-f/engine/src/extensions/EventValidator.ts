import { TrackerExtension } from "../TrackerExtension";

export const EventValidator: TrackerExtension = {
  name: "core-validation",
  async update(event) {
    if (event.timestamp) {
      if (event.timestamp > 0) {
        return {
          error:
            "When explicitly specified, timestamps are interpreted relative to current. As such, a positive value would indicate that the event happens in the future which is currently not supported.",
          source: event,
        };
      }
      event.timestamp = Date.now() + event.timestamp;
    } else {
      event.timestamp = Date.now();
    }
  },
};
