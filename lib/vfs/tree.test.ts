import { describe, expect, test } from "vitest";
import { projects } from "@/data/projects";
import { experience } from "@/data/resume";
import { now } from "@/data/now";
import { listDir, readFile, resolveNode } from "./tree";
import { slugify } from "./builders";

describe("window directories (FLOW §2)", () => {
  test("~ lists the five window dirs in tab order", () => {
    const names = (listDir("~") ?? [])
      .filter((n) => !n.hidden)
      .map((n) => n.name);
    expect(names).toEqual(["about", "projects", "resume", "contact", "help"]);
  });

  test("about contains about.md and uses.md", () => {
    const names = (listDir("~/about") ?? []).map((n) => n.name);
    expect(names).toEqual(["about.md", "uses.md"]);
  });

  test("projects contains one dir per project with a README", () => {
    const names = (listDir("~/projects") ?? []).map((n) => n.name);
    expect(names).toEqual(projects.map((p) => p.slug));
    expect(readFile(`~/projects/${projects[0].slug}/README.md`)).not.toBe(null);
  });

  test("resume contains resume.md, resume.pdf and experience pages", () => {
    const names = (listDir("~/resume") ?? []).map((n) => n.name);
    expect(names).toEqual(["resume.md", "resume.pdf", "experience"]);
    const pages = (listDir("~/resume/experience") ?? []).map((n) => n.name);
    expect(pages).toEqual(experience.map((e) => `${slugify(e.org)}.md`));
  });

  test("resume.pdf is a download", () => {
    expect(readFile("~/resume/resume.pdf")?.download).toBe("/resume.pdf");
  });

  test("contact contains contact.md", () => {
    const names = (listDir("~/contact") ?? []).map((n) => n.name);
    expect(names).toEqual(["contact.md"]);
  });

  test("help contains the three docs", () => {
    const names = (listDir("~/help") ?? []).map((n) => n.name);
    expect(names).toEqual(["guide.md", "commands.md", "keybindings.md"]);
  });
});

describe("dotfiles (EASTER_EGGS §4.1)", () => {
  test("dotfiles exist under ~ and are hidden", () => {
    for (const name of [".bashrc", ".plan", ".vimrc", ".secrets"]) {
      const node = resolveNode(`~/${name}`);
      expect(node, name).not.toBe(null);
      expect(node!.hidden, name).toBe(true);
    }
  });

  test(".plan carries the now content", () => {
    expect(readFile("~/.plan")?.raw).toContain(now.updated);
  });

  test(".secrets holds the punchline file", () => {
    expect(readFile("~/.secrets/nothing_to_see_here.txt")?.raw).toBe("told you.");
  });
});

describe("absolute paths", () => {
  test("/etc/passwd exists", () => {
    expect(readFile("/etc/passwd")?.raw).toContain("impostor_syndrome");
  });

  test("~ reachable via /home/christian", () => {
    expect(resolveNode("/home/christian")?.kind).toBe("dir");
  });

  test("other absolute paths do not exist", () => {
    expect(resolveNode("/usr/bin")).toBe(null);
    expect(resolveNode("/nope")).toBe(null);
  });
});

describe("lookup edge cases", () => {
  test("missing relative paths return null", () => {
    expect(resolveNode("~/projects/does-not-exist")).toBe(null);
    expect(readFile("~/about/missing.md")).toBe(null);
  });

  test("listDir on a file returns null", () => {
    expect(listDir("~/about/about.md")).toBe(null);
  });

  test("readFile on a dir returns null", () => {
    expect(readFile("~/about")).toBe(null);
  });
});
