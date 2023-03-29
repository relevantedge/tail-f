import type { Tracker } from "..";
export * from "../lib/config";
export * from "../commands";
export * from "../interfaces";
export * from "./attachTracker";
export { Tracker };

declare global {
  const tail: Tracker;
}
