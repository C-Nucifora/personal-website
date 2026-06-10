import { chromium, devices } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
const EMAIL = "cgnucifora@proton.me";
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
  const run = async (cmd) => {
    await page.click("#command-input");
    await page.fill("#command-input", cmd);
    await page.press("#command-input", "Enter");
    await page.waitForTimeout(140);
  };
  const navClick = async (label) => {
    await page.click(`nav[aria-label="Sections"] >> text="${label}"`);
    await page.waitForTimeout(140);
  };

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector('html[data-js-ready="true"]', { timeout: 5000 });
  await page.waitForTimeout(400);

  // Boot
  ok("boot shows last login line", (await logText()).toLowerCase().includes("last login:"));
  ok("boot shows fastfetch card", /Host/.test(await logText()) && /Shell/.test(await logText()));
  ok("boot shows inline hint", (await logText()).toLowerCase().includes("try:"));
  ok("no marketing welcome banner", !(await bodyText()).includes("Welcome. I'm Christian Nucifora"));
  const bootCount = await count();
  ok("boot seeds three entries", bootCount === 3, `got ${bootCount}`);
  await page.screenshot({ path: "/tmp/home-boot.png" });

  // Content commands append to the one log; boot is preserved.
  await run("about");
  ok("about appends below boot", (await count()) === bootCount + 1, `got ${await count()}`);
  ok("boot still present after about", (await logText()).toLowerCase().includes("last login:"));

  // Nav click runs the command, same as typing.
  await navClick("resume");
  ok("nav click appends an entry", (await count()) === bootCount + 2, `got ${await count()}`);
  ok("resume nav opens the resume", (await logText()).includes("Print / Save as PDF"));

  // clear empties, then the log accumulates again.
  await run("clear");
  ok("clear wipes the log", (await count()) === 0, `got ${await count()}`);
  await run("echo one");
  await run("neofetch");
  ok("log accumulates after clear", (await count()) === 2, `got ${await count()}`);

  // Re-running stacks a fresh copy (honest terminal behavior).
  await run("about");
  await run("about");
  ok("re-running stacks a copy", (await count()) === 4, `got ${await count()}`);

  // cd delegates to the section command and appends.
  await run("cd projects");
  ok("cd projects appends projects", (await count()) === 5, `got ${await count()}`);

  // Deep link opens the section on load.
  await page.goto(BASE + "/#contact", { waitUntil: "networkidle" });
  await page.waitForSelector('html[data-js-ready="true"]');
  await page.waitForTimeout(300);
  ok("deep-link /#contact opens contact", (await logText()).includes(EMAIL));

  // Reload re-seeds the boot card.
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector('html[data-js-ready="true"]');
  await page.waitForTimeout(400);
  ok(
    "reload re-seeds the boot card",
    /Host/.test(await logText()) && (await logText()).toLowerCase().includes("last login:"),
  );

  // Nav row is visible on desktop.
  ok("section nav visible on desktop", await page.isVisible('nav[aria-label="Sections"]'));

  await browser.close();

  // Nav row is also visible on mobile (one persistent surface, all viewports).
  const mob = await chromium.launch();
  const ctx = await mob.newContext({ ...devices["Pixel 5"] });
  const mp = await ctx.newPage();
  await mp.goto(BASE, { waitUntil: "networkidle" });
  await mp.waitForSelector('html[data-js-ready="true"]');
  await mp.waitForTimeout(300);
  ok("section nav visible on mobile", await mp.isVisible('nav[aria-label="Sections"]'));
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
main().catch((e) => {
  console.error("SCRIPT ERROR", e);
  process.exit(2);
});
