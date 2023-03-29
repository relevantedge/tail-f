import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
import { CookieConfiguration, DEFAULT } from ".";
import { any, entries, forEach, map } from "./lib";

export type Cookie = {
  type: "identifier" | "session" | "other";
  name: string;
  value: string;
  fromRequest: boolean;
};

export type ManagedCookie = Cookie & {
  type: "identifier" | "session";
  essential: boolean;
};

export type OtherCookie = Cookie &
  Cookie & {
    type: "other";
  } & (
    | {
        fromRequest: true;
        maxAge?: undefined;
        http?: undefined;
        sameSite?: undefined;
      }
    | {
        fromRequest: false;
        maxAge?: number;
        /** @default  false */
        http: boolean;
        /** @default "Lax" */
        sameSite: "Strict" | "Lax" | "None";
      }
  );

export type AnyCookie = ManagedCookie | OtherCookie;

export const isManagedCookie = (value: Cookie): value is ManagedCookie =>
  value.type === "identifier" || value.type === "session";

export const isOtherCookie = (value: Cookie): value is OtherCookie =>
  value.type === "other" && !value.fromRequest;

export class CookieMonster {
  // It is fast and small. As Alice said to Bob.
  private readonly _algorithm = "des-cbc";
  private readonly _config: CookieConfiguration;
  private readonly _cookieNames: {
    identifiers: string;
    essentialIdentifiers: string;
    session: string;
    essentialSession: string;
  };
  private readonly _iv: Buffer | null = null;
  private readonly _key: Buffer | null = null;

  private static _instance: CookieMonster | undefined;

  private constructor(config: CookieConfiguration) {
    this._config = config;
    if (config.encryptionKey) {
      const hash = createHash("sha1");
      const bytes = hash
        .update(config.encryptionKey, "utf-8")
        .digest()
        .subarray(0, 16);
      this._key = bytes.subarray(0, 8);
      this._iv = bytes.subarray(8, 16);
    }

    this._cookieNames = {
      identifiers: `${config.namePrefix}.id`,
      essentialIdentifiers: `${config.namePrefix}.e.id`,
      session: `${config.namePrefix}.s`,
      essentialSession: `${config.namePrefix}.e.s`,
    };
  }

  public static get instance() {
    if (!this._instance) {
      this.tryConfigure(DEFAULT.cookies);
    }
    return this._instance!;
  }

  public static tryConfigure(config: CookieConfiguration) {
    if (this._instance) {
      if (this._instance._config !== config) {
        throw new TypeError("Already configured with other settings.");
      }
      return false;
    }
    this._instance = new CookieMonster(config);
    return true;
  }

  public mapResponseHeaders(
    cookies: Iterable<[string, AnyCookie]>
  ): [string, string[]][] {
    const other: string[] = [];
    const identifierValues: Record<string, string>[] = [{}, {}];
    const sessionValues: Record<string, string>[] = [{}, {}];

    const cookieHeaders: string[] = [];

    forEach(cookies, ([key, cookie]) => {
      if (!cookie.value) return;
      if (isManagedCookie(cookie)) {
        (cookie.type === "identifier" ? identifierValues : sessionValues)[
          +cookie.essential
        ][key] = cookie.value;
      } else if (!cookie.fromRequest) {
        other.push(this._getHeaderValue(cookie));
      }
    });

    for (const { name, values, session } of [
      { name: this._cookieNames.identifiers, values: identifierValues[0] },
      {
        name: this._cookieNames.essentialIdentifiers,
        values: identifierValues[1],
      },
      {
        name: this._cookieNames.session,
        values: sessionValues[0],
        session: true,
      },
      {
        name: this._cookieNames.essentialSession,
        values: sessionValues[1],
        session: true,
      },
    ]) {
      if (any(values)) {
        cookieHeaders.push(
          this._getHeaderValue({
            type: "other",
            name,
            value: this._encrypt(values),
            fromRequest: false,
            http: true,
            sameSite: "None",
            maxAge: 34560000,
          })
        );
      }
    }

    cookieHeaders.push(...other);
    return [["Set-Cookie", cookieHeaders]];
  }

  public parseCookieHeader(value?: string): Iterable<[string, AnyCookie]> {
    if (!value) return [];
    const cookies = value?.split(";").map((part) => part.trim());

    return cookies.flatMap((part) => {
      const [key, value] = part.split("=");
      if (!value) {
        return;
      }
      switch (key) {
        case this._cookieNames.essentialIdentifiers:
          return this._decrypt(value).map(([key, value]) => [
            key,
            {
              type: "identifier",
              essential: true,
              value,
              fromRequest: true,
            },
          ]);
        case this._cookieNames.identifiers:
          return this._decrypt(value).map(([key, value]) => [
            key,
            {
              type: "identifier",
              essential: false,
              value,
              fromRequest: true,
            },
          ]);
        case this._cookieNames.essentialSession:
          return this._decrypt(value).map(([key, value]) => [
            key,
            {
              type: "session",
              essential: true,
              value,
              fromRequest: true,
            },
          ]);
        case this._cookieNames.session:
          return this._decrypt(value).map(([key, value]) => [
            key,
            {
              type: "session",
              essential: false,
              value,
              fromRequest: true,
            },
          ]);
        default:
          return [
            [
              key,
              {
                type: "other",
                fromRequest: true,
                value,
              } as Cookie,
            ],
          ] as any;
      }
    });
  }

  private _decrypt(encrypted: string) {
    return decodeURIComponent(this._decryptString(encrypted))
      .split(";")
      .map((parts) => parts.split("="))
      .map(([key, value]) => [
        decodeURIComponent(key),
        decodeURIComponent(value),
      ]);
  }

  private _decryptString(encrypted: string | null | undefined) {
    if (!encrypted) return "";
    if (!this._key) return encrypted;

    const decipher = createDecipheriv(this._algorithm, this._key, this._iv);
    return `${decipher.update(
      encrypted.replace(/[\-_]/g, (m) =>
        m === "-" ? "+" : m === "_" ? "/" : m === "." ? "=" : m
      ),
      "base64",
      "utf8"
    )}${decipher.final("utf8")}`;
  }

  private _encrypt(source: Record<string, string>) {
    return encodeURIComponent(
      this._encryptString(
        map(
          entries(source),
          ([key, value]) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
        ).join(";")
      )
    );
  }

  private _encryptString(source: string | null | undefined) {
    if (!source) return "";
    if (!this._key) return source;

    const cipher = createCipheriv(this._algorithm, this._key, this._iv);
    return `${cipher.update(source, "utf8", "base64")}${cipher.final(
      "base64"
    )}`.replace(/[\+\/\=]/g, (m) =>
      m === "+" ? "-" : m === "/" ? "_" : m === "=" ? "." : m
    );
  }

  private _getHeaderValue(cookie: OtherCookie) {
    if (cookie.fromRequest) {
      throw new Error("Request cookies cannot be written to the response.");
    }
    const parts = [
      `${encodeURIComponent(cookie.name)}=${encodeURIComponent(cookie.value)}`,
      "Path=/",
      "Secure",
    ];
    if (cookie.http) {
      parts.push("HttpOnly");
    }
    if (cookie.maxAge !== void 0) {
      parts.push(`Max-Age=${cookie.maxAge}`);
    }
    parts.push(`SameSite=${cookie.sameSite}`);
    return parts.join("; ");
  }
}
