import { describe, expect, test } from "vitest";
import { profile } from "@/data/profile";
import { socials } from "@/data/socials";
import { now } from "@/data/now";
import { experience } from "@/data/resume";
import { projects } from "@/data/projects";
import {
  aboutMd,
  contactMd,
  etcPasswd,
  experiencePageMd,
  planText,
  projectReadmeMd,
  resumeMd,
  slugify,
  usesMd,
} from "./builders";

describe("slugify", () => {
  test("lowercases and dashes words", () => {
    expect(slugify("TODO Earlier Company")).toBe("todo-earlier-company");
  });

  test("strips punctuation", () => {
    expect(slugify("Acme, Inc.")).toBe("acme-inc");
  });
});

describe("contactMd (relocated content)", () => {
  const md = contactMd();

  test("includes the email", () => {
    expect(md).toContain(profile.email);
  });

  test("includes every social link", () => {
    for (const s of socials) {
      expect(md).toContain(s.url);
    }
  });

  test("includes the homelab link", () => {
    expect(md).toContain(profile.homelabUrl);
  });
});

describe("usesMd (relocated content)", () => {
  test("includes every group heading", () => {
    const md = usesMd();
    expect(md).toContain("Editor & terminal");
    expect(md).toContain("Neovim");
  });
});

describe("planText (relocated now content)", () => {
  const txt = planText();

  test("includes the updated date", () => {
    expect(txt).toContain(now.updated);
  });

  test("includes the now items", () => {
    expect(txt).toContain(now.items[0]);
  });
});

describe("aboutMd", () => {
  test("includes name and about paragraphs", () => {
    const md = aboutMd();
    expect(md).toContain(profile.name);
    expect(md).toContain(profile.about[0]);
  });
});

describe("resumeMd", () => {
  test("includes experience orgs and skills", () => {
    const md = resumeMd();
    expect(md).toContain(experience[0].org);
    expect(md).toContain("Languages");
  });
});

describe("experiencePageMd", () => {
  test("renders one role with title, dates and bullets", () => {
    const md = experiencePageMd(experience[0]);
    expect(md).toContain(experience[0].org);
    expect(md).toContain(experience[0].title);
    expect(md).toContain(experience[0].start);
    expect(md).toContain(experience[0].bullets[0]);
  });
});

describe("projectReadmeMd", () => {
  test("includes title, pitch, stack and source link", () => {
    const md = projectReadmeMd(projects[0]);
    expect(md).toContain(projects[0].title);
    expect(md).toContain(projects[0].pitch);
    expect(md).toContain(projects[0].stack[0]);
    expect(md).toContain(projects[0].sourceUrl!);
  });
});

describe("etcPasswd", () => {
  test("includes the impostor_syndrome user", () => {
    expect(etcPasswd()).toContain(
      "impostor_syndrome:x:1001:1001:visits occasionally:/home/christian:/bin/zsh",
    );
  });
});
