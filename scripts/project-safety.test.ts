import { describe, expect, test } from "vitest";
import { boundedBody, isPublicProject, isSourceFile } from "./project-safety.mjs";
import { projectsConfig } from "../data/projects-config.mjs";

describe("public portfolio trust boundaries", () => {
  test("new public repos and private repos never join the allowlist implicitly", () => {
    const repo = { name: "m1-core", private: false, visibility: "public", fork: false, archived: false };
    expect(isPublicProject(repo, projectsConfig)).toBe(true);
    expect(isPublicProject({ ...repo, private: true }, projectsConfig)).toBe(false);
    expect(isPublicProject({ ...repo, name: "private-infrastructure" }, projectsConfig)).toBe(false);
  });
  test("only bounded regular files with safe paths are bundled", () => {
    const entry = { path: "src/index.ts", mode: "100644", type: "blob", size: 100 };
    expect(isSourceFile(entry, projectsConfig.source)).toBe(true);
    for (const path of ["../secret.ts", "/secret.ts", ".env.ts", "src/.private/config.ts", "node_modules/index.ts", "src/package-lock.json"]) {
      expect(isSourceFile({ ...entry, path }, projectsConfig.source)).toBe(false);
    }
    expect(isSourceFile({ ...entry, mode: "120000" }, projectsConfig.source)).toBe(false);
    expect(isSourceFile({ ...entry, size: 100_000 }, projectsConfig.source)).toBe(false);
  });
  test("streaming responses cannot exceed the byte budget", async () => {
    const response = { body: (async function* () { yield Buffer.from("abc"); yield Buffer.from("def"); })() };
    await expect(boundedBody(response, 5)).rejects.toThrow("budget");
  });
});

import { githubProjects } from "../data/generated/github-projects";
import { githubSources } from "../data/generated/github-sources";

test("the reviewed snapshots contain only curated revisions and bounded source", () => {
  expect(githubProjects.length).toBeGreaterThan(0);
  for (const project of githubProjects) {
    expect(projectsConfig.include).toContain(project.slug);
    expect(project.revision).toMatch(/^[a-f0-9]{40}$/);
    expect(project.sourceUrl).toBe(`https://github.com/C-Nucifora/${project.slug}`);
    const files = githubSources[project.slug] ?? {};
    expect(Object.keys(files).length).toBeLessThanOrEqual(projectsConfig.source.maxFilesPerRepo);
    expect(Object.values(files).reduce((bytes, source) => bytes + Buffer.byteLength(source), 0)).toBeLessThanOrEqual(projectsConfig.source.maxBytesPerRepo);
    for (const [path, source] of Object.entries(files)) {
      expect(isSourceFile({ path, size: Buffer.byteLength(source), type: "blob", mode: "100644" }, projectsConfig.source)).toBe(true);
      expect(source).not.toMatch(/-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}/);
    }
  }
});
