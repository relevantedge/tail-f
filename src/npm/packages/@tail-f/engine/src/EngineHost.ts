import { decode } from "base64-arraybuffer";
import { Cookie, OtherCookie } from ".";

export type HostRequest = {
  url: string;
  method?: string;
  content?: { type?: string; data: string };
  headers?: Record<string, string | string[]>;
  cookies?: Record<string, string>;
};

export type HostResponse = {
  request: HostRequest;
  headers?: Record<string, string[]>;
  cookies?: Record<string, OtherCookie>;
  content?: {
    type?: string;
    text: string;
  };
};

export type LogMessage<T extends string | Record<string, any>> = {
  group?: "console" | string;
  level?: "debug" | "info" | "warn" | "error";
  source?: string;
  data: T;
};

export type EngineHost = {
  request(
    url: string,
    request?: Omit<HostRequest, "url">
  ): Promise<HostResponse>;

  get<B extends boolean = false>(
    path: string,
    options?: { text?: B; changeHandler?: (path: string) => Promise<void> }
  ): Promise<(B extends true ? string : Uint8Array) | null>;

  log<T extends string | Record<string, any>>(
    message: LogMessage<T>
  ): Promise<void>;

  compress(
    data: string | Uint8Array,
    algorithm: string
  ): Promise<Uint8Array | null>;
};

export function base64ToBuffer(base64: string) {
  return decode(base64);
}
