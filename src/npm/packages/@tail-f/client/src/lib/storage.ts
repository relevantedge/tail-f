import {
  isEmptyArray,
  nil,
  parse,
  stringify,
  TRACKER_NAME,
  undefined,
  unwrap,
  window,
} from ".";

export function useStorage<T>(
  key: string,
  action: (state: T | null) => T | void,
  shared?: boolean
): T;
export function useStorage<T = any>(
  key: string,
  value: null,
  shared?: boolean
): T | null;
export function useStorage<T>(key: string, value: T, shared?: boolean): T;
export function useStorage<T>(
  key: string,
  action?: (state: T | null) => T | void | null,
  shared?: boolean
): T | null;
export function useStorage<T>(
  key: string,
  action?: null | ((state: T | null) => T | void | null),
  shared?: boolean
): T | null {
  key = TRACKER_NAME + "/" + key;
  const storage = window[(shared ? "local" : "session") + "Storage"];
  let value = storage.getItem(key) as any;
  if (value) {
    value = parse(value);
  }
  if (action !== undefined) {
    const newValue = unwrap(action, value);
    if (newValue === nil || isEmptyArray(newValue)) {
      storage.removeItem(key);
    } else if (newValue !== undefined) {
      value = newValue;
      storage.setItem(key, stringify(newValue));
    } else if (isEmptyArray(value)) {
      storage.removeItem(key);
    }
  }

  return value;
}
