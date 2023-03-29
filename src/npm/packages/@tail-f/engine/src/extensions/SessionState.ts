import { SessionStartEvent, validateEvent } from "@tail-f/types";
import { randomBytes } from "crypto";
import { TrackerExtension } from "../TrackerExtension";

const uuid = () => randomBytes(16).toString("hex");

export const SessionState: TrackerExtension = {
  name: "device",

  async update(event, tracker) {
    const deviceId = tracker.cookies.update<string>(
      "device",
      (current) => current ?? uuid(),
      { type: "identifier", essential: true }
    );

    const now = Date.now();
    let sessionId: string;
    let newSession = false;
    tracker.cookies.update<string>(
      "session",
      (current) => {
        const parts = current ? current.split("|") : [];

        if (!parts[0] || now - +parts[1] > 20 * 60 * 1000) {
          parts[0] = uuid();
          newSession = true;
        }
        parts[1] = "" + now;
        sessionId = parts[0];
        return parts.join("|");
      },
      { type: "session", essential: true }
    );

    event.session = {
      deviceId,
      sessionId: sessionId!,
    };

    if (newSession) {
      return [
        event,
        validateEvent<SessionStartEvent>({
          type: "SESSION_START",
          sessionId: sessionId!,
          deviceId: deviceId!,
        }),
      ];
    }
  },
};
