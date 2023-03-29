import { EngineHost, TrackerExtension } from ".";
import { EventParser } from ".";
import { extensions as defaultExtensions } from "./extensions";
import defaultSchema from "@tail-f/types/schema";

import { RequestHandler } from "./RequestHandler";

export function bootstrap({
  host,
  scriptPath,
  endpoint,
  schema,
  extensions,
}: {
  host: EngineHost;
  endpoint: string;
  scriptPath?: string;
  schema?: ConstructorParameters<typeof EventParser>[0];
  extensions?: Iterable<TrackerExtension | (() => Promise<TrackerExtension>)>;
}): RequestHandler {
  const parser = new EventParser(schema ?? { default: defaultSchema });

  return new RequestHandler({
    host,
    parser,
    scriptPath,
    endpoint,
    extensions: extensions
      ? ([...extensions].map((extension) =>
          typeof extension === "function"
            ? extension
            : async () => extension as any
        ) as any)
      : Object.values(defaultExtensions),
  });
}
