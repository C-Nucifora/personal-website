import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { resolveCommand } from "../registry";
import { mail } from "./mail";
import { profile } from "@/data/profile";

describe("mail command", () => {
  test("is registered and visible in help", () => {
    expect(resolveCommand("mail")).toBe(mail);
    expect(mail.meta.hidden).toBeUndefined();
  });

  test("without an endpoint it prints the mailto fallback", () => {
    // profile.formEndpoint is "" until configured — the default path.
    render(<>{mail.run({} as never)}</>);
    expect(screen.getByRole("link", { name: profile.email })).toBeInTheDocument();
  });
});
