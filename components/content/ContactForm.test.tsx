import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ContactForm } from "./ContactForm";

const ENDPOINT = "https://forms.example.test/abc";

afterEach(() => vi.unstubAllGlobals());

describe("ContactForm", () => {
  test("renders nothing without an endpoint", () => {
    const { container } = render(<ContactForm endpoint="" />);
    expect(container.querySelector("form")).toBeNull();
  });

  test("renders name, email, message with an endpoint", () => {
    render(<ContactForm endpoint={ENDPOINT} />);
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
  });

  test("a filled honeypot blocks the fetch", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<ContactForm endpoint={ENDPOINT} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Bot" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "b@b.bot" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "spam" } });
    fireEvent.change(container.querySelector('input[name="_gotcha"]')!, {
      target: { value: "i am a bot" },
    });
    fireEvent.submit(container.querySelector("form")!);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("successful submit shows the sent message and resets", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    render(<ContactForm endpoint={ENDPOINT} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.c" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "hi" } });
    fireEvent.submit(screen.getByRole("form", { name: "Send me a message" }));
    await waitFor(() =>
      expect(screen.getByText(/sent — I'll reply by email/i)).toBeInTheDocument(),
    );
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("");
  });

  test("failed submit shows the mailto fallback", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    render(<ContactForm endpoint={ENDPOINT} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.c" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "hi" } });
    fireEvent.submit(screen.getByRole("form", { name: "Send me a message" }));
    await waitFor(() => expect(screen.getByText(/couldn't send/i)).toBeInTheDocument());
  });
});
