import { Duration, User, UUID } from ".";

export interface Session {
  /**
   * The unique ID of the user's session. A new sessions restarts after 20 minutes of inactivity.
   * For domain specific session semantics related to user logins, use the {@link User["userId"]} on the individual events.
   */
  sessionId: UUID;

  /**
   * The globally unique ID of the user's device. This ID does most likely not identifiy the device reliably over time, since it may be reset if the user purges tracking data, e.g. clears cookies.
   * This ID is set server-side based on an HttpOnly to maximize the chance that it sticks.
   */
  deviceId?: UUID;

  /**
   * Any additional information that may *consensually* increase the reliability of identifying the user and/or device over time.
   * Using traces can conceptually be thought of as "fingerprinting", but not really. Conventional third-party fingerprinting has a detrimental effect on privacy, these traces are for opt-in first-party usage only.
   */
  traces?: string[];

  /**
   * The time elapsed since the last session ended.
   */
  timeSincePreviousSession?: Duration;
}
