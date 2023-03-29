import clientScript from "@tail-f/client/script";
import { isTrackerEvent, TrackerEvent } from "@tail-f/types";
import {
  ClientScript,
  CookieMonster,
  DEFAULT,
  EngineHost,
  EventParser,
  isValidationError,
  ParseResult,
  PostError,
  RequestHandlerSettings,
  Tracker,
  TrackerExtension,
  ValidationError,
} from ".";
import { EventValidator } from "./extensions";
import { any, map, merge } from "./lib";
import { tryCompress } from "./lib/compression";
import { ValueCollection } from "./ValueCollection";

export let SCRIPT_CACHE_CONTROL: string = "private, max-age=86400";

// MUST MATCH packages\@tail-f\client\src\extensions\navigation.ts
const CONTEXT_MENU_COOKIE = "_ctxmn";

export type CallbackResponse = {
  headers?: Record<string, string[]>;
} & {
  status: number;
  content?: null | {
    type: string;
    data: string | Uint8Array;
  };
  cacheKey?: string;
  error?: Error;
};

export class RequestHandler {
  private readonly _endpoint: string;
  private readonly _extensionFactories: (() => Promise<TrackerExtension>)[];
  private readonly _parser: EventParser;
  private readonly _trackerName: string;

  private _extensions: TrackerExtension[];
  private _initialized = false;
  private _script: {
    content: Uint8Array | null | string;
    compressionCache?: Record<string, Uint8Array | null>;
  };
  private _scriptPath: string | undefined;

  public readonly host: EngineHost;

  constructor(config: RequestHandlerSettings) {
    const { trackerName, endpoint, host, parser, extensions, scriptPath } =
      merge({}, DEFAULT, config);
    this._trackerName = trackerName;
    this._endpoint = endpoint;
    this.host = host;
    this._parser = parser;
    this._extensionFactories = map(extensions);
    this._scriptPath = scriptPath;
  }

  public getClientScripts(tracker: Tracker) {
    return this._getClientScripts(tracker, true);
  }

  public async initialize() {
    if (this._initialized === (this._initialized = true)) return;

    if (this._scriptPath) {
      this._script = {
        content: await this.host.get(this._scriptPath, {
          text: true,
          changeHandler: async () => {
            this._script = {
              content: await this.host.get(this._scriptPath!, { text: true }),
            };
          },
        }),
      };
    }
    this._extensions = [
      EventValidator,
      ...(await Promise.all(
        this._extensionFactories.map(async (factory) => {
          const extension = await factory();
          extension.initialize?.(this.host);
          return extension;
        })
      )),
    ];
  }

  public async postEvents(
    tracker: Tracker,
    payload: TrackerEvent[] | string,
    { routeToClient = false }: { routeToClient?: boolean } = {}
  ): Promise<void> {
    await this.initialize();

    if (typeof payload === "string") {
      payload = JSON.parse(payload);
    }

    let parsed = this._parser.parseAndValidate(payload as any);

    const sourceIndices = new Map<{}, number>();
    parsed.forEach((item, i) => sourceIndices.set(item, i));

    for (const ext of this._extensions) {
      if (!ext.update) continue;
      const updated: ParseResult[] = [];
      for (let item of parsed) {
        if (isValidationError(item)) {
          updated.push(item);
          continue;
        }
        const result = (await ext.update(item, tracker)) ?? item;
        if (Array.isArray(result)) {
          updated.push(
            ...this._parser.validate(
              result.map((ev) => ((ev.timestamp ??= Date.now()), ev))
            )
          );
        } else {
          updated.push(result);
        }
      }
      parsed = updated;
    }

    const events: TrackerEvent[] = [];
    const validationErrors: (ValidationError & { sourceIndex?: number })[] = [];

    for (const item of parsed) {
      if (isValidationError(item)) {
        validationErrors.push({
          // The key for the source index of a validation error may be the error itself during the initial validation.
          sourceIndex:
            sourceIndices.get(item.source) ?? sourceIndices.get(item),
          source: item.source,
          error: item.error,
        });
      } else {
        events.push(item);
      }
    }

    const extensionErrors: Record<string, Error> = {};
    if (routeToClient) {
      tracker._clientEvents.push(...events);
    } else {
      await Promise.all(
        this._extensions.map(async (extension) => {
          try {
            (await extension.post?.(events, tracker, this.host)) ??
              Promise.resolve();
          } catch (e) {
            extensionErrors[extension.name] =
              e instanceof Error ? e : new Error(e?.toString());
          }
        })
      );
    }

    if (validationErrors.length || any(extensionErrors)) {
      throw new PostError(validationErrors, extensionErrors);
    }
  }

  public async processRequest({
    method,
    path,
    query,
    headers,
    payload,
    referrer,
    clientIp,
  }: {
    method: string;
    path: string;
    query: Record<string, string | string[] | undefined>;
    headers: Record<string, string | string[] | undefined>;
    payload?: string | null;
    referrer?: string;
    clientIp?: string;
  }): Promise<{
    tracker: Tracker;
    response: CallbackResponse | null;
  }> {
    await this.initialize();

    const tracker = new Tracker({
      headers,
      referrer,
      clientIp,
      requestHandler: this,
    });

    query = ValueCollection.normalize(query);

    // This cookie is used to signal that external navigation happened from the "open in new tab" context menu.
    // We do not want the server to echo this cookie.
    const contextMenuCookie = tracker.cookies.get(CONTEXT_MENU_COOKIE)?.value;
    tracker.cookies.set(CONTEXT_MENU_COOKIE, null);

    try {
      await Promise.all(
        this._extensions.map(
          (extension) =>
            extension.apply?.(tracker, this.host) ?? Promise.resolve()
        )
      );

      const result = (response: CallbackResponse | null) => {
        if (response) {
          CookieMonster.instance
            .mapResponseHeaders(tracker.cookies)
            .forEach(([key, value]) => {
              ((response.headers ??= {})[key] ??= []).push(...value);
            });
        }

        return { tracker, response };
      };

      let requestPath = path;

      if (requestPath.startsWith(this._endpoint)) {
        requestPath = requestPath.substring(this._endpoint.length);
        switch (method) {
          case "GET":
            {
              if (query["opt"]) {
                return result({
                  status: 200,
                  content: {
                    type: "application/javascript",
                    data: await this._getClientScripts(tracker, false),
                  },
                  cacheKey: "external-script",
                  headers: {
                    "cache-control": [SCRIPT_CACHE_CONTROL],
                  },
                });
              }
              if (query["mnt"]) {
                const mnt = Array.isArray(query["mnt"])
                  ? query["mnt"].join("")
                  : query["mnt"];

                // Don't write any other cookies.
                // If for any reason this redirect is considered "link decoration" or similar
                // we don't want the browser to store the rest of our cookies in a restrictive way.
                tracker.cookies.clear();
                if (contextMenuCookie) {
                  tracker.cookies.set(CONTEXT_MENU_COOKIE, {
                    type: "other",
                    http: false,
                    maxAge: 30,
                    value: "" + (+contextMenuCookie + 1),
                    sameSite: "Strict",
                  });
                }
                return result({
                  status: 301,
                  headers: {
                    location: [mnt],
                    "cache-control": ["no-cache, no-store, must-revalidate"],
                    pragma: ["no-cache"],
                    expires: ["0"],
                  },
                });
              }
              if (query["usr"]) {
                return result(
                  !tracker.headers.get("referer")
                    ? { status: 403 }
                    : {
                        status: 200,
                        content: {
                          type: "application/json",
                          data: JSON.stringify(tracker.variables.toJSON()),
                        },
                        headers: {
                          "cache-control": [
                            "no-cache, no-store, must-revalidate",
                          ],
                          pragma: ["no-cache"],
                          expires: ["0"],
                        },
                      }
                );
              }
              if (query["$types"]) {
                return result({
                  status: 200,
                  content: {
                    type: "application/json",
                    data: JSON.stringify(this._parser.events, null, 2),
                  },
                  cacheKey: "types",
                });
              }

              const [compressed, compressionType] = await tryCompress(
                (this._script ??= { content: clientScript }).content!,
                {
                  acceptEncoding: tracker.headers.get("accept-encoding") ?? [],
                  cache: (this._script.compressionCache ??= {}),
                  compress: (...args) => this.host.compress(...args),
                }
              );

              return result({
                status: 200,
                content: {
                  type: "application/javascript",
                  data: compressed,
                },
                cacheKey: "script",
                headers: {
                  "content-encoding": [compressionType],
                  "cache-control": [SCRIPT_CACHE_CONTROL],
                },
              });
            }
            break;
          case "POST": {
            if (payload == null) {
              return result({
                status: 400,
                content: { type: "text/plain", data: "No data." },
              });
            }

            try {
              await this.postEvents(tracker, payload as any);
              return result({ status: 202 });
            } catch (error) {
              if (error instanceof PostError) {
                return result({
                  status: Object.keys(error.extensions).length ? 500 : 400,
                  content: { type: "text/plain", data: error.message },
                  error,
                });
              }
              throw error;
            }
          }
        }

        return result({
          status: 400,
          content: { type: "text/plain", data: "Bad request." },
        });
      }
    } catch (ex) {
      throw ex;
    }

    return { tracker, response: null };
  }

  private async _getClientScripts(
    tracker: Tracker,
    html: boolean
  ): Promise<string> {
    await this.initialize();

    const trackerScript: string[] = [];
    const wrapTryCatch = (s: string) => `try{${s}}catch(e){console.error(e);}`;

    const config = {
      opt: html ? undefined : "?opt",
      var: "?var",
    };

    const trackerRef = this._trackerName;
    if (html) {
      trackerScript.push(`window.${trackerRef}||(${trackerRef}=[]);`);
    }

    const inlineScripts: string[] = [trackerScript.join("")];
    const otherScripts: ClientScript[] = [];

    (
      await Promise.all(
        this._extensions.map((extension) =>
          extension.getClientScripts?.(tracker, this.host)
        )
      )
    )
      .flatMap((item) => item ?? [])
      .forEach((script) => {
        if ("inline" in script) {
          // Prevent errors from pre-empting other scripts.
          script.inline = wrapTryCatch(script.inline);

          if (script.reorder !== false) {
            inlineScripts.push(script.inline);
            return;
          }
        }
        otherScripts.push(script);
      });

    const scripts: ClientScript[] = [
      { inline: inlineScripts.join("") },
      ...otherScripts,
    ];

    if (html) {
      const pendingEvents = tracker.clientEvents;
      if (pendingEvents.length) {
        scripts.push({
          inline: `${trackerRef}.push(${pendingEvents
            .map((event) =>
              typeof event === "string" ? event : JSON.stringify(event)
            )
            .join(",")});`,
        });
      }
      scripts.push({
        src: `${this._endpoint}${
          this._trackerName
            ? `#${
                this._trackerName && this._trackerName !== DEFAULT.trackerName
              }`
            : ""
        }`,
        defer: true,
      });
    }

    const js = scripts
      .map((script, i) => {
        if ("inline" in script) {
          return html ? `<script>${script.inline}</script>` : script.inline;
        } else {
          return html
            ? `<script src='${script.src}'${
                script.defer !== false ? " async" : ""
              }></script>`
            : `try{document.body.appendChild(Object.assign(document.createElement("script"),${JSON.stringify(
                { src: script.src, async: script.defer }
              )}))}catch(e){console.error(e);}`;
        }
      })
      .join("");

    return js;
  }
}
