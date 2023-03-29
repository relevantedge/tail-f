import { TrackerEvent } from "./TrackerEvent";

/**
 * The event that indicates whether a user has opted in to non-essential tracking used for purposes beyond non-personal, aggregated statistics or the storage of this consent itself.
 *
 * This event has a significant effect throughout the system since the lack of consent to non-essential tracking will prevent all non-essential cookies to ever reach the user's device.
 *
 * Backends are required to respect this consent, yet IT IS NOT THE RESPONSIBILITY OF TAIL-F.JS TO ENFORCE IT since it has no way to know the domain context of the data they store.
 *
 * The user's decision is stored in an essential cookie and updated accordingly to this event. Sending the event with nonEssentialTracking false revokes the consent if already given.
 *
 * Consents to email marketing, external advertising and the like must be handled by other mechanisms than tracking events.
 *
 * Also, "consent event" rhymes.
 */
export interface ConsentEvent extends TrackerEvent<"CONSENT"> {
  /**
   * Whether the user has consented to non-essential tracking.
   */
  nonEssentialTracking: boolean;
}

export const isConsentEvent = (ev: TrackerEvent): ev is ConsentEvent =>
  ev.type === "CONSENT";
