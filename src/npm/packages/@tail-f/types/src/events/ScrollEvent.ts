import type { Position, TrackerEvent } from "..";

export interface ScrollEvent extends TrackerEvent<"SCROLL"> {
  offset: Position;

  /**
   * @default other
   */
  scrollType?: "fold" | "article-end" | "view-end" | "other";
}

export const isScrollEvent = (ev: TrackerEvent): ev is ScrollEvent =>
  ev.type === "SCROLL";
