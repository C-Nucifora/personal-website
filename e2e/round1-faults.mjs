/** Owner runs this under the shared heavy.lock. Uses existing out/, no server. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

process.umask(0o077);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = await realpath(join(root, "out"));
const base = new URL(process.env.BASE || "http://127.0.0.1:4319");
assert(base.protocol === "http:" && base.hostname === "127.0.0.1" &&
  base.pathname === "/" && !base.username && !base.password && !base.search && !base.hash,
"BASE must be a bare http://127.0.0.1 loopback origin; every response is intercepted");
const evidence = join(process.env.EVIDENCE || join(tmpdir(), "portfolio-round1-faults"),
  `run-${new Date().toISOString().replaceAll(":", "-")}-${process.pid}`);
await mkdir(evidence, { recursive: true, mode: 0o700 });
const save = (name, value) => writeFile(join(evidence, name), JSON.stringify(value, null, 2), { mode: 0o600 });
const mime = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css",
  ".json": "application/json", ".txt": "text/plain", ".woff2": "font/woff2",
  ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".pdf": "application/pdf" };
const chunks = await Promise.all((await readdir(join(out, "_next/static/chunks")))
  .filter((name) => name.endsWith(".js")).map(async (name) => ({
    path: `/_next/static/chunks/${name}`, body: await readFile(join(out, "_next/static/chunks", name), "utf8"),
  })));
const unique = (matches, name) => {
  assert.equal(matches.length, 1, `Expected one ${name} chunk in the existing export`);
  return matches[0];
};
// Match executable exports, not copies of source text shipped by the site's source browser.
const sourceChunk = unique(chunks.filter(({ body }) => /\.s\(\["githubSources",0,\{/.test(body)), "source");
const editorChunk = unique(chunks.filter(({ body }) => body.includes('"data-editor":')), "editor");
const marker = "ROUND1-SOURCE-SENTINEL";
const probe = "~/projects/m1-lsp/round1-probe.txt";
const directory = "~/projects/m1-lsp/src/round1";
const fixture = { "m1-lsp": {
  "round1-probe.txt": `${marker}\n${Array.from({ length: 90 }, (_, i) => `owned fixture line ${i + 1}`).join("\n")}`,
  "src/round1/probe.txt": marker,
} };
const sourcePrefix = sourceChunk.body.match(/^[\s\S]*?\.s\(\["githubSources",0,/);
assert(sourcePrefix && sourceChunk.body.trimEnd().endsWith("])}]);"), "Unsupported source export wrapper");
const syntheticSource = `${sourcePrefix[0]}${JSON.stringify(fixture)}])}]);`;
await save("inputs.json", {
  base: base.origin, transport: "Playwright route.fulfill from out; no socket server or route.continue",
  chunks: [sourceChunk, editorChunk].map(({ path, body }) => ({ path, sha256: createHash("sha256").update(body).digest("hex") })),
  fixture, chromium: process.env.CHROMIUM_PATH || "Playwright bundled Chromium",
});

const input = (page, key) => page.locator(`[data-window="${key}"] input[aria-label="Terminal command input"]`);
const pane = (page, key) => page.locator(`[data-window="${key}"] [data-pane-scroll]`);
const entries = (page, key) => page.locator(`[data-window="${key}"] [role="log"] [data-entry-id]`);
const logText = (page, key) => entries(page, key).allTextContents().then((lines) => lines.join("\n"));
const frames = (page) => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
async function focused(page, selector) {
  await page.waitForFunction((selector) => document.activeElement?.matches(selector), selector);
}
async function ready(page) {
  await page.goto(`${base.origin}/about/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('html[data-js-ready="true"]');
  await focused(page, '[data-window="about"] input');
}
async function at(page, key) {
  await page.waitForURL(`${base.origin}/${key}/`);
  await page.locator(`[data-window="${key}"]:not([aria-hidden])`).waitFor({ state: "visible" });
  await focused(page, `[data-window="${key}"] input`);
}
async function tab(page, key) {
  await page.locator('nav[aria-label="Sections"]').getByRole("button", { name: new RegExp(`:${key}$`) }).click();
  await at(page, key);
}
async function command(page, key, text) {
  await input(page, key).fill(text);
  await input(page, key).press("Enter");
}
async function output(page, key, text) {
  await page.waitForFunction(({ key, text }) => [...document.querySelectorAll(`[data-window="${key}"] [data-entry-id]`)]
    .some((node) => node.textContent.includes(text)), { key, text });
}
async function plain(page) {
  await page.getByRole("button", { name: "Switch to plain view", exact: true }).click();
  await page.waitForSelector('html[data-view="plain"]');
  await focused(page, "#main");
}
async function failedEditor(page) {
  await ready(page);
  await command(page, "about", "vim about.md");
  await page.getByRole("button", { name: "Return to shell", exact: true }).waitFor();
  assert(await page.locator('nav[aria-label="Sections"]').isVisible(), "Chunk failure removed navigation");
}
async function shellEscape(page) {
  await page.getByRole("button", { name: "Return to shell", exact: true }).click();
  await focused(page, '[data-window="about"] input');
  // Type directly after recovery so a fill/focus/click cannot hide a lost-focus defect.
  await page.keyboard.type("echo ROUND1-SHELL-RECOVERED");
  await page.keyboard.press("Enter");
  await output(page, "about", "ROUND1-SHELL-RECOVERED");
  assert((await entries(page, "about").allTextContents()).some((text) => text.trim() === "ROUND1-SHELL-RECOVERED"));
}

const cases = [
  { name: "editor-shell-and-document-recovery", fault: "editor", test: async (page, gate) => {
    await failedEditor(page);
    await shellEscape(page);
    gate.editorFailed = false;
    await ready(page); // Fresh document, no claim that React.lazy offers hot retry.
    await command(page, "about", "vim about.md");
    await page.locator('[data-editor="~/about/about.md"]').waitFor();
    await focused(page, ".cm-content");
    await page.keyboard.type(":q");
    await page.keyboard.press("Enter");
    await focused(page, '[data-window="about"] input');
  } },
  { name: "editor-plain-escape", fault: "editor", test: async (page) => {
    await failedEditor(page);
    await plain(page);
    await page.keyboard.press("Control+b");
    await page.keyboard.press("2");
    await frames(page);
    assert.equal(new URL(page.url()).pathname, "/about/", "Terminal bindings ran in plain view");
    assert(await page.locator("main > .static-fallback").isVisible());
    await page.getByRole("button", { name: "Back to the terminal", exact: true }).click();
    await page.waitForSelector('html:not([data-view="plain"])');
    await shellEscape(page);
  } },
  { name: "source-rejection-background-and-reload", fault: "source", test: async (page, gate) => {
    await ready(page);
    await tab(page, "projects");
    await gate.seen;
    await command(page, "projects", `cat ${probe}`);
    await tab(page, "contact");
    const before = await logText(page, "contact");
    gate.release("fail");
    await output(page, "projects", "Source unavailable offline");
    await focused(page, '[data-window="contact"] input');
    assert.equal(await logText(page, "contact"), before, "Rejected read leaked into the current shell");
    assert.equal((await entries(page, "projects").allTextContents()).filter((text) => text.includes(`cat ${probe}`)).length, 1);
    await plain(page);
    assert(await page.locator(".static-fallback #projects").isVisible(), "Source failure removed plain project summaries");
    gate.sourceMode = "pass";
    await page.evaluate(() => localStorage.removeItem("portfolio:view"));
    await ready(page);
    await command(page, "about", `cat ${probe}`);
    await output(page, "about", marker);
  } },
  ...["pass", "fail"].map((outcome) => ({ name: `pending-source-history-${outcome}`, fault: "source", test: async (page, gate) => {
    await ready(page);
    await tab(page, "projects");
    await gate.seen;
    await command(page, "projects", `cd ${directory}`);
    await page.goBack();
    await at(page, "about");
    await page.goForward();
    await at(page, "projects");
    await page.goBack();
    await at(page, "about");
    const before = await logText(page, "about");
    gate.release(outcome);
    await page.getByText(outcome === "pass"
      ? "Project sources loaded. Run the command again in your current shell."
      : "Source unavailable offline. Try the command again when connected.", { exact: true }).waitFor();
    await frames(page);
    assert.equal(new URL(page.url()).pathname, "/about/", "Deferred cd overrode browser history");
    assert.equal(await logText(page, "about"), before, "Deferred result changed the history destination shell");
    await focused(page, '[data-window="about"] input');
    assert(!(await logText(page, "projects")).includes(`cd ${directory}`), "Stale cd resumed after history navigation");
    await page.goForward();
    await at(page, "projects");
    assert(!(await page.locator("[data-title-bar]").innerText()).includes("/src/round1"));
    if (outcome === "pass") {
      await command(page, "projects", `cat ${probe}`);
      await output(page, "projects", marker);
    }
  } })),
  { name: "pending-source-plain-focus-and-scroll", fault: "source", test: async (page, gate) => {
    await ready(page);
    await tab(page, "projects");
    await gate.seen;
    await command(page, "projects", `cat ${probe}`);
    await plain(page);
    await page.mouse.move(700, 400);
    const initial = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 300);
    await page.waitForFunction((initial) => scrollY > initial, initial);
    await frames(page);
    const before = await page.evaluate(() => scrollY);
    gate.release("pass");
    await output(page, "projects", marker);
    await frames(page);
    assert.equal(await page.locator("html").getAttribute("data-view"), "plain");
    await focused(page, "#main");
    assert(Math.abs(await page.evaluate(() => scrollY) - before) <= 2, "Hidden source completion moved the plain reader");
    await page.getByRole("button", { name: "Back to the terminal", exact: true }).click();
    await focused(page, '[data-window="projects"] input');
    assert((await logText(page, "projects")).includes(marker));
  } },
  { name: "pending-source-reader-scroll", fault: "source", test: async (page, gate) => {
    await ready(page);
    await tab(page, "projects");
    await gate.seen;
    await command(page, "projects", `cat ${probe}`);
    await command(page, "projects", "cat ~/help/guide.md");
    await page.waitForFunction(() => {
      const pane = document.querySelector('[data-window="projects"] [data-pane-scroll]');
      return pane.scrollHeight > pane.clientHeight + 400;
    });
    const box = await pane(page, "projects").boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const initial = await pane(page, "projects").evaluate((node) => node.scrollTop);
    await page.mouse.wheel(0, 500);
    await page.waitForFunction((initial) => document.querySelector('[data-window="projects"] [data-pane-scroll]').scrollTop > initial, initial);
    const lower = await pane(page, "projects").evaluate((node) => node.scrollTop);
    await page.mouse.wheel(0, -350);
    await page.waitForFunction((lower) => {
      const pane = document.querySelector('[data-window="projects"] [data-pane-scroll]');
      return pane.scrollTop > 0 && pane.scrollTop < lower && pane.scrollTop + pane.clientHeight < pane.scrollHeight - 80;
    }, lower);
    await frames(page);
    const before = await pane(page, "projects").evaluate((node) => node.scrollTop);
    gate.release("pass");
    await output(page, "projects", marker);
    await page.getByRole("button", { name: "↓ new output", exact: true }).waitFor();
    await frames(page);
    const after = await pane(page, "projects").evaluate((node) => node.scrollTop);
    assert(Math.abs(after - before) <= 2, `Deferred output moved the reader from ${before} to ${after}`);
    await focused(page, '[data-window="projects"] input');
    await page.getByRole("button", { name: "↓ new output", exact: true }).click();
    assert(await pane(page, "projects").evaluate((node) => node.scrollTop + node.clientHeight >= node.scrollHeight - 2));
  } },
];

let browser;
let stopped = false;
const results = cases.map(({ name }) => ({ name, status: "unexecuted" }));
const stop = () => { stopped = true; process.exitCode = 1; void browser?.close(); };
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
const deadline = setTimeout(stop, 150_000);
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    headless: true, timeout: 10_000,
  });
  for (const [index, spec] of cases.entries()) {
    if (stopped) break;
    const events = [];
    const injections = [];
    let phase = "exercise";
    let markSeen;
    let release;
    const gate = { editorFailed: spec.fault === "editor", sourceMode: spec.fault === "source" ? "hold" : "pass",
      seen: new Promise((done) => { markSeen = done; }), release: (mode) => { gate.sourceMode = mode; release(); } };
    const held = new Promise((done) => { release = done; });
    const context = await browser.newContext({ serviceWorkers: "block", reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    page.setDefaultNavigationTimeout(8000);
    const faulted = new Set();
    const record = (kind, detail, url = "") => {
      const designed = [...faulted].some((path) => (detail.includes(path) || url.includes(path)) &&
        /Failed to load chunk|ChunkLoadError|Failed to load resource|net::ERR_|Loading chunk/i.test(detail));
      events.push({ kind, detail, url, designed, phase });
    };
    page.on("console", (message) => { if (message.type() === "error") record("console", message.text(), message.location().url); });
    page.on("pageerror", (error) => record("pageerror", error.stack || error.message));
    context.on("requestfailed", (request) => record("requestfailed", request.failure()?.errorText || "unknown failure", request.url()));
    await context.routeWebSocket("**/*", (socket) => { events.push({ kind: "blocked-websocket", url: socket.url(), phase }); socket.close(); });
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== base.origin) {
        events.push({ kind: "blocked-nonlocal", url: url.href, phase });
        return route.abort("blockedbyclient");
      }
      try {
        if (url.pathname === sourceChunk.path) {
          injections.push({ chunk: "source", action: gate.sourceMode, phase });
          markSeen();
          if (gate.sourceMode === "hold") await held;
          injections.push({ chunk: "source", action: gate.sourceMode === "fail" ? "abort" : "synthetic-response", phase });
          if (gate.sourceMode === "fail") {
            faulted.add(sourceChunk.path);
            return await route.abort("failed");
          }
          return await route.fulfill({ contentType: "application/javascript", body: syntheticSource });
        }
        if (url.pathname === editorChunk.path && gate.editorFailed) {
          injections.push({ chunk: "editor", action: "abort", phase });
          faulted.add(editorChunk.path);
          return await route.abort("failed");
        }
        const path = decodeURIComponent(url.pathname);
        assert(!path.includes("\0") && !path.includes("\\"), "Invalid fixture path");
        const file = await realpath(resolve(out, `.${path.endsWith("/") ? `${path}index.html` : path}`));
        assert(file.startsWith(out + sep), "Fixture path escaped out/");
        await route.fulfill({ contentType: mime[extname(file)] || "application/octet-stream", body: await readFile(file) });
      } catch (error) {
        if (!stopped && !page.isClosed()) events.push({ kind: "fixture-error", url: url.href, detail: String(error), phase });
        await route.abort("failed").catch(() => {});
      }
    });
    let caseDeadline;
    try {
      await context.tracing.start({ screenshots: true, snapshots: true });
      await Promise.race([spec.test(page, gate), new Promise((_, reject) => {
        caseDeadline = setTimeout(() => reject(new Error("Case exceeded 20 second bound")), 20_000);
      })]);
      await frames(page);
      assert(faulted.size || spec.fault === "source", "Editor failure was not injected");
      assert(spec.fault !== "source" || injections.some((item) => item.action === "hold"), "Source request was not held");
      assert(!events.some((event) => !event.designed), "Unexpected browser/network observations; inspect events");
      results[index].status = "passed";
    } catch (error) {
      results[index].status = "failed";
      results[index].error = error.stack || String(error);
      process.exitCode = 1;
    } finally {
      clearTimeout(caseDeadline);
      await page.screenshot({ path: join(evidence, `${spec.name}.png`) }).catch(() => {});
      await context.tracing.stop({ path: join(evidence, `${spec.name}.zip`) }).catch(() => {});
      if (results[index].status === "passed" && events.some((event) => !event.designed)) {
        results[index].status = "failed";
        results[index].error = "Unexpected browser/network observation while collecting evidence";
        process.exitCode = 1;
      }
      phase = "teardown";
      release();
      await context.close().catch(() => {});
      await save(`${spec.name}.json`, { ...results[index], faulted: [...faulted], injections, events });
      await save("results.json", results);
    }
  }
} finally {
  clearTimeout(deadline);
  await browser?.close();
  await save("results.json", results);
  console.log(JSON.stringify({ evidence, results }, null, 2));
}
