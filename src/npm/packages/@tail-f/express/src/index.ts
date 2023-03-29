export const todo = true;
// import { ActualTracker, bootstrap, ScriptHost } from "@tail-f/server";
// import * as dotenv from "dotenv";
// import { expand } from "dotenv-expand";
// import express from "express";
// import * as fs from "fs/promises";
// import * as https from "https";

// expand(dotenv.config());

// const env = process.env as Record<
//   "PRIVATE_KEY" | "CERTIFICATE" | "PORT" | "DATA" | "SCHEMA",
//   string
// >;
// (async () => {
//   const host: ScriptHost = {
//     serialize: false,
//     marshalObject: (value) => value,
//     restart: () => {},
//     readData: async (path, handler) => {
//       return (await fs.readFile(`${env.DATA}/path`)).buffer;
//     },
//   };

//   const requestHandler = bootstrap({
//     host,

//     schemata: [
//       { name: "default", json: await fs.readFile(env.SCHEMA, "utf-8") },
//     ],
//     backends: [],
//     extensions: [],
//   });

//   await requestHandler.initialize();

//   const app = express();

//   const server = https
//     .createServer(
//       {
//         key: await fs.readFile(env.PRIVATE_KEY),
//         cert: await fs.readFile(env.CERTIFICATE),
//       },
//       app
//     )
//     .listen(parseInt(env.PORT), () => {
//       console.log("~$ tail -f in_da.house");
//     });

//   app.use((req, res, next) => {
//     (async () => {
//       try {
//         const tracker = new ActualTracker({ requestHandler });
//         const command = await requestHandler.processRequest(
//           tracker,
//           req.method,
//           req.path,
//           req.body
//         );

//         if (command?.["file"]) {
//           const script = await fs.readFile(`res/${command["file"]}`, "utf-8");
//           if (!script) {
//             res.status(404).send("Not found.");
//           } else {
//             res
//               .status(200)
//               .setHeader("content-type", "text/javascript")
//               .send(script);
//           }
//         }
//       } catch (e) {
//         res.status(500).send(e?.toString());
//       }
//     })();
//   });

//   app.get("*", (req, res) => {
//     res.send("Hello World!");
//   });
// })();
