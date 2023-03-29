import type { TrackerExtension } from "@tail-f/engine";
import { NativeHost } from "@tail-f/engine/native";
import {
  bootstrap,
  EventLogger,
  extensions as defaultExtensions,
} from "@tail-f/engine/standalone";
import { NextApiRequest, NextApiResponse } from "next";

export interface ApiSettings {
  resourcesPath?: string;
  extensions?: TrackerExtension[];
}

export const api = ({
  resourcesPath = "./api",
  extensions = [],
}: ApiSettings) => {
  const host = new NativeHost(resourcesPath);

  const requestHandler = bootstrap({
    host,
    scriptPath: "./tail-f.debug.js",
    endpoint: "/api/t.js",
    extensions: [
      defaultExtensions.session,
      defaultExtensions.location,
      ...extensions,
      new EventLogger("events"),
    ],
  });

  return async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    if (!req.url || !req.method) {
      return send(400, "URL and/or method is missing(?!).");
    }

    const url = new URL(req.url, `https://${req.headers.host}`);

    const { response } = await requestHandler.processRequest({
      method: req.method,
      path: url.pathname,
      query: req.query,
      headers: req.headers,
      clientIp: "87.62.100.252",
      payload: req.body,
    });

    if (response === null) {
      return send(404);
    }

    const content = response.content;
    if (content) {
      return send(response.status, content.data, {
        "Content-Type": content.type,
      });
    } else {
      return send(response.status);
    }

    function send(
      status: number,
      content?: string | Uint8Array | null,
      headers?: Record<string, string> | null
    ) {
      headers ??= {};

      res.statusCode = status;
      if (headers) {
        for (const [name, value] of [
          ...Object.entries(headers).map(
            ([key, value]) => [key, [value]] as const
          ),
          ...Object.entries(response?.headers ?? {}),
        ]) {
          res.setHeader(name, value);
        }
      }
      if (content) {
        if (typeof content === "string") {
          res.write(content, "utf-8");
        } else {
          res.write(content);
        }
      }
      res.end();
    }
  };
};
