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
  await page.screenshot({ path: "/tmp/e2e-lobby.png" });

  // ---- ls is a clickable menu (§3.1)
  await run("lobby", "ls");
  ok("ls lists the five window dirs", /about\/[\s\S]*projects\/[\s\S]*help\//.test(await paneText("lobby")));

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

  // ---- COPY mode (§6.3)
  await page.keyboard.press("Control+b");
  await page.keyboard.press("[");
  await page.waitForTimeout(100);
  ok("Ctrl+b [ enters COPY mode", (await page.innerText("body")).includes("-- COPY --"));
  await page.keyboard.press("q");
  await page.waitForTimeout(100);
  ok("q leaves COPY mode", (await page.innerText("body")).includes("-- INSERT --"));

  // ---- deep link (§4)
  await page.goto(BASE + "/contact/", { waitUntil: "networkidle" });
  await page.waitForSelector('html[data-js-ready="true"]');
  await page.waitForTimeout(900);
  const deep = await paneText("contact");
  ok("deep link prints the MOTD above", deep.toLowerCase().includes("last login:"));
  ok("deep link echoes the cd", deep.includes("cd ~/contact"));
  ok("deep link auto-displays content", deep.includes(EMAIL));

  // ---- static fallback in raw HTML (non-negotiable #5)
  const raw = await (await page.request.get(BASE + "/resume/")).text();
  ok("static fallback ships resume content without JS", raw.includes("static-fallback") && raw.includes("Experience"));

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
