import { TrackerEvent } from "./events";

export type UUID = string;
/**
 * An ID that is unique to the current client.
 */
export type LocalID = number;
export type Timestamp = number;
export type Duration = number;
export type Count = number;

export interface Parameters extends Record<string, string | number | boolean> {}

export interface ExternalReference {
  /**
   * The ID as defined by some external source, e.g. CMS.
   */
  id: string;

  /**
   *   Optionally the name of the item at the time an event was recorded.
   *   Ideally, backends should not rely on this path but rather look it up by the ID from the source system to handle renames etc.
   */
  name?: string;

  /**
   *   Optionally the path of the item at the time an event was recorded.
   *   Ideally, backends should not rely on this path but rather look it up by the ID from the source system to handle renames etc.
   */

  path?: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface Rectangle extends Position {
  w: number;
  h: number;
}

/**
 *  No-op function to validate event types in TypeScript. Because function parameters are contravariant, passing an event that does not match on all properties will get red wiggly lines)
 *
 */
export const validateEvent = <T extends TrackerEvent>(event: T) => event;
