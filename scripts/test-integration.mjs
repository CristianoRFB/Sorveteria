import { spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const firebaseCli = resolve(projectRoot, "node_modules/firebase-tools/lib/bin/firebase.js");
const firebaseConfigPath = resolve(projectRoot, `.firebase.integration.${process.pid}.json`);

async function allocatePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Não foi possível reservar uma porta local para o Emulator Suite."));
        return;
      }
      server.close((error) => error ? reject(error) : resolvePort(address.port));
    });
  });
}

const ports = Object.fromEntries(await Promise.all(
  ["auth", "firestore", "functions", "firestoreWebsocket", "hub", "logging", "eventarc", "tasks"]
    .map(async (name) => [name, await allocatePort()]),
));
const baseConfig = JSON.parse(await readFile(resolve(projectRoot, "firebase.json"), "utf8"));
baseConfig.emulators = {
  auth: { host: "127.0.0.1", port: ports.auth },
  firestore: { host: "127.0.0.1", port: ports.firestore, websocketPort: ports.firestoreWebsocket },
  functions: { host: "127.0.0.1", port: ports.functions },
  eventarc: { host: "127.0.0.1", port: ports.eventarc },
  tasks: { host: "127.0.0.1", port: ports.tasks },
  hub: { host: "127.0.0.1", port: ports.hub },
  logging: { host: "127.0.0.1", port: ports.logging },
  ui: { enabled: false },
};
await writeFile(firebaseConfigPath, JSON.stringify(baseConfig, null, 2));

let command;
try {
  command = spawnSync(process.execPath, [
    firebaseCli,
    "emulators:exec",
    "--config", firebaseConfigPath,
    "--project", "demo-sorveteria",
    "--only", "auth,firestore,functions",
    "npm run seed:emulator && npm run test:integration:run",
  ], {
    cwd: projectRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      FUNCTIONS_DISCOVERY_TIMEOUT: process.env.FUNCTIONS_DISCOVERY_TIMEOUT || "180",
      SORVETERIA_AUTH_EMULATOR_HOST: `127.0.0.1:${ports.auth}`,
      SORVETERIA_FIRESTORE_EMULATOR_HOST: `127.0.0.1:${ports.firestore}`,
      SORVETERIA_FUNCTIONS_EMULATOR_HOST: `127.0.0.1:${ports.functions}`,
    },
  });
} finally {
  await unlink(firebaseConfigPath).catch(() => undefined);
}

if (command.error) throw command.error;
process.exitCode = command.status ?? 1;
