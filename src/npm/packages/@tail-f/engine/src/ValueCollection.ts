import { eq, forEach, isIterable, map } from "./lib";

type ValueMapper<Key, Source, Value> = (
  key: Key,
  source: Source,
  current: Value | undefined
) => Value | null | false;

type Comparer<Value> = (
  previousValue: Value | undefined,
  currentValue: Value
) => boolean;

export type ValueCollectionSettings<
  Key,
  Value extends Source,
  Source = Value
> = ([Value] extends [Source]
  ? { map?: ValueMapper<Key, Source, Value> }
  : { map: ValueMapper<Key, Source, Value> }) & {
  values?: Iterable<[Key, Source]>;
  compare?: Comparer<Value>;
};

export type ValueChange<Key, Value> = { key: Key } & (
  | { type: "added"; value: Value }
  | { type: "changed"; value: Value; previous: Value }
  | { type: "deleted"; value: undefined }
);
export class ChangeSet<Key, Value>
  implements Iterable<ValueChange<Key, Value>>
{
  private _changes: ValueChange<Key, Value>[] = [];
  private _map = new Map<Key, Value>();

  public get map() {
    return this._map;
  }

  [Symbol.iterator](): Iterator<ValueChange<Key, Value>, any, undefined> {
    return this._changes[Symbol.iterator]();
  }

  public reset() {
    this._changes = [];
    this._map = new Map();
  }

  public take(
    key: Key,
    previous: Value | undefined,
    current: Value | undefined
  ) {
    if (previous === undefined) {
      if (current === undefined) {
        return;
      }
      this._changes.push({ type: "added", key, value: current });
      this._map.set(key, current);
    } else if (current === undefined) {
      this._changes.push({ type: "deleted", key, value: undefined });
      this._map.delete(key);
    } else {
      this._changes.push({ type: "changed", key, value: current, previous });
      this._map.set(key, current);
    }
  }
}

export class ValueCollection<Key, Value extends Source, Source = Value>
  implements Iterable<[Key, Value]>
{
  private readonly _changes = new ChangeSet<Key, Value>();
  private readonly _mapValue: ValueMapper<Key, Source, Value>;

  private _comparer: Comparer<Value>;
  private _values = new Map<Key, Value>();

  constructor(
    {
      values,
      map,
      compare,
    }: ValueCollectionSettings<Key, Value, Source> = {} as any
  ) {
    this._mapValue = map ?? (((key: any, value: any) => value) as any);
    this._comparer =
      compare ?? ((previous, current) => eq(previous, current, true));

    forEach(values, (kv) => kv && this.set(kv[0], kv[1]));
  }

  public get changes() {
    return this._changes;
  }

  public get size() {
    return this._values.size;
  }

  [Symbol.iterator]() {
    return this._values[Symbol.iterator]();
  }

  public get(key: Key): Readonly<Value> | undefined {
    return this._values.get(key);
  }

  public clear() {
    this._values.clear();
  }

  public resetChanges() {
    this._changes.reset();
    return this;
  }

  public set(key: Key, value: Source | null): this;
  public set(
    key: Key,
    config: (current: Value | undefined) => Source | null | false
  ): this;
  public set(key: Key, source: any) {
    const current = this._values.get(key);
    if (typeof source === "function") {
      if ((source = source(current)) === false) {
        return;
      }
    }

    const mapped = source ? this._mapValue(key, source, current) ?? null : null;
    if (mapped === false) {
      return;
    }

    if (mapped === null) {
      this._values.delete(key);
      this._changes.take(key, current, undefined);
    } else {
      this._values.set(key, mapped);
      if (!this._comparer(current, mapped)) {
        this._changes.take(key, current, mapped);
      }
    }

    return this;
  }

  public static normalize<K extends string | number, V>(
    values:
      | null
      | undefined
      | Iterable<[K, V | V[] | null | undefined]>
      | Record<K, V | V[] | null | undefined>,
    lowerCase = true
  ) {
    const normalized: Record<K, V[]> = {} as any;
    for (let [key, value] of map.it(values)) {
      if (value === null || value === undefined) continue;

      if (lowerCase && typeof key === "string") {
        key = key.toLowerCase() as K;
      }

      (normalized[key] ??= []).push(
        ...(Array.isArray(value) ? value : [value])
      );
    }
    return normalized;
  }

  public toJSON(): Key extends keyof any ? Record<Key, Value> : [Key, Value][] {
    const entries = map(this);
    if (entries.some(([key]) => typeof key === "object")) {
      return entries as any;
    }
    return Object.fromEntries(entries);
  }
}
