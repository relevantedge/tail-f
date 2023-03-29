import type { TrackerEvent } from "..";

export interface UserAgentEvent extends TrackerEvent<"USER_AGENT"> {
  /**
   *  Has touch
   */
  hasTouch?: boolean;

  /**
   * User agent string
   */
  userAgent: string;

  /**
   * Language
   */
  language?: {
    primary: string;
    all?: string[];
  };

  timezone: {
    iana: string;
    offset: number;
  };

  /** Screen */
  screen?: {
    /** Device pixel ratio */
    dpr: number;
    w: number;
    h: number;

    /** Orientation.
     * @default false
     */
    landscape?: boolean;
  };
}

export const isUserAgentEvent = (ev: TrackerEvent): ev is UserAgentEvent =>
  ev.type === "USER_AGENT";
