import fs from "fs";
import { join } from "path";
import dts from "rollup-plugin-dts";
import esbuild from "rollup-plugin-esbuild";
import package_json from "rollup-plugin-generate-package-json";
import { sortPackageJson } from "sort-package-json";
import { getExternalBundles } from "./rollup.external.mjs";
import {
  addCommonPackageData,
  applyDefaultConfiguration,
  chunkNameFunctions,
  env,
  getProjects,
} from "./shared.mjs";

export const getDistBundles = async (variables = {}, subPackages = {}) => {
  const pkg = await env();

  async function addSubPackages(path, basePath = path) {
    for (const entry of await fs.promises.readdir(path)) {
      const subPath = join(path, entry);
      if (fs.statSync(subPath).isDirectory()) {
        if (entry.endsWith(".pkg")) {
          subPackages[join(subPath, "index.ts")] = join(
            path.substring(basePath.length + 1),
            entry.substring(0, entry.length - 4)
          );
        }
        addSubPackages(subPath, basePath);
      }
    }
  }
  await addSubPackages(`src`);

  const destinations = [
    join(pkg.workspace, "dist/@tail-f/", pkg.name),
    ...getProjects(true).flatMap(({ path }) => [join(path, pkg.name)]),
  ];

  const bundles = [
    ["src/index.ts", ""],
    ...Object.entries(subPackages),
  ].flatMap(([source, target], i) => {
    return [
      applyDefaultConfiguration({
        input: source,
        plugins: [
          esbuild({
            treeShaking: true,
          }),
          package_json({
            //inputFolder: pkg.path,
            baseContents: (pkg) => {
              pkg = { ...(pkg ?? {}) };
              if (i === 0) {
                pkg.main = "dist/index.js";
                pkg.module = "dist/index.mjs";
                pkg.types = "dist/index.d.ts";
              } else {
                return {
                  main: "dist/index.js",
                  module: "dist/index.mjs",
                  types: "dist/index.d.ts",
                };
              }
              delete pkg["devDependencies"];
              delete pkg["scripts"];

              pkg.version = process.env.VERSION;
              for (const name in pkg.dependencies) {
                if (pkg.dependencies[name] === "workspace:*") {
                  pkg.dependencies[name] = process.env.VERSION;
                }
              }

              return sortPackageJson(addCommonPackageData(pkg));
            },
          }),
          {
            generateBundle: (options, bundle) => {
              for (const file in bundle) {
                for (const key in variables) {
                  bundle[file].code = bundle[file].code.replace(
                    new RegExp(`\\b${key}\\b`, "g"),
                    variables[key]()
                  );
                }
              }
            },
          },
        ],
        external: [/\@tail\-f\/.+/g],
        output: destinations.flatMap((path) => {
          const dir = join(path, target);
          return [
            {
              name: pkg.name,
              dir,
              ...chunkNameFunctions(".mjs"),
              format: "es",
            },
            {
              name: pkg.name,
              dir,
              ...chunkNameFunctions(".js"),
              format: "cjs",
            },
          ];
        }),
      }),
      {
        input: source,
        plugins: [dts()],
        external: [/\@tail\-f\/.+/g],
        output: destinations.map((path) => {
          const dir = join(path, target);
          return {
            dir,
            ...chunkNameFunctions(".d.ts"),
            format: "es",
          };
        }),
      },
    ];
  });

  if (fs.existsSync(join(pkg.path, "/src/index.external.ts"))) {
    bundles.push(...(await getExternalBundles()));
  }
  return bundles;
};
