import type { TrackerEvent, View } from "@tail-f/types";
import {
  AnyCookie,
  CookieMonster,
  ManagedCookie,
  OtherCookie,
} from "./CookieMonster";
import { ExpandDeep, map, params, SemiPartial } from "./lib";
import type { RequestHandler } from "./RequestHandler";
import { ValueCollection } from "./ValueCollection";

export type TrackerSettings = {
  disabled?: boolean;
  clientIp?: string | null;
  referrer?: string | null;
  headers?: Record<string, string | string[] | undefined>;
  requestHandler: RequestHandler;
};

type SetCookieValue = ExpandDeep<
  | SemiPartial<Omit<ManagedCookie, "name">, "type" | "value">
  | SemiPartial<Omit<OtherCookie, "name">, "type" | "value">
>;

type UpdateCookieSettings = ExpandDeep<
  | SemiPartial<Omit<ManagedCookie, "name" | "value">, "type">
  | SemiPartial<Omit<OtherCookie, "name" | "value">, "type">
>;

export class Tracker {
  private readonly _requestHandler: RequestHandler;

  /** @internal  */
  public readonly _clientEvents: TrackerEvent[] = [];
  public readonly clientIp: string | null;
  public readonly cookies: ValueCollection<
    string,
    AnyCookie,
    SetCookieValue
  > & {
    update<T>(
      name: string,
      update: (current: T | undefined) => T,
      settings: UpdateCookieSettings
    ): T;
  };
  public readonly disabled: boolean;
  public readonly headers: ValueCollection<string, string[]>;
  public readonly queryString: ValueCollection<string, string[]>;
  public readonly referrer: string | null;
  public readonly state: ValueCollection<string, any>;
  public readonly variables: ValueCollection<string, any>;

  public view: View;

  constructor({
    disabled = false,
    clientIp = null,
    referrer = null,
    headers,
    requestHandler,
  }: TrackerSettings) {
    this.disabled = disabled;
    this._requestHandler = requestHandler;

    this.headers = new ValueCollection({
      values: map(ValueCollection.normalize(headers)),
    }).resetChanges();

    this.clientIp =
      clientIp ??
      this.headers.get("x-forwarded-for")?.[0] ??
      params(this.headers.get("forwarded"))["for"] ??
      null;

    this.referrer = referrer ?? this.headers.get("referer")?.[0] ?? null;

    this.cookies = new ValueCollection({
      values: CookieMonster.instance.parseCookieHeader(
        this.headers.get("cookie")?.[0]
      ),
      map: (key, value: SetCookieValue) => {
        const base = {
          name: key,
          value: value.value,
          fromRequest: value.fromRequest ?? false,
        };
        return value.type === "identifier" || value.type === "session"
          ? {
              ...base,
              type: value.type,
              essential: value.essential ?? false,
            }
          : value.type === "other"
          ? base.fromRequest
            ? ({ ...base, type: value.type } as any)
            : {
                ...base,
                type: value.type,
                maxAge: value.maxAge,
                http: value.http ?? false,
                sameSite: value.sameSite ?? "Lax",
              }
          : null;
      },
    }) as any;
    this.cookies.update = (name, update, settings) => {
      const current = this.cookies.get(name)?.value;
      const value = update(current == null ? undefined : JSON.parse(current));
      this.cookies.set(
        name,
        value ? { ...settings, value: JSON.stringify(value) } : null
      );
      return value;
    };

    this.state = new ValueCollection();
    this.variables = new ValueCollection();
  }

  public get clientEvents() {
    return this._clientEvents;
  }

  public getClientScripts() {
    return this._requestHandler.getClientScripts(this);
  }

  public async postEvents(
    events: TrackerEvent[] | string,
    { routeToClient = false }: { routeToClient: boolean }
  ) {
    return await this._requestHandler.postEvents(this, events, {
      routeToClient,
    });
  }
}
