import { describe, expect, test, vi } from "vitest";

const POST = { slug: "hi", title: "Hi", date: "2026-06-12", body: "text" };

describe("dormant blog window (spec 2026-06-12)", () => {
  test("ACTIVE_WINDOW_IDS and the vfs drop blog while there are no posts", async () => {
    vi.resetModules();
    vi.doMock("@/data/generated/blog", () => ({ blogPosts: [] }));
    const { ACTIVE_WINDOW_IDS } = await import("./types");
    expect(ACTIVE_WINDOW_IDS).toEqual(["about", "projects", "resume", "contact", "help"]);
    const { listDir } = await import("./tree");
    expect((listDir("~") ?? []).some((n) => n.name === "blog")).toBe(false);
    vi.doUnmock("@/data/generated/blog");
  });

  test("blog activates once a post exists", async () => {
    vi.resetModules();
    vi.doMock("@/data/generated/blog", () => ({ blogPosts: [POST] }));
    const { ACTIVE_WINDOW_IDS } = await import("./types");
    expect(ACTIVE_WINDOW_IDS).toEqual([
      "about",
      "projects",
      "resume",
      "contact",
      "help",
      "blog",
    ]);
    const { listDir, readFile } = await import("./tree");
    expect((listDir("~/blog") ?? []).map((n) => n.name)).toEqual(["hi.md"]);
    expect(readFile("~/blog/hi.md")?.raw).toContain("Hi");
    vi.doUnmock("@/data/generated/blog");
  });
});
