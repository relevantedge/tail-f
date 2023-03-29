export type TrackerConfiguration = {
  /**
   * The name of the global variable used for tracking.
   *
   * @default tail
   */
  name?: string;

  /**
   * The URL to the tracker script
   */
  src: string;

  /**
   * Optional URLs to scripts to execute while the tracker is initializing, and before any commands are processed.
   * This can be used to hook up external trackers or tracker extensions.
   *
   * @default []
   */
  scripts?: string[];

  /**
   * An optional endpoint that provides server-side contextual variables for the tracker, such as persisted identifiers, geo information etc.
   *
   * @default null
   */
  vars?: string | null;

  /**
   * The endpoint where events are posted.
   *
   * @default "?var"
   */
  hub?: string;
};
