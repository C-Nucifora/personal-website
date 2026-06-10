import { chromium, devices } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
const results = [];
const ok = (n, c, extra = "") => results.push({ n, pass: !!c, extra });

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

  const count = () => page.$$eval('[role="log"] > div', (e) => e.length).catch(() => -1);
  const logText = () => page.$eval('[role="log"]', (e) => e.innerText).catch(() => "");
  const bodyText = () => page.innerText("body").catch(() => "");
  const activeWin = () =>
    page.$eval('nav[aria-label="Windows"] [aria-current="true"]', (e) => e.innerText).catch(() => "(none)");
  const homeActive = () =>
    page.$eval('[data-home="true"]', (e) => e.getAttribute("aria-current")).catch(() => null);
  const run = async (cmd) => {
    await page.click("#command-input");
    await page.fill("#command-input", cmd);
    await page.press("#command-input", "Enter");
    await page.waitForTimeout(140);
  };
  const tab = (label) => page.click(`nav[aria-label="Windows"] >> text=${label}`);

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector('html[data-js-ready="true"]', { timeout: 5000 });
  await page.waitForTimeout(400);

  ok("boot shows last login line", (await logText()).toLowerCase().includes("last login:"));
  ok("boot shows fastfetch card", /Host/.test(await logText()) && /Shell/.test(await logText()));
  ok("boot shows inline hint", (await logText()).toLowerCase().includes("try:"));
  ok("no marketing welcome banner", !(await bodyText()).includes("Welcome. I'm Christian Nucifora"));
  ok("no 0:shell tab in strip", !(await bodyText()).includes("0:shell"));
  ok("home control present + active", (await homeActive()) === "true");
  await page.screenshot({ path: "/tmp/home-boot.png" });

  await tab("1:about");
  await page.waitForTimeout(150);
  ok("about is ephemeral (1 entry)", (await count()) === 1, `got ${await count()}`);
  await page.click("#command-input");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  ok("Esc in a section returns home", (await homeActive()) === "true");
  ok("home still shows the boot card", /Host/.test(await logText()));

  await tab("2:resume");
  await page.waitForTimeout(120);
  await page.click('[data-home="true"]');
  await page.waitForTimeout(120);
  ok("host label click returns home", (await homeActive()) === "true");

  await run("clear");
  ok("clear wipes the boot scrollback", (await count()) === 0, `got ${await count()}`);

  await run("echo one");
  await run("neofetch");
  ok("shell accumulates after clear", (await count()) === 2, `got ${await count()}`);
  await tab("1:about");
  await page.waitForTimeout(120);
  await page.click('[data-home="true"]');
  await page.waitForTimeout(120);
  ok("shell scrollback preserved across a section", (await count()) === 2, `got ${await count()}`);

  await run("cd projects");
  ok("cd projects active = projects", (await activeWin()).includes("projects"));
  await run("cd ~");
  ok("cd ~ returns home", (await homeActive()) === "true");

  await page.click("#command-input");
  await page.keyboard.press("Control+b");
  await page.keyboard.press("0");
  await page.waitForTimeout(140);
  ok("Ctrl-b 0 goes home", (await homeActive()) === "true");

  await page.goto(BASE + "/#contact", { waitUntil: "networkidle" });
  await page.waitForSelector('html[data-js-ready="true"]');
  await page.waitForTimeout(300);
  ok("deep-link /#contact opens contact", (await activeWin()).includes("contact"));

  // Reload re-seeds the boot card (clear only wipes within a session).
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector('html[data-js-ready="true"]');
  await page.waitForTimeout(400);
  ok(
    "reload re-seeds the boot card",
    /Host/.test(await logText()) && (await logText()).toLowerCase().includes("last login:"),
  );

  await browser.close();

  const mob = await chromium.launch();
  const ctx = await mob.newContext({ ...devices["Pixel 5"] });
  const mp = await ctx.newPage();
  await mp.goto(BASE, { waitUntil: "networkidle" });
  await mp.waitForSelector('html[data-js-ready="true"]');
  await mp.waitForTimeout(300);
  ok("mobile tap-bar visible", await mp.isVisible(".mobile-bar"));
  await mob.close();

  ok("no console/page errors", errors.length === 0, errors.slice(0, 4).join(" | "));

  let fails = 0;
  console.log("\n=== RESULTS ===");
  for (const r of results) {
    console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.n}${r.extra ? "  [" + r.extra + "]" : ""}`);
    if (!r.pass) fails++;
  }
  console.log(`\n${results.length - fails}/${results.length} passed`);
  process.exit(fails ? 1 : 0);
}
main().catch((e) => { console.error("SCRIPT ERROR", e); process.exit(2); });
