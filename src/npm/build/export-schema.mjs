import fs from "fs/promises";
import { join, dirname } from "path";
import * as tsj from "ts-json-schema-generator";
import { env, getProjects } from "./shared.mjs";

const pkg = await env();

const targets = [
  [join(pkg.path, "dist", "schema"), true],
  ...getProjects(false).map(({ dataPath }) => [
    join(dataPath, "schema.json"),
    false,
  ]),
  ...getProjects(true).map(({ path }) => [join(path, "types/schema"), true]),
];

const schema = tsj
  .createGenerator({
    path: "src/events/**/*.ts",
    type: "*",
    topRef: true,
  })
  .createSchema("*");

// Remove type guards.
Object.keys(schema.definitions).forEach(
  (key) => key.startsWith("NamedParameters") && delete schema.definitions[key]
);

var html = [];
Object.entries(schema.definitions).forEach(([key, def]) => {
  if (!def.properties) return;
  html.push(`<h3>${key}</h3`);
  for (const [prop, propDef] of Object.entries(def.properties)) {
    html.push(`${prop}<br>`);
  }
});
fs.writeFile("C:/temp/schema.html", html.join("\n"), "utf-8");

await Promise.all(
  targets.map(async ([target, pkg]) => {
    if (pkg) {
      await fs.mkdir(join(target, "dist"), { recursive: true });
      await fs.writeFile(
        join(target, "package.json"),
        JSON.stringify({
          private: true,
          main: "dist/index.js",
          module: "dist/index.mjs",
        })
      );
      await fs.writeFile(
        join(target, "dist/index.mjs"),
        `export default ${JSON.stringify(schema, null, 2)};`
      );
      await fs.writeFile(
        join(target, "dist/index.js"),
        `module.exports = ${JSON.stringify(schema, null, 2)};`
      );
    } else {
      await fs.mkdir(dirname(target), { recursive: true });
      await fs.writeFile(target, JSON.stringify(schema, null, 2));
    }
  })
);
