/** Prevent Vite hosted builds from silently connecting to local demo Firebase. */
export type FirebasePublicConfig = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
};
export function hostedFirebaseConfigurationProblems(
  hostedBuild: boolean,
  usingEmulators: boolean,
  configured: FirebasePublicConfig,
): string[] {
  if (!hostedBuild) return [];
  const problems: string[] = [];
  if (usingEmulators) problems.push("emulators-enabled");
  const values = [configured.apiKey, configured.authDomain, configured.projectId,
    configured.storageBucket, configured.messagingSenderId, configured.appId];
  if (values.some(value => typeof value !== "string" || value.trim().length === 0)) {
    problems.push("missing-public-firebase-config");
  }
  if (!configured.projectId || configured.projectId.startsWith("demo-")) problems.push("demo-project");
  if (!configured.apiKey || configured.apiKey === "demo-api-key") problems.push("demo-api-key");
  if (!configured.authDomain || /(?:localhost|127\.0\.0\.1|\.test)(?::\d+)?$/i.test(configured.authDomain)) {
    problems.push("local-auth-domain");
  }
  if (configured.messagingSenderId === "000000000000" || configured.appId?.includes("000000000000")) {
    problems.push("synthetic-app");
  }
  if (configured.storageBucket?.startsWith("demo-")) problems.push("demo-storage");
  return problems;
}
