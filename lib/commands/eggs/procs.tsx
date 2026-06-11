/** top / htop / sl — overlay-based eggs. Any key dismisses (global rule 5). */
import type { CommandModule } from "../registry";
import { Hint } from "@/components/content/messages";

function reducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export const top: CommandModule = {
  meta: { name: "top", aliases: [], description: "", usage: "top", hidden: true },
  run: (ctx) => {
    ctx.startOverlay("top");
    return null;
  },
};

export const htop: CommandModule = {
  meta: { name: "htop", aliases: [], description: "", usage: "htop", hidden: true },
  run: (ctx) => {
    ctx.startOverlay("htop");
    return null;
  },
};

export const cmatrix: CommandModule = {
  meta: { name: "cmatrix", aliases: [], description: "", usage: "cmatrix", hidden: true },
  run: (ctx) => {
    if (reducedMotion()) {
      return <Hint>the matrix has you… but it respects reduced motion.</Hint>;
    }
    ctx.startOverlay("matrix");
    return null;
  },
};

export const sl: CommandModule = {
  meta: { name: "sl", aliases: [], description: "", usage: "sl", hidden: true },
  run: (ctx) => {
    if (reducedMotion()) {
      return <Hint>the train left without you. (it respects reduced motion.)</Hint>;
    }
    ctx.startOverlay("sl");
    return null;
  },
};
