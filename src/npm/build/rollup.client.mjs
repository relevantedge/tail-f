import alias from "@rollup/plugin-alias";
import replace from "@rollup/plugin-replace";
import esbuild from "rollup-plugin-esbuild";
import { uglify } from "rollup-plugin-uglify";
import { getDistBundles } from "./rollup.dist.mjs";
import { applyDefaultConfiguration, env, getProjects } from "./shared.mjs";

const pkg = await env(true);

const destinations = [
  `${pkg.path}/dist/dist/index.min`,
  ...getProjects().map(({ dataPath }) => `${dataPath}/tail-f`),
];

export default [
  applyDefaultConfiguration({
    input: "src/index.browser.ts",
    plugins: [
      alias({
        entries: [
          {
            find: "@tail-f/types",
            replacement: `${pkg.workspace}/packages/@tail-f/types/src/index.ts`,
          },
        ],
      }),
      {
        generateBundle: (options, bundle) => {
          for (const file in bundle) {
            const key = `BUNDLE_${file.replace(/[^a-z0-9]/gi, "_")}`;
            const text = bundle[file].code ?? bundle[file].source;
            process.env[key] = text;
          }
        },
      },
      esbuild({ tsconfig: "tsconfig.browser.json" }),
      replace({
        preventAssignment: false,
        delimiters: ["\\b", "\\b(?!\\.)"],
        values: { const: "var", let: "var" },
      }),
      uglify({
        mangle: true,
        compress: {
          sequences: true,
          dead_code: true,
          conditionals: true,
          booleans: true,
          passes: 2,
          unused: true,
          if_return: true,
          join_vars: true,

          //drop_console: true,
          //toplevel: true
        },
      }),
    ],
    output: destinations.flatMap((name) => [
      {
        file: `${name}.js`,
        format: "iife",
        sourcemap: false,
        name: "tail",
      },
      {
        file: `${name}.debug.js`,
        format: "iife",
        sourcemap: "inline",
        name: "tail",
      },
    ]),
  }),
  ...(await getDistBundles({
    "globalThis.clientScript": () =>
      JSON.stringify(process.env.BUNDLE_tail_f_js),
  })),
];
