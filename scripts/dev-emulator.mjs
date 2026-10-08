import { spawn } from "node:child_process";

const env = {
  ...process.env,
  VITE_FIREBASE_API_KEY: "demo-api-key",
  VITE_FIREBASE_AUTH_DOMAIN: "localhost",
  VITE_FIREBASE_PROJECT_ID: "demo-sorveteria",
  VITE_FIREBASE_STORAGE_BUCKET: "demo-sorveteria.appspot.com",
  VITE_FIREBASE_MESSAGING_SENDER_ID: "000000000000",
  VITE_FIREBASE_APP_ID: "1:000000000000:web:demo",
  VITE_PUBLIC_BASE_URL: "http://localhost:5173",
  VITE_USE_EMULATORS: "true",
};
const command = process.platform === "win32" ? "npm.cmd" : "npm";
const child = spawn(command, ["run", "dev", "--", "--host", "127.0.0.1"], { stdio: "inherit", env, shell: process.platform === "win32" });
child.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
