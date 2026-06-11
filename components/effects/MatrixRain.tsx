"use client";

import { useEffect, useRef } from "react";
import { store } from "@/lib/terminal/store";

const GLYPHS = "アイウエオカキクケコサシスセソ0123456789$+-*/=%#&<>";

/**
 * Matrix rain (EASTER_EGGS §4.3): the idle screensaver, also summoned by
 * `cmatrix`. Canvas-based, colored from the theme tokens, dismissed by any
 * input and returning exactly to the prior state.
 */
export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const style = getComputedStyle(document.documentElement);
    const color = style.getPropertyValue("--success").trim() || "#9ece6a";
    const bg = style.getPropertyValue("--bg").trim() || "#16161e";

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const fontSize = 16;
    let drops: number[] = [];
    const resetDrops = () => {
      drops = Array.from({ length: Math.ceil(canvas.width / fontSize) }, () =>
        Math.floor((Math.random() * canvas.height) / fontSize),
      );
    };
    resetDrops();

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let raf = 0;
    let last = 0;
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (t - last < 50) return;
      last = t;
      ctx.fillStyle = bg + "26"; // trail fade
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = color;
      ctx.font = `${fontSize}px monospace`;
      drops.forEach((y, x) => {
        const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        ctx.fillText(glyph, x * fontSize, y * fontSize);
        drops[x] = y * fontSize > canvas.height && Math.random() > 0.975 ? 0 : y + 1;
      });
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div
      role="presentation"
      onClick={() => store.dispatch({ type: "set-overlay", overlay: null })}
      className="absolute inset-0 z-40 bg-[var(--bg)]"
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
