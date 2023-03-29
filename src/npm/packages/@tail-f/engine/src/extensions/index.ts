import { SessionState } from "./SessionState";
export * from "./EventLogger";
export * from "./EventValidator";

export const extensions = {
  session: async () => SessionState,
  location: async () => new (await import("./ClientLocation")).ClientLocation(),
};
