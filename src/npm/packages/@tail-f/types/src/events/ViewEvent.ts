import type {
  Domain,
  LocalID,
  Parameters,
  Personalization,
  TrackerEvent,
  View,
} from "..";

export interface ViewEvent extends TrackerEvent<"VIEW"> {
  /**
   * The external definition of the content that was rendered.
   */
  definition?: View | null;

  /**
   * The ID of the view event that is referenced by {@link ViewContext}.
   */
  id: LocalID;

  /**
   * The tab where the view was shown.
   */
  tab: LocalID;

  /**
   * The fully qualified URL as shown in the address line of the browser.
   */
  href: string;

  /**
   * The hash part of the URL (/about-us#address).
   */
  hash?: string;

  /**
   * The path portion of the URL.
   */
  path: string;

  /**
   * The query string parameters in the URL, e.g. utm_campaign.
   * Each parameter can have multiple values, for example If the parameter is specified more than once.
   * If the parameter is only specified once pipes, semicolons and commas are assumed to separate values (in that order).
   * A parameter without a value will get recorded as an empty string.
   * @example The URL https://www.foo.com/?utm_source=bar&utm_campaign=campaign1,campaign2&flag&gclid=123xyz&p1=a&p1=b&p2=a;b,c;d has these parameters:
   *  utm_source = ["bar"] \
   *  utm_campaign = ["campaign1", "campaign2"] \
   *  gclid = ["123xyz"] \
   *  flag = [""] \
   *  gclid=["123xyz"] \
   *  p1=["a", "b"] \
   *  p2=["a", "b,c", "d"]
   */
  query?: { source: Record<string, string>; parsed: Record<string, string[]> };

  /**
   * The domain part of the href.
   */
  domain: Domain;

  /**
   * Indicates that this was the first view in the user's session. (Prevalent definition of a "landing page" in web analytics).
   * This is kept as a convenience, yet technically redundant since it follows from timestamps and context.
   * @default false
   */
  firstInSession?: boolean;

  /**
   * Indicates that no other tabs were open when the view happened.
   * This flag allows a backend to extend the definition of a session that can last indefinitely but still restart after inactivity.
   * By measuring the time between a view with this flag and the previous event from the same device, it is possible to see for how long the device has been away from the site.
   * @default false
   */
  firstTab?: boolean;

  /**
   * The 0-indexed view number in the current tab.
   * This is kept as a convenience, yet technically redundant since it follows from timestamps and context.
   * @default 0
   */
  tabIndex?: number;

  /**
   * Any top-level personalization that in particular caused the view to be shown to the user.
   * The key should normally match the group ID of the applied personalization.
   */
  p13n?: Record<string, Personalization>;

  /**
   * Number of redirects that happened during navigation to this view.*/
  redirects?: number;

  /**
   * Navigation type.
   */
  navigationType?: "navigate" | "back_forward" | "prerender" | "reload";

  /**
   * Indicates whether the event was manually triggered through a tracker command, or happened automatically by the tracker's ability to infer navigation.
   *
   * @default "automatic"
   */
  mode?: "manual" | "automatic";

  /**
   * Additional domain-specific parameters that defines the view.
   *  *These should generally not be used, and are only kept as an escape hatch if it is not possible to carry this information in a schema bound and structured manner.
   */
  params?: Parameters;

  /**
   * External referrer. Internal referrers follows from the event's {@link TrackerEvent["relatedView"]} field.
   */
  externalReferrer?: {
    href?: string;
    domain?: Domain;
  };
}

export const isViewEvent = (ev: TrackerEvent): ev is ViewEvent =>
  ev.type === "VIEW";
