import { EngineHost, EventParser, TrackerExtension } from ".";
import { AllRequired } from "./lib";

/** Gives a hint what a string might be for methods that serialize results to strings */
export type JsonString<T> = string;

export type CookieConfiguration = {
  encryptionKey: string;
  namePrefix: string;
};

export type TrackerConfiguration = RequestHandlerSettings & {
  cookies?: CookieConfiguration;
};

export type RequestHandlerSettings = {
  trackerName?: string;
  scriptPath?: string;
  endpoint: string;
  host: EngineHost;
  parser: EventParser;
  extensions: Iterable<() => Promise<TrackerExtension>>;
};

export const DEFAULT: Omit<
  AllRequired<TrackerConfiguration>,
  "parser" | "backends" | "host" | "extensions" | "endpoint" | "scriptPath"
> = {
  trackerName: "tail",
  cookies: {
    encryptionKey: "~$ tail -f ./your-key",
    namePrefix: "-f",
  },
};
