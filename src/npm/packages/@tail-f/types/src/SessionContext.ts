import type { UUID } from ".";

export interface SessionContext {
  /**
   * The unique ID of the user's session.
   * A new sessions restarts after 20 minutes of inactivity.
   */
  sessionId: UUID;

  /**
   * A unique ID that identifies the user's device (browser) over time as good as possible.
   * This may be reset for a multitude of reasons, most commonly if the user clears the browser cache.
   */
  deviceId: UUID;

  /**
   * A domain specific ID that uniquely identifies the user across devices.
   */
  userId?: string;
}
