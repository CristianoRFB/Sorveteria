import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const firebaseCli = resolve(projectRoot, "node_modules/firebase-tools/lib/bin/firebase.js");
const command = spawnSync(process.execPath, [
  firebaseCli,
  "emulators:exec",
  "--project", "demo-sorveteria",
  "--only", "auth,firestore,functions",
  "npm run seed:emulator && npm run test:integration:run",
], {
  cwd: projectRoot,
  stdio: "inherit",
  env: { ...process.env, FUNCTIONS_DISCOVERY_TIMEOUT: process.env.FUNCTIONS_DISCOVERY_TIMEOUT || "180" },
});

if (command.error) throw command.error;
process.exitCode = command.status ?? 1;
