import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "docs/versions/v06-multitenant-core-ready/screenshots");
const baseUrl = "http://127.0.0.1:5173";
const cdp = "http://127.0.0.1:9333";
const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const profileDir = path.join(os.tmpdir(), `sorveteria-doc-qa-${process.pid}`);
const password = "GelatoDev!2026";
let browser;
let ws;
let send;
let networkTrace = [];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitUntil(fn, label, timeout = 20000) {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    try { last = await fn(); if (last) return last; } catch { /* page may be loading */ }
    await sleep(300);
  }
  throw new Error(`Timeout aguardando ${label}. Última observação: ${String(last).slice(0, 200)}`);
}

async function waitForBrowser() {
  await waitUntil(async () => {
    try { const response = await fetch(`${cdp}/json/version`); return response.ok; } catch { return false; }
  }, "Edge CDP");
  return waitUntil(async () => {
    try {
      const response = await fetch(`${cdp}/json/list`);
      if (!response.ok) return false;
      const targets = await response.json();
      return targets.find((target) => target.type === "page" && target.url.startsWith(baseUrl)) || false;
    } catch { return false; }
  }, "aba Edge inicial");
}

function connectDebugger(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 0;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) {
      if (message.method === "Network.requestWillBeSent" && String(message.params?.request?.url).includes(":5001/")) {
        networkTrace.push({ event: "request", url: message.params.request.url, method: message.params.request.method });
      } else if (message.method === "Network.responseReceived" && String(message.params?.response?.url).includes(":5001/")) {
        networkTrace.push({ event: "response", url: message.params.response.url, status: message.params.response.status, headers: message.params.response.headers });
      } else if (message.method === "Network.loadingFailed") {
        networkTrace.push({ event: "failed", requestId: message.params?.requestId, error: message.params?.errorText, reason: message.params?.blockedReason, cors: message.params?.corsErrorStatus });
      }
      return;
    }
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(message.error.message));
    else waiter.resolve(message.result || {});
  });
  const opened = new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  async function send(method, params = {}) {
    await opened;
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (pending.has(id)) { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }
      }, 20000);
    });
  }
  return { ws, send };
}

async function evaluate(expression) {
  const response = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (response.result?.subtype === "error" || response.exceptionDetails) {
    throw new Error(response.exceptionDetails?.text || response.result?.description || "Erro de avaliação na página.");
  }
  return response.result?.value;
}

async function navigate(route) {
  await send("Page.navigate", { url: `${baseUrl}${route}` });
  await waitUntil(async () => {
    const state = await evaluate("JSON.stringify({ path: location.pathname, ready: document.readyState, text: document.body?.innerText || '' })");
    const current = JSON.parse(state);
    return current.path === route.split("?")[0] && current.ready === "complete" && current.text && !current.text.includes("Carregando…") ? current.text : false;
  }, `rota ${route}`);
  await sleep(700);
}

async function waitText(text, timeout = 15000) {
  try {
    return await waitUntil(async () => {
      const body = await evaluate("document.body?.innerText || ''");
      return body.toLocaleLowerCase("pt-BR").includes(text.toLocaleLowerCase("pt-BR")) ? body : false;
    }, `texto “${text}”`, timeout);
  } catch (error) {
    const state = await evaluate("JSON.stringify({ href: location.href, body: document.body?.innerText?.slice(0, 1600), buttons: [...document.querySelectorAll('button')].map((button) => button.innerText.trim()).filter(Boolean) })").catch(() => "estado indisponível");
    throw new Error(`${error instanceof Error ? error.message : String(error)}\nEstado do navegador: ${state}`);
  }
}

async function clickButton(text, selector = "button") {
  const expression = `(() => { const button = [...document.querySelectorAll(${JSON.stringify(selector)})].find((node) => (node.innerText || node.getAttribute('aria-label') || '').trim().includes(${JSON.stringify(text)})); if (!button) return false; button.click(); return true; })()`;
  if (!await evaluate(expression)) {
    const state = await evaluate("JSON.stringify({ body: document.body?.innerText?.slice(0, 1400), buttons: [...document.querySelectorAll('button')].map((button) => button.innerText.trim()).filter(Boolean) })");
    throw new Error(`Botão não encontrado: ${text}. Estado atual: ${state}`);
  }
}

async function setInput(selector, value) {
  const expression = `(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element) return false; const proto = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype; const setter = Object.getOwnPropertyDescriptor(proto, 'value').set; setter.call(element, ${JSON.stringify(value)}); element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`;
  if (!await evaluate(expression)) throw new Error(`Campo não encontrado: ${selector}`);
}

async function clickOrderButton(publicCode, text) {
  const expression = `(() => { const card = [...document.querySelectorAll('.order-card')].find((item) => item.innerText.includes(${JSON.stringify(publicCode)})); const button = [...(card?.querySelectorAll('button') || [])].find((node) => node.innerText.trim() === ${JSON.stringify(text)}); if (!button) return false; button.click(); return true; })()`;
  if (!await evaluate(expression)) throw new Error(`Ação “${text}” não encontrada para o pedido ${publicCode}.`);
}

async function clickTenantButton(tenantSlug, text) {
  const expression = `(() => { const row = [...document.querySelectorAll('.tenant-row')].find((item) => item.innerText.includes('/' + ${JSON.stringify(tenantSlug)})); const button = [...(row?.querySelectorAll('button') || [])].find((node) => node.innerText.trim() === ${JSON.stringify(text)}); if (!button) return false; button.click(); return true; })()`;
  if (!await evaluate(expression)) throw new Error(`Ação “${text}” não encontrada para ${tenantSlug}.`);
}

async function setOrderSelect(publicCode, selector, value) {
  const expression = `(() => { const card = [...document.querySelectorAll('.order-card')].find((item) => item.innerText.includes(${JSON.stringify(publicCode)})); const element = card?.querySelector(${JSON.stringify(selector)}); if (!element) return false; const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; setter.call(element, ${JSON.stringify(value)}); element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`;
  if (!await evaluate(expression)) throw new Error(`Campo de entrega não encontrado para o pedido ${publicCode}.`);
}

async function fillLabel(labelText, value) {
  const expression = `(() => { const label = [...document.querySelectorAll('label')].find((node) => node.innerText.trim().startsWith(${JSON.stringify(labelText)})); const input = label?.querySelector('input'); if (!input) return false; const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`;
  if (!await evaluate(expression)) throw new Error(`Campo de formulário não encontrado: ${labelText}`);
}

async function login(email, route) {
  await navigate(route);
  try {
    await waitUntil(async () => await evaluate("Boolean(document.querySelector('input[type=email]') && document.querySelector('input[type=password]'))"), "formulário de login", 30000);
  } catch (error) {
    const state = await evaluate("JSON.stringify({ href: location.href, ready: document.readyState, body: document.body?.innerText?.slice(0, 1400), inputs: [...document.querySelectorAll('input')].map((input) => ({ type: input.type, label: input.labels?.[0]?.innerText })) })").catch(() => "estado indisponível");
    throw new Error(`${error instanceof Error ? error.message : String(error)}\nEstado ao abrir login de ${email}: ${state}`);
  }
  await setInput("input[type=email]", email);
  await setInput("input[type=password]", password);
  await clickButton("Entrar");
  await sleep(1400);
}

async function capture(name, mobile = false) {
  if (mobile) await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  else await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await sleep(250);
  const metrics = await send("Page.getLayoutMetrics");
  const size = metrics.cssContentSize || metrics.contentSize;
  const width = Math.min(Math.max(size.width, mobile ? 390 : 1440), 2400);
  const height = Math.min(Math.max(size.height, mobile ? 844 : 1000), 9000);
  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, fromSurface: true, clip: { x: 0, y: 0, width, height, scale: 1 } });
  await writeFile(path.join(outputDir, name), Buffer.from(shot.data, "base64"));
  console.log(`Screenshot real capturada: ${name}`);
}

async function clearOrigin() {
  await send("Storage.clearDataForOrigin", { origin: baseUrl, storageTypes: "all" });
  await sleep(300);
  await navigate(`/?qa-reset=${Date.now()}`);
  await waitUntil(async () => await evaluate("(async () => { const request = indexedDB.open('firebaseLocalStorageDb'); const database = await new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); if (!database.objectStoreNames.contains('firebaseLocalStorage')) return true; const store = database.transaction('firebaseLocalStorage').objectStore('firebaseLocalStorage'); const query = store.getAll(); const rows = await new Promise((resolve, reject) => { query.onsuccess = () => resolve(query.result); query.onerror = () => reject(query.error); }); return rows.length === 0; })()"), "limpeza da sessão Auth", 15000);
}

try {
  await mkdir(outputDir, { recursive: true });
  browser = spawn(edge, [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage",
    "--remote-allow-origins=*", "--remote-debugging-port=9333", `--user-data-dir=${profileDir}`,
    `${baseUrl}/`,
  ], { stdio: "ignore", windowsHide: true });

  const target = await waitForBrowser();
  ({ ws, send } = connectDebugger(target.webSocketDebuggerUrl));
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  if (process.env.QA_DEBUG_DRIVER_ONLY === "1" || process.env.QA_DEBUG_OWNER_ONLY === "1" || process.env.QA_DEBUG_OWNER_STATUS_ONLY === "1" || process.env.QA_DEBUG_DRIVER_BOUNDARY_ONLY === "1") {
    const isOwnerStatusDebug = process.env.QA_DEBUG_OWNER_STATUS_ONLY === "1";
    const isOwnerDebug = process.env.QA_DEBUG_OWNER_ONLY === "1" || isOwnerStatusDebug;
    const isDriverBoundaryDebug = process.env.QA_DEBUG_DRIVER_BOUNDARY_ONLY === "1";
    await clearOrigin();
    await login(isOwnerDebug ? "owner.alpha@demo.sorveteria.test" : "driver.alpha@demo.sorveteria.test", isOwnerDebug ? "/tenant-alpha/painel" : "/tenant-alpha/painel/entregas");
    await sleep(2500);
    if (isOwnerStatusDebug) {
      const orderCode = process.env.QA_ORDER_CODE;
      if (!orderCode) throw new Error("QA_ORDER_CODE é obrigatório no modo QA_DEBUG_OWNER_STATUS_ONLY.");
      await waitText("Painel do negócio");
      await waitText(orderCode, 30000);
      for (const [buttonText, statusText] of [["Marcar: Confirmado", "Confirmado"], ["Marcar: Em preparo", "Em preparo"], ["Marcar: Pronto", "Pronto"]]) {
        await clickOrderButton(orderCode, buttonText);
        await waitUntil(async () => await evaluate(`(() => { const card = [...document.querySelectorAll('.order-card')].find((item) => item.innerText.includes(${JSON.stringify(orderCode)})); return Boolean(card && card.querySelector('.status-pill')?.innerText.trim() === ${JSON.stringify(statusText)}); })()`), statusText, 45000);
      }
      await setOrderSelect(orderCode, "select[aria-label=Entregador]", "driver-alpha");
      await clickOrderButton(orderCode, "Atribuir entrega");
      await waitUntil(async () => await evaluate(`(() => { const card = [...document.querySelectorAll('.order-card')].find((item) => item.innerText.includes(${JSON.stringify(orderCode)})); return Boolean(card && card.querySelector('.status-pill')?.innerText.trim() === "Aguardando entregador"); })()`), "Aguardando entregador", 45000);
      await capture("tenant-owner-pedidos.png");
      console.log(`QA Owner Alpha concluído para ${orderCode}: Confirmado → Em preparo → Pronto → Aguardando entregador.`);
    } else if (isDriverBoundaryDebug) {
      await waitText("Minhas entregas", 30000);
      await navigate("/tenant-beta/painel/entregas");
      await waitText("Seu acesso a esta sorveteria não está ativo.");
      await capture("driver-alpha-sem-acesso-a-beta.png");
      console.log("QA do Driver Alpha concluído: acesso a entregas Beta negado.");
    } else {
    const body = await evaluate("JSON.stringify({ href: location.href, body: document.body?.innerText?.slice(0, 1600), buttons: [...document.querySelectorAll('button')].map((button) => button.innerText.trim()).filter(Boolean) })");
    const identity = await evaluate("(async () => { const request = indexedDB.open('firebaseLocalStorageDb'); const database = await new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); const storeName = [...database.objectStoreNames].find((name) => name === 'firebaseLocalStorage'); if (!storeName) return JSON.stringify({ stores: [...database.objectStoreNames] }); const store = database.transaction(storeName).objectStore(storeName); const rows = await new Promise((resolve, reject) => { const query = store.getAll(); query.onsuccess = () => resolve(query.result); query.onerror = () => reject(query.error); }); return JSON.stringify(rows.map((row) => ({ key: row.fbase_key, uid: row.value?.uid, email: row.value?.email }))); })()");
    console.log(`Estado ${isOwnerDebug ? "Owner" : "Driver"}: ${body}\nUsuário Auth local: ${identity}`);
    }
  } else {
  await navigate("/");
  await capture("landing-saas.png");
  await navigate("/tenant-alpha/painel");
  try {
    await waitUntil(async () => await evaluate("Boolean(document.querySelector('input[type=email]') && document.querySelector('input[type=password]'))"), "login de cliente", 45000);
  } catch (error) {
    const state = await evaluate("JSON.stringify({ href: location.href, body: document.body?.innerText?.slice(0, 1400) })").catch(() => "estado indisponível");
    throw new Error(`${error instanceof Error ? error.message : String(error)}\nEstado ao abrir login de cliente: ${state}`);
  }
  await capture("login-tenant.png");
  await setInput("input[type=email]", "customer.alpha@demo.sorveteria.test");
  await setInput("input[type=password]", password);
  await clickButton("Entrar");
  await sleep(1400);
  await navigate("/tenant-alpha/");
  await waitText("Sorveteria Alpha");
  await capture("tenant-alpha-storefront-desktop.png");
  await capture("tenant-alpha-storefront-mobile.png", true);

  await navigate("/tenant-alpha/cardapio");
  await waitText("Monte seu pote");
  await capture("tenant-alpha-cardapio.png");
  await evaluate("(() => { const card = [...document.querySelectorAll('.menu-product-card')].find((item) => item.querySelector('h2')?.innerText.includes('Monte seu pote')); card?.querySelector('button')?.click(); return Boolean(card); })()");
  await waitText("Personalizar pedido");
  await capture("personalizacao-produto.png");
  await evaluate("[...document.querySelectorAll('.product-modal fieldset')].forEach((group) => { if (group.querySelector('legend small')?.innerText.includes('Escolha')) group.querySelector('input')?.click(); })");
  await clickButton("Adicionar ao carrinho", ".product-modal button");
  await waitText("adicionado ao carrinho");
  await navigate("/tenant-alpha/carrinho");
  await waitText("Seu carrinho");
  await capture("carrinho.png");
  await navigate("/tenant-alpha/checkout");
  await waitText("Finalizar pedido");
  await evaluate("document.querySelector('input[name=fulfillment][value=delivery]')?.click()");
  await fillLabel("Nome", "Cliente de demonstração");
  await fillLabel("Telefone", "11999990000");
  await fillLabel("Rua", "Rua de demonstração");
  await fillLabel("Número", "100");
  await fillLabel("Bairro", "Centro");
  await capture("checkout.png");
  await evaluate("document.querySelector('form.checkout-layout')?.requestSubmit()");
  try {
    await waitUntil(async () => await evaluate("Boolean(document.querySelector('.code-panel strong'))"), "confirmação do pedido", 120000);
  } catch (error) {
    console.error(`Estado do checkout após enviar: ${await evaluate("document.body?.innerText?.slice(-900) || ''")}`);
    console.error(`Rede Functions: ${JSON.stringify(networkTrace.slice(-30))}`);
    throw error;
  }
  const publicCode = await evaluate("document.querySelector('.code-panel strong')?.textContent?.trim() || ''");
  const deliveryCode = await evaluate("document.querySelector('.delivery-code-notice span')?.textContent?.trim() || ''");
  if (!publicCode || !deliveryCode) throw new Error("A confirmação do pedido não mostrou os códigos esperados.");
  await capture("confirmacao-pedido.png");
  await navigate(`/tenant-alpha/acompanhar?code=${encodeURIComponent(publicCode)}`);
  await clickButton("Ver pedido");
  await waitText("Pedido recebido");
  await capture("tracking-pedido.png");

  await clearOrigin();
  await login("owner.alpha@demo.sorveteria.test", "/tenant-alpha/painel");
  if (process.env.QA_TRACE_AUTH === "1") {
    const identity = await evaluate("(async () => { const request = indexedDB.open('firebaseLocalStorageDb'); const database = await new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); const store = database.transaction('firebaseLocalStorage').objectStore('firebaseLocalStorage'); const rows = await new Promise((resolve, reject) => { const query = store.getAll(); query.onsuccess = () => resolve(query.result); query.onerror = () => reject(query.error); }); return JSON.stringify(rows.map((row) => ({ uid: row.value?.uid, email: row.value?.email }))); })()");
    console.log(`Usuário após login Owner Alpha: ${identity}`);
  }
  await waitText("Painel do negócio");
  await waitText(publicCode, 30000);
  await capture("tenant-owner-pedidos.png");
  for (const status of ["Marcar: Confirmado", "Marcar: Em preparo", "Marcar: Pronto"]) {
    await clickOrderButton(publicCode, status);
    await waitUntil(async () => await evaluate(`(() => { const card = [...document.querySelectorAll('.order-card')].find((item) => item.innerText.includes(${JSON.stringify(publicCode)})); return Boolean(card && ![...card.querySelectorAll('button')].some((button) => button.innerText.trim() === ${JSON.stringify(status)})); })()`), status, 20000);
  }
  await setOrderSelect(publicCode, "select[aria-label=Entregador]", "driver-alpha");
  await clickOrderButton(publicCode, "Atribuir entrega");
  await waitText("Aguardando entregador", 20000);
  await clickButton("Catálogo", "[role=tab]");
  await waitText("Catálogo da loja");
  await capture("tenant-owner-catalogo.png");

  await clearOrigin();
  await login("driver.alpha@demo.sorveteria.test", "/tenant-alpha/painel/entregas");
  await waitText("Minhas entregas", 30000);
  await waitText(publicCode);
  await capture("driver-entrega-atribuida.png");
  await clickButton("Iniciar entrega");
  await waitText("Saiu para entrega");
  await clickButton("Cheguei ao endereço");
  await waitText("Código informado pelo cliente");
  await capture("driver-chegada.png");
  await setInput("input[autocomplete=one-time-code]", deliveryCode);
  await clickButton("Confirmar entrega");
  await waitText("Entrega concluída.", 20000);
  await capture("driver-entrega-concluida.png");
  await navigate("/tenant-beta/painel/entregas");
  await waitText("Seu acesso a esta sorveteria não está ativo.");
  await capture("driver-alpha-sem-acesso-a-beta.png");

  await clearOrigin();
  await login("owner.beta@demo.sorveteria.test", "/tenant-beta/painel");
  await waitText("Painel do negócio");
  await navigate("/tenant-alpha/painel");
  await waitText("Seu acesso a esta sorveteria não está ativo.");
  await capture("tenant-beta-sem-acesso-a-alpha.png");

  await clearOrigin();
  await login("platform@demo.sorveteria.test", "/admin");
  await waitText("Ecossistema de sorveterias");
  await waitText("tenant-alpha");
  await capture("platform-owner.png");
  await clickTenantButton("tenant-alpha", "Entrar no contexto");
  await waitText("Painel do negócio");
  await waitText("Voltar à plataforma");
  await capture("platform-owner-contexto-alpha.png");
  await clickButton("Voltar à plataforma");
  await waitText("Ecossistema de sorveterias");
  await clickTenantButton("tenant-beta", "Entrar no contexto");
  await waitText("Painel do negócio");
  await waitText("Voltar à plataforma");
  await capture("platform-owner-contexto-beta.png");
  await clickButton("Voltar à plataforma");
  await waitText("Ecossistema de sorveterias");
  await evaluate("window.prompt = () => 'QA local no Emulator Suite'");
  await clickButton("Suspender");
  await waitText("suspensa", 20000);
  await capture("platform-owner-tenant-suspenso.png");
  await evaluate("window.prompt = () => 'QA local no Emulator Suite'");
  await clickButton("Ativar");
  await waitText("ativa", 20000);
  await capture("platform-owner-tenant-reativado.png");
  console.log(`QA de navegador concluído para o pedido ${publicCode}: criação, tracking, operação do owner, entrega, RBAC e ciclo do Platform Owner.`);
  }
} finally {
  try { await send("Browser.close"); } catch { /* browser may already be closing */ }
  try { ws.close(); } catch { /* already closed */ }
  if (browser && !browser.killed) browser.kill();
  await sleep(500);
}
