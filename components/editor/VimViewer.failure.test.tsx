import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Component, type ReactNode } from "react";
import { expect, test, vi } from "vitest";
import { VimViewer } from "./VimViewer";
import { store } from "@/lib/terminal/store";

vi.mock("./VimViewerImpl", () => {
  throw new Error("fixture: editor chunk unavailable");
});

// Models the enclosing route boundary, which replaces the whole page on error.
class PageBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p>Page unavailable</p> : this.props.children; }
}

test("a rejected editor chunk preserves surrounding portfolio navigation", async () => {
  render(
    <PageBoundary>
      <button>Switch to plain view</button>
      <VimViewer
        windowKey="lobby"
        paneId="fixture-pane"
        path="~/fixture.ts"
        note={null}
        offset={null}
      />
    </PageBoundary>,
    { onCaughtError: () => {} },
  );

  await waitFor(() => {
    expect(screen.queryByText("opening fixture.ts…")).not.toBeInTheDocument();
  });
  expect(screen.queryByRole("button", { name: "Switch to plain view" })).toBeVisible();
});

test("returning from a failed editor closes its own pane and preserves the other editor", async () => {
  store.reset("projects");
  const origin = store.getState().windows.projects.activePane;
  store.dispatch({ type: "open-editor", windowKey: "projects", path: "~/fixture.ts" });
  store.dispatch({ type: "split-pane", window: "projects", dir: "row" });
  const other = store.getState().windows.projects.activePane;
  store.dispatch({ type: "open-editor", windowKey: "projects", path: "~/other.ts" });
  render(
    <VimViewer windowKey="projects" paneId={origin} path="~/fixture.ts" note={null} offset={null} />,
    { onCaughtError: () => {} },
  );

  fireEvent.click(await screen.findByRole("button", { name: "Return to shell" }));
  const window = store.getState().windows.projects;
  expect(window.activePane).toBe(origin);
  expect(window.panes.find((pane) => pane.id === origin)?.view).toBe("shell");
  expect(window.panes.find((pane) => pane.id === other)?.editorPath).toBe("~/other.ts");
});
