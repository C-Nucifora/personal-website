import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { BlogPosts } from "./BlogPosts";

describe("BlogPosts", () => {
  test("renders nothing without posts", () => {
    const { container } = render(<BlogPosts posts={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  test("renders title, date, and markdown body", () => {
    render(
      <BlogPosts
        posts={[{ slug: "hi", title: "Hi there", date: "2026-06-12", body: "**bold** text" }]}
      />,
    );
    expect(screen.getByRole("heading", { name: "Hi there" })).toBeInTheDocument();
    expect(screen.getByText("2026-06-12")).toBeInTheDocument();
    expect(screen.getByText("bold")).toBeInTheDocument();
  });
});
