"use client";

import { useEffect, useRef, useState } from "react";
import { profile } from "@/data/profile";

const strip = (s: string) => s.replace(/^TODO\s*/, "");

const LINE_1 = `Welcome. I'm ${profile.name}, a ${strip(profile.role)}.`;
const LINE_2 = "Type a command or tap one below. New here? Try help.";
const FULL = `${LINE_1}\n${LINE_2}`;

/**
 * The boot greeting. Types itself out on first load (~35ms/char), skippable by
 * any key or click, and shown instantly under prefers-reduced-motion. Starts
 * from empty on both server and first client render to avoid a hydration
 * mismatch, then animates from an effect.
 */
export function Greeting() {
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      // Defer one frame so we don't setState synchronously inside the effect.
      const raf = requestAnimationFrame(() => {
        setShown(FULL.length);
        setDone(true);
      });
      return () => cancelAnimationFrame(raf);
    }

    const finish = () => {
      if (timer.current) clearTimeout(timer.current);
      setShown(FULL.length);
      setDone(true);
    };

    // Any key or pointer press skips the rest of the animation.
    window.addEventListener("keydown", finish, { once: true });
    window.addEventListener("pointerdown", finish, { once: true });

    let i = 0;
    const tick = () => {
      i += 1;
      setShown(i);
      if (i < FULL.length) {
        timer.current = setTimeout(tick, 35);
      } else {
        setDone(true);
      }
    };
    timer.current = setTimeout(tick, 250);

    return () => {
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("keydown", finish);
      window.removeEventListener("pointerdown", finish);
    };
  }, []);

  const text = FULL.slice(0, shown);

  return (
    <p className="whitespace-pre-line font-mono text-sm leading-relaxed text-fg">
      {text}
      {!done && <span className="caret align-middle" aria-hidden="true" />}
    </p>
  );
}
