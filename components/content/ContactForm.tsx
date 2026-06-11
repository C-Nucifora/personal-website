"use client";

import { useId, useState } from "react";
import { profile } from "@/data/profile";

type Status = "idle" | "sending" | "sent" | "error";

/**
 * Provider-agnostic contact form (spec 2026-06-12). Dormant until
 * profile.formEndpoint is set. Posts urlencoded with Accept: json — the
 * convention Formspree, Web3Forms, and Basin all share. The native
 * action/method keep it working in the no-JS static fallback.
 */
export function ContactForm({ endpoint = profile.formEndpoint }: { endpoint?: string }) {
  const id = useId();
  const [status, setStatus] = useState<Status>("idle");

  if (!endpoint) return null;

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (String(data.get("_gotcha") ?? "").length > 0) return; // honeypot
    setStatus("sending");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new URLSearchParams([...data] as [string, string][]),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  const field =
    "w-full rounded-md border border-border bg-elevated px-3 py-2 font-sans text-sm text-fg focus-visible:outline-2";

  return (
    <form
      data-contact-form
      aria-label="Send me a message"
      action={endpoint}
      method="POST"
      onSubmit={onSubmit}
      className="max-w-md space-y-3"
    >
      <div className="space-y-1">
        <label htmlFor={`${id}-name`} className="font-sans text-sm text-muted">
          Name
        </label>
        <input id={`${id}-name`} name="name" required autoComplete="name" className={field} />
      </div>
      <div className="space-y-1">
        <label htmlFor={`${id}-email`} className="font-sans text-sm text-muted">
          Email
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          className={field}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor={`${id}-message`} className="font-sans text-sm text-muted">
          Message
        </label>
        <textarea id={`${id}-message`} name="message" required rows={4} className={field} />
      </div>
      {/* Honeypot — humans never see it, naive bots fill it. */}
      <input
        type="text"
        name="_gotcha"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-px w-px opacity-0"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === "sending"}
          className="cursor-pointer rounded-md border border-accent/40 px-3 py-2 text-sm text-accent transition-colors hover:bg-accent/10 disabled:cursor-default disabled:opacity-60"
        >
          {status === "sending" ? "Sending…" : "Send"}
        </button>
        <p aria-live="polite" className="font-sans text-sm text-muted">
          {status === "sent" && "Sent — I'll reply by email."}
          {status === "error" && (
            <>
              Couldn&apos;t send — email me instead:{" "}
              <a href={`mailto:${profile.email}`} className="text-accent">
                {profile.email}
              </a>
            </>
          )}
        </p>
      </div>
    </form>
  );
}
