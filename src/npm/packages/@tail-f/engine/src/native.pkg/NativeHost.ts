import fs, { WriteStream } from "fs";
import { FileHandle } from "fs/promises";
import http from "http";
import https from "https";
import * as p from "path";
import zlib from "zlib";
import { LogMessage, OtherCookie } from "..";
import { EngineHost, HostRequest, HostResponse } from "../EngineHost";
import { forEach, params, unparam } from "../lib";
import { ValueCollection } from "../ValueCollection";

const SAME_SITE = { strict: "Strict", lax: "Lax", none: "None" };
export class NativeHost implements EngineHost {
  private _rootPath: string;

  constructor(rootPath: string) {
    this._rootPath = p.resolve(rootPath);
  }

  public async compress(
    data: string | Uint8Array,
    algorithm: string
  ): Promise<Uint8Array | null> {
    if (algorithm === "br") {
      return await new Promise((resolve, reject) => {
        zlib.brotliCompress(
          typeof data === "string" ? data : Buffer.from(data).toString("utf-8"),
          {
            params: {
              [zlib.constants.BROTLI_PARAM_QUALITY]:
                zlib.constants.BROTLI_MAX_QUALITY,
            },
          },
          (error, result) => {
            if (error) reject(error);
            resolve(new Uint8Array(result));
          }
        );
      });
    }
    if (algorithm === "gzip") {
      return await new Promise((resolve, reject) => {
        zlib.gzip(
          typeof data === "string" ? data : Buffer.from(data).toString("utf-8"),
          {
            level: 9,
          },
          (error, result) => {
            if (error) reject(error);
            resolve(new Uint8Array(result));
          }
        );
      });
    }
    return null;
  }

  async log<T extends string | Record<string, any>>({
    group = "console",
    data,
    level = "info",
    source,
  }: LogMessage<T>) {
    const msg = JSON.stringify({
      timestamp: new Date().toISOString(),
      source,
      level,
      data,
    });
    if (group === "console") {
      switch (level) {
        case "debug":
          console.debug(msg);
          break;
        case "warn":
          console.warn(msg);
          break;
        case "error":
          console.error(msg);
          break;
        default:
          console.log(msg);
      }
      return;
    }

    const dir = p.join(this._rootPath, "logs");
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.appendFile(
      p.join(dir, `${group}.json`),
      `${msg}\n`,
      "utf-8"
    );
  }

  async get<B extends boolean = false>(
    path: string,
    {
      text,
      changeHandler,
    }: {
      text?: B;
      changeHandler?: ((path: string) => Promise<void>) | undefined;
    } = {}
  ): Promise<(B extends true ? string : Uint8Array) | null> {
    const fullPath = p.resolve(p.join(this._rootPath, path));

    if (!fullPath.startsWith(this._rootPath)) {
      throw new Error("The requested path is outside the root.");
    }
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    if (changeHandler) {
      fs.watchFile(fullPath, async () => {
        try {
          await changeHandler(path);
        } catch (e) {
          console.error(e);
          // Dont crash the host with an unhandled async exception.
        }
      });
    }
    if (text) {
      return (await fs.promises.readFile(fullPath, "utf-8")) as any;
    } else {
      return new Uint8Array(
        (await fs.promises.readFile(fullPath)).buffer
      ) as any;
    }
  }

  public request(url: string, request?: HostRequest): Promise<HostResponse> {
    request ??= { url }!;
    request.url = url;
    request.method ??= request.content ? "POST" : "GET";

    let headers = ValueCollection.normalize(request.headers);

    if (request.cookies) {
      const cookies = params(headers["cookie"]);
      forEach(request.cookies, ([key, value]) => (cookies[key] = value));
      (headers ??= {})["cookie"] = [unparam(cookies)];
    }
    if (request.content?.type) {
      (headers ??= {})["content-type"] = [request.content.type];
    }

    return new Promise((resolve, reject) => {
      const tryCatch = <T>(action: () => T) => {
        try {
          return action();
        } catch (e) {
          reject(e);
        }
      };
      tryCatch(() => {
        if (!request) return;
        const req = (request.url.startsWith("https:") ? https : http).get(
          request.url,
          {
            headers: request.headers,
            method: request.method,
          },
          (res) => {
            if (!res?.statusCode) {
              reject(new Error("The server did not reply with a status code."));
              return;
            }

            const body: any[] = [];
            res.on("data", (chunk) => tryCatch(() => body.push(chunk)));
            res.on("end", () =>
              tryCatch(() => {
                if (!request) return;
                const responseText = Buffer.concat(body).toString();

                const headers = res.headers;
                const cookies: Record<string, OtherCookie> = {};
                forEach(headers["set-cookie"], (header) => {
                  const ps = params(header);
                  if (!ps[0]) return;
                  const [name, value] = ps[0];
                  cookies[name] = {
                    type: "other",
                    name,
                    value,
                    fromRequest: false,
                    http: "httponly" in params,
                    sameSite: SAME_SITE[params["samesite"]] ?? "Lax",
                    maxAge: params["max-age"]
                      ? parseInt(params["max-age"])
                      : undefined,
                  };
                });

                resolve({
                  request,
                  cookies,
                  headers: Object.fromEntries(
                    Object.entries(headers).flatMap(([k, v]) =>
                      v ? [Array.isArray(v) ? [k, v] : [k, [v]]] : []
                    )
                  ),
                  content: responseText
                    ? { type: headers["content-type"], text: responseText }
                    : undefined,
                });
              })
            );
          }
        );

        req.on("error", (err) => {
          reject(err);
        });

        req.on("timeout", () => {
          req.destroy();
          reject(new Error("Request time out"));
        });

        if (request.content?.data) {
          tryCatch(() => req.write(request!.content?.data, "utf-8"));
        }
      });
    });
  }
}
