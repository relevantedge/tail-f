import { TrackerEvent } from "./TrackerEvent";

export interface ViewEndedEvent extends TrackerEvent<"VIEW_END"> {
  bounce?: boolean;
}
