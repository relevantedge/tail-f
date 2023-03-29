import {
  entries,
  err,
  ERR_ARGUMENT_ERROR,
  F,
  map,
  push,
  T,
  tryCatch,
  undefined,
} from ".";
import { GetCallback } from "..";

export interface Variables {
  set(values: Record<string, any>, reserved?: string[]): void;
  get(values: Record<string, GetCallback>, timeout?: number): void;
}

export const variables = (): Variables => {
  const data: Record<string, any> = {};

  const callbacks: Record<string, GetCallback[]> = {};

  const getCallbacks = (
    key: string,
    reset: boolean
  ): [previous: GetCallback[], current: GetCallback[]] => [
    (callbacks[key] ??= []),
    reset ? (callbacks[key] = []) : callbacks[key],
  ];

  return {
    set(values) {
      map(entries(values), ([key, value]) => {
        data[key] = value;
        const [callbacks, next] = getCallbacks(key, T);
        return map(
          callbacks,
          (callback) => callback(value, key, F) === T && push(next, callback)
        );
      });
    },

    get(values, timeout) {
      map(entries(values), ([key, callback]) => {
        if (!callback) return err(ERR_ARGUMENT_ERROR, key);
        let inner = callback;

        const [queue] = getCallbacks(key, F);

        let triggered = F;
        callback = (value, key, current) => {
          triggered = T;
          return tryCatch(() => inner(value, key, current));
        };

        if (data[key] === undefined && timeout !== 0) {
          push(queue, callback);

          timeout &&
            setTimeout(
              () =>
                !triggered && // The callback has not yet been triggered, timeout happened.
                callback(undefined, key, T) !== T &&
                (inner = () => {}), // Neutralize the inner callback so it is not invoked again if a value arrives after the timeout.
              timeout
            );
        } else {
          callback(data[key], key, T) === T && push(queue, callback);
        }
      });
    },
  };
};
