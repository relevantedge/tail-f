import alias from "@rollup/plugin-alias";
import cjs from "@rollup/plugin-commonjs";
import inject from "@rollup/plugin-inject";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import { join } from "path";
import * as fs from "fs";
import dts from "rollup-plugin-dts";
import esbuild from "rollup-plugin-esbuild";
import package_json from "rollup-plugin-generate-package-json";
import {
  applyDefaultConfiguration,
  chunkNameFunctions,
  env,
  getProjects,
} from "./shared.mjs";

export async function getExternalBundles() {
  const pkg = await env();

  const v8 = [
    `${pkg.workspace}/dist/@tail-f/${pkg.name}/v8`,
    ...getProjects(false).map(({ path }) => join(path, pkg.name)),
    ...getProjects(true).map(({ path }) => join(path, pkg.name, "v8")),
  ];

  const standalone = [
    join(pkg.workspace, "dist/@tail-f", pkg.name, "standalone"),
    ...getProjects(true).flatMap(({ path }) => [
      join(path, pkg.name, "standalone"),
    ]),
  ];

  return [v8, standalone].flatMap((outputs, i) => {
    let tsconfig = join(
      pkg.path,
      `tsconfig.${i === 0 ? "v8" : "standalone"}.json`
    );
    if (!fs.existsSync(tsconfig)) {
      tsconfig = void 0;
    }
    return [
      applyDefaultConfiguration({
        input: join("src/index.external.ts"),
        plugins: [
          esbuild({
            treeShaking: true,
            tsconfig: fs.existsSync(tsconfig) ? tsconfig : undefined,
          }),
          resolve(
            i == 0
              ? {
                  browser: true,
                  preferBuiltins: false,
                  tsconfig,
                }
              : { browser: true, preferBuiltins: false, tsconfig }
          ),
          cjs(),
          json(),

          ...(i > 0
            ? []
            : [
                alias({
                  entries: [
                    {
                      find: "net",
                      replacement: `${pkg.workspace}/build/shims/net.ts`,
                    },
                    { find: "assert", replacement: "assert" },
                    { find: "buffer", replacement: "buffer-es6" },
                    { find: "console", replacement: "console-browserify" },
                    { find: "crypto", replacement: "crypto-browserify" },
                    { find: "domain", replacement: "domain-browser" },
                    { find: "events", replacement: "events" },
                    { find: "http", replacement: "stream-http" },
                    { find: "https", replacement: "stream-http" },
                    { find: "os", replacement: "os" },
                    { find: "path", replacement: "path" },
                    { find: "process", replacement: "process-es6" },
                    { find: "punycode", replacement: "punycode" },
                    { find: "querystring", replacement: "querystring" },
                    { find: "stream", replacement: "stream-browserify" },
                    { find: "string_decoder", replacement: "string_decoder" },
                    { find: "sys", replacement: "util" },
                    { find: "timers", replacement: "timers-browserify" },
                    { find: "tty", replacement: "tty-browserify" },
                    { find: "url", replacement: "url" },
                    { find: "util", replacement: "util" },
                    { find: "vm", replacement: "vm-browserify" },
                    { find: "zlib", replacement: "browserify-zlib" },
                    { find: "fs", replacement: "memfs" },
                    { find: "emitter", replacement: "component-emitter" },
                  ],
                }),
                inject({
                  Buffer: ["buffer-es6", "Buffer"],
                  process: "process-es6",
                  crypto: "crypto",
                  global: `${pkg.workspace}/build/shims/global.ts`,
                }),
              ]),
          package_json({
            baseContents: () => {
              return {
                private: true,
                main: "dist/index.js",
                module: "dist/index.mjs",
                types: "dist/index.d.ts",
              };
            },
          }),
        ],
        external: [/\@tail\-f\/.+/g],
        output: outputs.flatMap((path) => [
          {
            name: pkg.name,
            format: "es",
            dir: path,
            ...chunkNameFunctions(".mjs"),
          },
          {
            name: pkg.name,
            dir: path,
            format: "cjs",
            ...chunkNameFunctions(".js"),
          },
        ]),
      }),
      {
        input: `src/index.external.ts`,
        plugins: [dts()],
        external: [/\@tail\-f\/.+/g],
        output: outputs.map((path) => ({
          dir: path,
          ...chunkNameFunctions(".d.ts"),
          format: "es",
        })),
      },
    ];
  });
}
