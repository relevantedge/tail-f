import { findWorkspaceDir } from "@pnpm/find-workspace-dir";
import * as dotenv from "dotenv";
import path from "path";
import fs from "fs";

let resolvedEnv;
export async function env(client) {
  if (resolvedEnv) {
    return resolvedEnv;
  }

  const cwd = process.cwd();
  const ws = await findWorkspaceDir(process.cwd());
  process.chdir(ws);
  dotenv.config();
  dotenv.config({ path: ".env.local" });
  process.chdir(cwd);
  return (resolvedEnv = {
    path: cwd,
    name: path.basename(cwd),
    workspace: await findWorkspaceDir(process.cwd()),
  });
}

export function applyDefaultConfiguration(config) {
  config.onwarn = (warning, warn) => {
    if (
      ["CIRCULAR_DEPENDENCY", "UNRESOLVED_IMPORT", "EVAL"].includes(
        warning.code
      )
    ) {
      return;
    }

    warn(warning);
  };
  return config;
}

function getResolvedEnv() {
  if (resolvedEnv === null) {
    throw new Error(
      "The build environment has not been resolved. Call await env() somewhere first."
    );
  }
  return resolvedEnv;
}

export function addCommonPackageData(pkg) {
  return {
    license: "MIT",
    author: "RelevantEdge (https://www.relevant-edge.com)",
    homepage: "https://github.com/relevantedge/tail-f",
    ...pkg,
  };
}

export function getProjects(modules = undefined) {
  const env = getResolvedEnv();
  return [
    ...(function* () {
      for (const key in process.env) {
        if (key.startsWith("PROJECT_")) {
          const projectName = key.substring(8);
          let projectPath = process.env[key];
          if (!path.isAbsolute(projectPath)) {
            projectPath = path.join(env.workspace, process.env[key]);
          }
          if (!fs.existsSync(projectPath)) {
            throw new Error(
              `The path '${projectPath}' does not exist for the project '${projectName}'.`
            );
          }
          let dataPath = path.join(projectPath, "res");

          const nodeModulesTarget =
            path.basename(projectPath) === "node_modules";

          const modulesPath = nodeModulesTarget
            ? projectPath
            : path.join(projectPath, "node_modules");
          const isModule = fs.existsSync(modulesPath);
          if (isModule) {
            dataPath = path.join(
              projectPath,
              nodeModulesTarget ? "../" : ".",
              "res"
            );
            projectPath = path.join(
              projectPath,
              nodeModulesTarget ? "." : "src",
              "@tail-f"
            );
          }

          if (modules !== undefined && isModule !== modules) {
            continue;
          }
          yield {
            name: projectName,
            path: projectPath,
            dataPath,
            isModule,
          };
        }
      }
    })(),
  ];
}

export function chunkNameFunctions(postfix = ".js") {
  let nextChunkId = 0;

  return {
    chunkFileNames: (chunk) => {
      return `dist/_${nextChunkId++}${postfix}`;
    },
    entryFileNames: (chunk) => {
      nextChunkId = 0;
      const name = chunk.name.replace(/index(\.[^\/]+)$/, "index");
      return `dist/${name}${postfix}`;
    },
  };
}
