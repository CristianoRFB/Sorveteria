export function createQaNetworkTrace(now = () => Date.now()) {
  const pending = new Map();
  const records = [];
  function append(x) { records.push(x); if (records.length > 300) records.shift(); }
  function target(url) {
    try {
      const parsed = new URL(url);
      if (!["localhost","127.0.0.1","[::1]"].includes(parsed.hostname)) return null;
      return parsed.port === "8088" ? "firestore" : parsed.port === "5001" ? "functions" : null;
    } catch { return null; }
  }
  function observe(method, params = {}) {
    const id = params.requestId;
    if (method === "Network.requestWillBeSent") {
      const service = target(params.request?.url);
      if (!id || !service) return;
      pending.set(id, { service, start: now() });
      append({ event: "request", service });
    } else if (method === "Network.responseReceived") {
      const old = pending.get(id);
      if (old) append({ event: "response", service: old.service, status: params.response?.status ?? null, elapsedMs: Math.max(0, now() - old.start) });
    } else if (method === "Network.loadingFailed") {
      const old = pending.get(id);
      if (old) append({ event: "failed", service: old.service, elapsedMs: Math.max(0, now() - old.start), blocked: Boolean(params.blockedReason), cors: Boolean(params.corsErrorStatus), cancelled: params.canceled === true });
      pending.delete(id);
    } else if (method === "Network.loadingFinished") {
      pending.delete(id);
    }
  }
  return {
    observe,
    events: () => records.slice(),
    summary: () => ({ functions: records.filter(e => e.service === "functions").length, firestore: records.filter(e => e.service === "firestore").length, failed: records.filter(e => e.event === "failed").length, inflight: pending.size }),
  };
}
