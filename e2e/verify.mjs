/**
 * End-to-end verification of the FLOW.md interaction model.
 * Run against a server of the static export (or `next dev`):
 *   npm run build && (cd out && python3 -m http.server 3000) & BASE=http://127.0.0.1:3000 node e2e/verify.mjs
 */
import { chromium, devices } from "playwright";

const BASE = process.env.BASE || "http://127.0.0.1:3000";
const EMAIL = "cgnucifora@proton.me";
const results = [];
const ok = (n, c, extra = "") => results.push({ n, pass: !!c, extra });

const ANIM = 650; // click → type-on (≤250ms) → beat → execute, with margin

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

  // textContent, not innerText: panes hidden with visibility (and text under
  // CSS text-transform) must still be inspectable.
  const paneText = (key) =>
    page.$eval(`[data-window="${key}"]`, (e) => e.textContent ?? "").catch(() => "");
  const activeInput = (key) => page.locator(`[data-window="${key}"] input`);
  const run = async (key, cmd) => {
    await activeInput(key).fill(cmd);
    await activeInput(key).press("Enter");
    await page.waitForTimeout(160);
  };
  const clickTab = async (label) => {
    await page.click(`nav[aria-label="Sections"] >> text="${label}"`);
    await page.waitForTimeout(ANIM);
  };
  const titleCwd = async () =>
    (await page.$eval("p[suppresshydrationwarning], p.flex-1", (e) => e.innerText).catch(() => "")) ||
    (await page.locator("p", { hasText: "visitor@" }).first().innerText());

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector('html[data-js-ready="true"]', { timeout: 5000 });
  await page.waitForTimeout(900); // MOTD type-on

  // ---- Lobby MOTD (FLOW §4)
  const lobby = await paneText("lobby");
  ok("MOTD: last login line", lobby.toLowerCase().includes("last login:"));
  ok("MOTD: neofetch card", /Host/.test(lobby) && /Shell/.test(lobby));
  ok("MOTD: clickable try hints", lobby.includes("try:") && lobby.includes("cd about"));
  ok("MOTD: human nav sentence", lobby.includes("No command line needed"));
  await page.screenshot({ path: "/tmp/e2e-lobby.png" });

  // ---- ls is a clickable menu (§3.1)
  await run("lobby", "ls");
  ok("ls lists the five window dirs", /about\/[\s\S]*projects\/[\s\S]*help\//.test(await paneText("lobby")));
  ok("blog window dormant: no dir in ls", !(await paneText("lobby")).includes("blog/"));
  ok(
    "blog window dormant: no tab",
    (await page.locator('nav[aria-label="Sections"] >> text="blog"').count()) === 0,
  );

  // ---- Tab click animates the real command (§5)
  await clickTab("projects");
  ok("tab click echoes cd in the origin pane", (await paneText("lobby")).includes("cd ~/projects"));
  ok("tab click switches the URL", page.url().endsWith("/projects/"));
  const proj = await paneText("projects");
  ok("first entry auto-runs ls (§2.1)", proj.includes("$ ls") || /ls\n/.test(proj));
  ok("projects listing rendered", proj.includes("terminal-portfolio"));

  // ---- cwd preservation across switches (§2.1)
  await run("projects", "cd terminal-portfolio");
  await clickTab("resume");
  ok("resume auto-displays content", (await paneText("resume")).includes("Experience"));
  await clickTab("projects");
  ok("window switch preserved deep cwd", (await titleCwd()).includes("~/projects/terminal-portfolio"));

  // ---- back/forward map to window switches (§4)
  await page.goBack();
  await page.waitForTimeout(250);
  ok("back returns to the previous window", page.url().endsWith("/resume/"));
  await page.goForward();
  await page.waitForTimeout(250);
  ok("forward returns again", page.url().endsWith("/projects/"));

  // ---- section-word safety net (§9)
  await run("projects", "about");
  const safety = await paneText("projects");
  ok("bare section word gets did-you-mean", safety.includes("command not found: about") && safety.includes("cd ~/about"));
  await page.click(`[data-window="projects"] >> role=button[name="cd ~/about"]`);
  await page.waitForTimeout(ANIM);
  ok("clicking the suggestion navigates", page.url().endsWith("/about/"));

  // ---- clickable file names run cat (§3.1)
  await run("about", "ls");
  await page.click(`[data-window="about"] >> role=button[name="uses.md"]`);
  await page.waitForTimeout(ANIM);
  const about = await paneText("about");
  ok("clicking a file echoes cat", about.includes("cat uses.md"));
  ok("cat rendered the file", about.includes("Editor & terminal"));

  // ---- contact relocation: socials + homelab live in contact.md
  await run("about", "cat ~/contact/contact.md");
  const contactOut = await paneText("about");
  ok("contact.md carries the email", contactOut.includes(EMAIL));
  ok("contact.md carries the homelab link", contactOut.toLowerCase().includes("homelab"));
  ok(
    "no contact form while unconfigured (dormant default)",
    (await page.locator('[data-window="about"] form, .static-fallback form').count()) === 0,
  );
  await run("about", "mail");
  ok("mail without an endpoint answers with the email", (await paneText("about")).includes(EMAIL));

  // ---- tree (§9)
  await run("about", "tree ~");
  ok("tree prints a clickable tree", (await paneText("about")).includes("└──"));

  // ---- help ends with the full guide pointer (§9)
  await run("about", "help");
  ok("help shows the cheatsheet", (await paneText("about")).includes("Commands"));
  await page.click(`[data-window="about"] >> role=button[name="cd ~/help"]`);
  await page.waitForTimeout(ANIM);
  ok("full guide link opens help window", page.url().endsWith("/help/"));
  ok("help window auto-cats the guide", (await paneText("help")).includes("Guide"));

  // ---- theme: command and dropdown both echo (§10.1)
  await run("help", "theme dracula");
  ok("theme command applies", (await page.getAttribute("html", "data-theme")) === "dracula");
  await page.selectOption("select", "nord");
  await page.waitForTimeout(ANIM);
  ok("dropdown echoes the command", (await paneText("help")).includes("theme nord"));
  ok("dropdown applies the theme", (await page.getAttribute("html", "data-theme")) === "nord");

  // ---- open confirm in the status bar (§10.2)
  await run("help", "open https://example.com");
  ok("open asks y/n in the status bar", (await page.innerText("body")).includes("open https://example.com? y/n"));
  await page.keyboard.press("n");
  await page.waitForTimeout(120);
  ok("n cancels the confirm", !(await page.innerText("body")).includes("y/n"));

  // ---- Ctrl+b window jump (§7.2)
  await page.keyboard.press("Control+b");
  await page.keyboard.press("2");
  await page.waitForTimeout(250);
  ok("Ctrl+b 2 jumps to projects", page.url().endsWith("/projects/"));

  // ---- history seed (EASTER_EGGS §4.1)
  await run("projects", "history");
  ok("history is seeded with vim resume.md", (await paneText("projects")).includes("vim resume.md"));

  // ---- clear
  await run("projects", "clear");
  const cleared = await paneText("projects");
  ok("clear wipes the pane", !cleared.includes("history") && !cleared.includes("ls"));

  // ---- vim NORMAL mode on the command line (§6.2)
  await activeInput("projects").fill("echo delete me");
  await activeInput("projects").press("Escape");
  await page.waitForTimeout(100);
  ok("Esc enters NORMAL mode", (await page.innerText("body")).includes("-- NORMAL --"));
  await page.keyboard.press("d");
  await page.keyboard.press("d");
  await page.keyboard.press("i");
  await page.waitForTimeout(100);
  ok("dd clears the line, i returns to INSERT", (await page.innerText("body")).includes("-- INSERT --"));
  ok("buffer empty after dd", (await activeInput("projects").inputValue()) === "");

  // ---- read-only vim viewer (§8.1)
  await activeInput("projects").fill("vim ~/projects/terminal-portfolio/src/lib/vim/motions.ts");
  await activeInput("projects").press("Enter");
  await page.waitForSelector("[data-editor]", { timeout: 8000 });
  ok("vim opens the editor", true);
  ok("statusline shows RO", (await paneText("projects")).includes("[RO]"));
  ok("EDITOR [RO] in the status bar", (await page.innerText("body")).includes("EDITOR [RO]"));
  await page.locator(".cm-content").click();
  await page.keyboard.press("i");
  await page.waitForTimeout(150);
  ok("edit attempt gets E21", (await paneText("projects")).includes("E21: Cannot make changes"));
  await page.keyboard.press(":");
  await page.keyboard.type("help 42");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  ok(":help 42 answers", (await paneText("projects")).includes("usr_42.txt"));
  // tmux interop: window switch keeps the file open
  await page.keyboard.press("Control+b");
  await page.keyboard.press("1");
  await page.waitForTimeout(300);
  await page.keyboard.press("Control+b");
  await page.keyboard.press("2");
  await page.waitForTimeout(300);
  ok("open file survives window switches", (await page.locator("[data-editor]").count()) === 1);
  await page.locator(".cm-content").click();
  await page.keyboard.press(":");
  await page.keyboard.type("q");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(250);
  ok(":q returns the pane to its shell", (await page.locator("[data-editor]").count()) === 0);
  ok(
    "scrollback intact after :q",
    (await paneText("projects")).includes("vim ~/projects/terminal-portfolio"),
  );

  // ---- language intelligence (FLOW §8.2, tier 2)
  await activeInput("projects").fill("vim ~/projects/terminal-portfolio/src/lib/terminal/routing.ts");
  await activeInput("projects").press("Enter");
  await page.waitForSelector("[data-editor]", { timeout: 8000 });
  await page.locator(".cm-content").click();
  await page.keyboard.press("/");
  await page.keyboard.type("initRouting");
  await page.keyboard.press("Enter");
  // The TS worker lazy-loads and parses the lib bundle; poll K until ready.
  let hoverOk = false;
  for (let i = 0; i < 30 && !hoverOk; i++) {
    await page.keyboard.press("K");
    await page.waitForTimeout(700);
    hoverOk = (await page.locator(".cm-intel-hover").count()) > 0;
  }
  ok("K shows a hover tooltip", hoverOk);
  ok(
    "hover names the symbol under the cursor",
    hoverOk && (await page.locator(".cm-intel-hover").innerText()).includes("initRouting"),
  );

  await page.keyboard.press("/");
  await page.keyboard.type("ACTIVE_WINDOW_IDS");
  await page.keyboard.press("Enter");
  await page.keyboard.press("g");
  await page.keyboard.press("d");
  await page.waitForSelector('[data-editor*="vfs/types.ts"]', { timeout: 10000 });
  ok("gd jumps across files to the definition", true);
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+o");
  await page.waitForSelector('[data-editor*="terminal/routing.ts"]', { timeout: 10000 });
  ok("Ctrl+o returns along the jumplist", true);

  await page.locator(".cm-content").click();
  await page.keyboard.press(":");
  await page.keyboard.type("symbols");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(600);
  ok(":symbols prints the outline", (await paneText("projects")).includes("document symbols"));

  await page.keyboard.press(":");
  await page.keyboard.type("q");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  ok("intel session closes cleanly", (await page.locator("[data-editor]").count()) === 0);

  // ---- web-stack intelligence (css, FLOW §8.2 tier 2)
  await activeInput("projects").fill("vim ~/projects/terminal-portfolio/src/app/globals.css");
  await activeInput("projects").press("Enter");
  await page.waitForSelector('[data-editor*="globals.css"]', { timeout: 8000 });
  await page.locator(".cm-content").click();
  await page.keyboard.press("/");
  await page.keyboard.type("display");
  await page.keyboard.press("Enter");
  let cssHover = false;
  for (let i = 0; i < 15 && !cssHover; i++) {
    await page.keyboard.press("K");
    await page.waitForTimeout(500);
    cssHover = (await page.locator(".cm-intel-hover").count()) > 0;
  }
  ok("css hover answers from the web worker", cssHover);
  await page.keyboard.press(":");
  await page.keyboard.type("q");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);

  // ---- tier-3 data intelligence (yaml, FLOW §8.2)
  await activeInput("projects").fill("vim ~/projects/terminal-portfolio/src/.github/workflows/ci.yml");
  await activeInput("projects").press("Enter");
  await page.waitForSelector('[data-editor*="ci.yml"]', { timeout: 8000 });
  await page.locator(".cm-content").click();
  let yamlSyms = false;
  for (let i = 0; i < 15 && !yamlSyms; i++) {
    await page.keyboard.press(":");
    await page.keyboard.type("symbols");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);
    yamlSyms = (await paneText("projects")).includes("jobs");
  }
  ok("yaml :symbols lists top-level keys", yamlSyms);
  await page.keyboard.press(":");
  await page.keyboard.type("q");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);

  // ---- tmux clock (EASTER_EGGS §3)
  await page.keyboard.press("Control+b");
  await page.keyboard.press("t");
  await page.waitForTimeout(200);
  ok("Ctrl+b t shows the clock", (await page.locator("[aria-label^=Clock]").count()) === 1);
  await page.keyboard.press("x");
  await page.waitForTimeout(150);
  ok("any key dismisses the clock", (await page.locator("[aria-label^=Clock]").count()) === 0);

  // ---- COPY mode (§6.3)
  await page.keyboard.press("Control+b");
  await page.keyboard.press("[");
  await page.waitForTimeout(100);
  ok("Ctrl+b [ enters COPY mode", (await page.innerText("body")).includes("-- COPY --"));
  await page.keyboard.press("q");
  await page.waitForTimeout(100);
  ok("q leaves COPY mode", (await page.innerText("body")).includes("-- INSERT --"));

  // ---- the disintegration destroys nothing (EASTER_EGGS §4.2)
  const preRm = await paneText("projects");
  await activeInput("projects").fill("rm -rf / --no-preserve-root");
  await activeInput("projects").press("Enter");
  await page.waitForTimeout(700);
  ok("disintegration crumbles the chrome", (await page.locator(".disintegrating").count()) === 1);
  await page.waitForTimeout(8500); // crumble + black + BIOS + handoff
  ok("disintegration ends by itself", (await page.locator(".disintegrating").count()) === 0);
  const postRm = await paneText("projects");
  ok("state fully restored after the boot", postRm.startsWith(preRm.slice(0, 40)));
  ok("the rm itself is in scrollback like any command", postRm.includes("rm -rf / --no-preserve-root"));

  // ---- deep link (§4)
  await page.goto(BASE + "/contact/", { waitUntil: "networkidle" });
  await page.waitForSelector('html[data-js-ready="true"]');
  await page.waitForTimeout(900);
  const deep = await paneText("contact");
  ok("deep link prints the MOTD above", deep.toLowerCase().includes("last login:"));
  ok("deep link echoes the cd", deep.includes("cd ~/contact"));
  ok("deep link auto-displays content", deep.includes(EMAIL));

  // ---- blog route absent while dormant (spec 2026-06-12)
  ok(
    "blog route 404s while dormant",
    (await page.request.get(BASE + "/blog/")).status() === 404,
  );

  // ---- static fallback in raw HTML (non-negotiable #5)
  const raw = await (await page.request.get(BASE + "/resume/")).text();
  ok("static fallback ships resume content without JS", raw.includes("static-fallback") && raw.includes("Experience"));

  // ---- welcome strip + plain view (recruiter mode, FLOW §3.4)
  const wsCtx = await browser.newContext();
  const wsPage = await wsCtx.newPage();
  await wsPage.goto(BASE, { waitUntil: "networkidle" });
  await wsPage.waitForSelector('html[data-js-ready="true"]');
  await wsPage.waitForTimeout(900);
  ok("welcome strip shows on first visit", await wsPage.isVisible('[role="note"][aria-label="Welcome"]'));
  await wsPage.click('[aria-label="Dismiss welcome message"]');
  await wsPage.waitForTimeout(120);
  ok("dismiss hides the strip", !(await wsPage.isVisible('[role="note"][aria-label="Welcome"]')));
  await wsPage.reload({ waitUntil: "networkidle" });
  await wsPage.waitForSelector('html[data-js-ready="true"]');
  await wsPage.waitForTimeout(900);
  ok("dismissal persists across reloads", !(await wsPage.isVisible('[role="note"][aria-label="Welcome"]')));

  ok("terminal visible before plain view", await wsPage.isVisible("[data-terminal-root]"));
  await wsPage.click('button[title="plain"]'); // title-bar "plain view" button
  await wsPage.waitForTimeout(ANIM);
  ok("plain view reveals the static content", await wsPage.isVisible(".static-fallback"));
  ok("plain view hides the terminal", !(await wsPage.isVisible("[data-terminal-root]")));
  await wsPage.reload({ waitUntil: "networkidle" });
  await wsPage.waitForSelector('html[data-js-ready="true"]');
  await wsPage.waitForTimeout(300);
  ok("plain view persists across reloads", await wsPage.isVisible(".static-fallback"));
  await wsPage.click('button:has-text("Back to the terminal")');
  await wsPage.waitForTimeout(300);
  ok("back button returns to the terminal", await wsPage.isVisible("[data-terminal-root]"));
  await wsCtx.close();

  // ---- ?plain=1 deep link (the recruiter URL)
  const plCtx = await browser.newContext();
  const plPage = await plCtx.newPage();
  await plPage.goto(BASE + "/?plain=1", { waitUntil: "networkidle" });
  await plPage.waitForSelector('html[data-js-ready="true"]');
  await plPage.waitForTimeout(300);
  ok("?plain=1 lands in plain view", await plPage.isVisible(".static-fallback"));
  ok("?plain=1 hides the terminal", !(await plPage.isVisible("[data-terminal-root]")));
  await plCtx.close();

  // ---- title-bar resume shortcut
  await page.click('button[title="cd ~/resume"]');
  await page.waitForTimeout(ANIM);
  ok("title-bar resume button navigates", page.url().endsWith("/resume/"));

  // ---- reduced motion: instant echo, no animation (§5)
  const rmCtx = await browser.newContext({ reducedMotion: "reduce" });
  const rmPage = await rmCtx.newPage();
  await rmPage.goto(BASE, { waitUntil: "networkidle" });
  await rmPage.waitForSelector('html[data-js-ready="true"]');
  await rmPage.waitForTimeout(300);
  await rmPage.click(`nav[aria-label="Sections"] >> text="about"`);
  await rmPage.waitForTimeout(120); // well under animation time
  ok("reduced motion executes instantly", (await rmPage.$eval('[data-window="lobby"]', (e) => e.textContent)).includes("cd ~/about"));
  await rmCtx.close();

  // ---- mobile: tabs carry navigation (§11)
  const mob = await browser.newContext({ ...devices["Pixel 5"] });
  const mobPage = await mob.newPage();
  await mobPage.goto(BASE, { waitUntil: "networkidle" });
  await mobPage.waitForSelector('html[data-js-ready="true"]');
  await mobPage.waitForTimeout(900);
  ok("mobile shows the tab bar", await mobPage.isVisible('nav[aria-label="Sections"]'));
  await mobPage.click(`nav[aria-label="Sections"] >> text="resume"`);
  await mobPage.waitForTimeout(ANIM);
  ok("mobile tab tap navigates", mobPage.url().endsWith("/resume/"));
  ok(
    "mobile resume content renders",
    (await mobPage.$eval('[data-window="resume"]', (e) => e.textContent)).includes("Experience"),
  );
  await mob.close();

  // ---- per-route metadata, sitemap, feed, manifest (sweep polish)
  const aboutHtml = await (await fetch(BASE + "/about/")).text();
  ok("about route has its own title", aboutHtml.includes("<title>About — "));
  const sm = await (await fetch(BASE + "/sitemap.xml")).text();
  ok("sitemap lists window routes", sm.includes("/about/") && sm.includes("/help/"));
  ok("sitemap omits the dormant blog", !sm.includes("/blog/"));
  const feedRes = await fetch(BASE + "/feed.xml");
  const feedXml = await feedRes.text();
  ok(
    "feed.xml serves valid empty RSS",
    feedRes.status === 200 && feedXml.includes("<rss") && !feedXml.includes("<item>"),
  );
  const mf = JSON.parse(await (await fetch(BASE + "/manifest.webmanifest")).text());
  ok("manifest references the emitted icon routes", mf.icons?.[0]?.src === "/icon");
  ok("generated icon route serves", (await fetch(BASE + "/icon")).status === 200);
  ok(
    "theme-color metas for both color schemes",
    (await page.$$eval('meta[name="theme-color"]', (els) => els.length)) >= 2,
  );

  // ---- skip link (sweep polish)
  const skip = await page.evaluate(() => {
    const el = document.querySelector("a.skip-link");
    if (!el) return { exists: false };
    // Next injects a hidden placeholder div first; what matters is that
    // nothing focusable precedes the skip link.
    const first = document.querySelector("a, button, input, [tabindex]") === el;
    el.focus();
    const shown = getComputedStyle(el).transform === "none";
    return { exists: true, first, shown, target: !!document.getElementById("main") };
  });
  ok("skip link is the first focusable element", skip.exists && skip.first);
  ok("skip link becomes visible on focus", skip.exists && skip.shown);
  ok("skip link target #main exists", skip.exists && skip.target);

  ok("no console or page errors", errors.length === 0, errors.slice(0, 3).join(" | "));

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  for (const r of results) {
    console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.n}${r.extra ? `  (${r.extra})` : ""}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
