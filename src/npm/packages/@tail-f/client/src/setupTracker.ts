import type { TrackerEvent } from "@tail-f/types";
import { isTrackerEvent } from "@tail-f/types";
import type {
  Listener,
  Tracker,
  TrackerCommand,
  TrackerConfiguration,
  TrackerExtension,
} from ".";

import {
  isConfigCommand,
  isExtensionCommand,
  isFlushCommand,
  isGetCommand,
  isListenerCommand,
  isRefreshCommand,
  isSetCommand,
  isTrackerLoadedCommand,
} from ".";

import {
  any,
  array,
  define,
  document,
  entries,
  err,
  ERR_BUFFER_OVERFLOW,
  ERR_CONFIG_LOCKED,
  ERR_INTERNAL_ERROR,
  ERR_INVALID_COMMAND,
  ERR_POST_FAILED,
  F,
  filter,
  flatMap,
  getOrSet,
  listen,
  map,
  mapUrl,
  nil,
  now,
  push,
  sort,
  splice,
  stringify,
  T,
  timeout,
  TRACKER_NAME,
  tryCatch,
  tryUse,
  use,
  variables,
  window,
  config as defaultConfig,
} from "./lib";

const dependencies = Symbol();
export const addDependency = <T extends TrackerEventCommand>(
  command: T,
  dependency: TrackerEvent
): T => (
  command !== dependency &&
    ((command[dependencies] ??= []).push(dependency) as any),
  command
);

export interface TrackerEventCommand extends TrackerEvent, Record<string, any> {
  [dependencies]?: TrackerEvent[];
}

export let tracker: Tracker;
export const setupTracker = (init: TrackerCommand[] = []): Tracker => {
  if (tracker) return tracker;

  let configurationLocked = F;
  const config: Required<Omit<TrackerConfiguration, "name" | "src">> =
    defaultConfig;

  const extensions: [number, TrackerExtension][] = [];
  let listeners: Listener[] = [];
  let initializing = T;

  const throttle = timeout();

  const queue: TrackerEvent[] = [];
  const vars = variables();

  // #region Local functions
  const callListeners = (event: string, ...args: any[]) => {
    listeners = filter(
      listeners,
      (listener) =>
        !!tryCatch(() =>
          use(
            T,
            (keep) => (
              listener[event]?.(...args, {
                tracker: tracker,
                unsubscribe: () => (keep = F),
              }),
              keep // Will be set synchronously in the unsubscribe handler before this value is returned.
            )
          )
        )
    );
  };

  const posted = new Set<TrackerEvent>();
  // If an event refers to another event it will not get posted before that is posted.
  // That also means that if the referred event is never posted, neither is the event.
  const pendingDependencies = new Map<TrackerEvent, TrackerEvent[]>();
  const areAllDependenciesPosted = (ev: TrackerEvent) =>
    !any(ev[dependencies], (dep) => !posted.has(dep));

  const processQueue = () => {
    if (!queue.length) {
      return;
    }

    let blobs: any[] = [];
    let posting: TrackerEvent[] = [];
    let payloadSize = 2; // The two characters "["  and "]" are always included in the payload.

    while (queue.length) {
      const event = queue[0];

      if (!areAllDependenciesPosted(event)) {
        map(event[dependencies], (dep) =>
          getOrSet(pendingDependencies, dep, []).push(event)
        );
        queue.shift();
        continue;
      }
      posted.add(event);

      tryUse(pendingDependencies.get(event), (stalled) =>
        splice(queue, 1, 0, filter(stalled, areAllDependenciesPosted))
      );

      console.debug(JSON.stringify(event, null, 2));

      const ts = event.timestamp;
      event.timestamp = event.timestamp! - now();
      const blob = new Blob([blobs.length ? "," : "", stringify(event)]);
      // If the total payload length exceed this limit after adding the event to it, we post what we have so far.
      const sizeExceeded = payloadSize + blob.size > 60e3;
      if (sizeExceeded) {
        event.timestamp = ts;
        if (!blobs.length) {
          // A single event exceeded the 60k limit (?!)
          err(ERR_BUFFER_OVERFLOW);
        }
      } else {
        blobs.push(blob);
        push(posting, queue.shift()!);
        payloadSize += blob.size;
      }

      // We are looking at the last event in the queue or have
      if (queue.length === 0 || sizeExceeded) {
        if (
          !navigator.sendBeacon(
            config.hub,
            new Blob(["[", ...blobs, "]"], {
              // Even though it is JSON, using this content type avoids the overhead of the "preflight" request that is otherwise made by browsers in cross-domain scenarios.
              type: "text/plain",
            })
          )
        ) {
          err(ERR_POST_FAILED, posting);
        }

        callListeners("post", posting);

        blobs = [];
        posting = [];
        length = 2;
      }
    }
  };
  // #endregion

  let mainArgs: TrackerCommand[] | null = nil;
  let currentArg = 0;
  let insertArgs = F;
  let refreshes = 0;

  tracker = define(
    {},
    {
      push: [
        (...commands: TrackerCommand[]) => {
          if (!commands.length) {
            return;
          }

          commands = filter(commands, (command) => {
            if (!command) return F;

            // #region Configuration
            if (isConfigCommand(command)) {
              callListeners("command", command);
              if (configurationLocked === (configurationLocked = T))
                err(ERR_CONFIG_LOCKED);
              else {
                Object.assign(config, command["config"]);
                map(["vars", "hub"], (p) => (config[p] = mapUrl(config[p])));

                return F;
              }
            }
            // #endregion
            return T;
          });

          if (initializing) {
            init.push(...commands);
            return tracker;
          }

          const getCommandRank = (cmd: TrackerCommand) =>
            isExtensionCommand(cmd)
              ? -100
              : isListenerCommand(cmd)
              ? -50
              : isSetCommand(cmd)
              ? -10
              : isTrackerEvent(cmd)
              ? 90
              : isFlushCommand(cmd)
              ? 100
              : 0;
          // Put events and flushes last to allow listeners and interceptors from the same batch to work on them.
          // Sets come before gets to avoid unnecessary waiting
          // Extensions then listeners are first, so they can evaluate the rest.
          const expanded: TrackerCommand[] = sort(
            flatMap(commands as any),
            getCommandRank
          );

          // Allow nested calls to tracker.push from listerners and interceptors. Insert commands in the currently processed main batch.
          if (
            mainArgs &&
            splice(
              mainArgs,
              insertArgs ? currentArg + 1 : mainArgs.length,
              0,
              expanded
            )
          )
            return;

          mainArgs = expanded;
          for (currentArg = 0; currentArg < mainArgs.length; currentArg++) {
            if (!mainArgs[currentArg]) continue;
            tryCatch(
              () => {
                const command = mainArgs![currentArg];
                callListeners("command", command);
                insertArgs = F;
                if (isTrackerEvent(command)) {
                  command.timestamp ??= now();

                  insertArgs = T;
                  let skip = F;
                  map(array(extensions), ([, extension], i) => {
                    if (
                      skip ||
                      extension.decorate?.(command as TrackerEvent) === F
                    ) {
                      skip = T;
                    }
                  });

                  if (skip) {
                    return; // Skip event and process next command.
                  }

                  push(queue, command);
                } else if (isFlushCommand(command)) {
                  // flush = F has already been filtered out in the top of the for-loop.
                  throttle.clear(); // Clear timeout
                  processQueue();
                } else if (isGetCommand(command)) {
                  vars.get(command.get, command.timeout);
                } else if (isSetCommand(command)) {
                  vars.set(command.set);
                  map(entries(command.set), ([key, value]) =>
                    callListeners("set", key, value)
                  );
                } else if (isListenerCommand(command)) {
                  push(listeners, command.listener);
                } else if (isExtensionCommand(command)) {
                  tryUse(
                    tryCatch(
                      () => command.extension.setup(tracker),
                      (e) => err(nil, command.extension, e)
                    ),
                    (extension) => {
                      push(extensions, [command.priority ?? 100, extension]);
                      sort(extensions, ([priority]) => priority);
                    }
                  );
                } else if (isRefreshCommand(command)) {
                  (async () => {
                    if (config.vars) {
                      const serverVars = await (
                        await fetch(config.vars)
                      ).json();
                      vars.set(serverVars);
                    }
                    ++refreshes;
                    callListeners("refresh", vars);
                  })();
                } else if (isTrackerLoadedCommand(command)) {
                  refreshes > 0
                    ? command(tracker) // Variables have already been loaded once.
                    : splice(mainArgs!, currentArg + 1, 0, {
                        listener: {
                          refresh: (v, { unsubscribe }) => (
                            command(tracker), unsubscribe()
                          ),
                        },
                      });
                } else {
                  !filter(
                    extensions,
                    ([, extension]) =>
                      extension.processCommand?.(command) ?? false
                  ) && err(ERR_INVALID_COMMAND, command);
                }
              },
              (e) => err(ERR_INTERNAL_ERROR, nil, e)
            );
          }

          mainArgs = nil;

          throttle(() => processQueue(), 200);
        },
      ],
      name: [TRACKER_NAME],

      initialize: [
        () => {
          if (initializing === (initializing = F)) return;
          push(init, ...((window[TRACKER_NAME] as any) || []));
          define(window, { [TRACKER_NAME]: [tracker] });
          push(tracker, ...init);
          let pendingResources = 1;
          const resourceLoaded = () =>
            !--pendingResources && push(tracker, "refresh");

          config.scripts.map((src) => {
            ++pendingResources;
            const script = document.createElement("script");
            listen(script, ["load", "error"], resourceLoaded);
            script.async = T;
            script.src = mapUrl(src);
            document.head.appendChild(script);
          });

          resourceLoaded();
        },
      ],
    }
  ) as any;

  return tracker;
};
