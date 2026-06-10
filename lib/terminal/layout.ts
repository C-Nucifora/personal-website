/**
 * Pane layout as a binary split tree (FLOW §7.3, §12.4). Pure helpers; the
 * reducer owns the state, PaneTree renders the tree with flexbox.
 */

export type PaneLayout =
  | { type: "leaf"; paneId: string }
  | {
      type: "split";
      id: string;
      dir: "row" | "col"; // row = side-by-side (%), col = stacked (")
      ratio: number; // share of the first child
      a: PaneLayout;
      b: PaneLayout;
    };

export function leaf(paneId: string): PaneLayout {
  return { type: "leaf", paneId };
}

export function leafIds(l: PaneLayout): string[] {
  return l.type === "leaf" ? [l.paneId] : [...leafIds(l.a), ...leafIds(l.b)];
}

/** Replace the target leaf with a 50/50 split of (old, new). */
export function splitLeaf(
  l: PaneLayout,
  targetPane: string,
  newPane: string,
  dir: "row" | "col",
  splitId: string,
): PaneLayout {
  if (l.type === "leaf") {
    if (l.paneId !== targetPane) return l;
    return { type: "split", id: splitId, dir, ratio: 0.5, a: l, b: leaf(newPane) };
  }
  return {
    ...l,
    a: splitLeaf(l.a, targetPane, newPane, dir, splitId),
    b: splitLeaf(l.b, targetPane, newPane, dir, splitId),
  };
}

/** Remove a leaf; its sibling takes the parent split's place. Null = it was the root. */
export function removeLeaf(l: PaneLayout, paneId: string): PaneLayout | null {
  if (l.type === "leaf") return l.paneId === paneId ? null : l;
  const a = removeLeaf(l.a, paneId);
  if (a === null) return l.b;
  const b = removeLeaf(l.b, paneId);
  if (b === null) return a === l.a ? l.a : { ...l, a };
  return { ...l, a, b };
}

export function withRatio(l: PaneLayout, splitId: string, ratio: number): PaneLayout {
  if (l.type === "leaf") return l;
  if (l.id === splitId) return { ...l, ratio };
  return { ...l, a: withRatio(l.a, splitId, ratio), b: withRatio(l.b, splitId, ratio) };
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Each leaf's box on the unit square — for directional focus. */
export function paneBoxes(l: PaneLayout, box: Box = { x: 0, y: 0, w: 1, h: 1 }): Map<string, Box> {
  if (l.type === "leaf") return new Map([[l.paneId, box]]);
  const first =
    l.dir === "row"
      ? { ...box, w: box.w * l.ratio }
      : { ...box, h: box.h * l.ratio };
  const second =
    l.dir === "row"
      ? { x: box.x + box.w * l.ratio, y: box.y, w: box.w * (1 - l.ratio), h: box.h }
      : { x: box.x, y: box.y + box.h * l.ratio, w: box.w, h: box.h * (1 - l.ratio) };
  return new Map([...paneBoxes(l.a, first), ...paneBoxes(l.b, second)]);
}

export type Direction = "left" | "right" | "up" | "down";

/** The nearest pane in a direction from the given pane, or null. */
export function neighbor(l: PaneLayout, from: string, dir: Direction): string | null {
  const boxes = paneBoxes(l);
  const me = boxes.get(from);
  if (!me) return null;
  const cx = me.x + me.w / 2;
  const cy = me.y + me.h / 2;

  let best: string | null = null;
  let bestDist = Infinity;
  for (const [id, b] of boxes) {
    if (id === from) continue;
    const ox = b.x + b.w / 2;
    const oy = b.y + b.h / 2;
    const inDir =
      dir === "left" ? ox < cx : dir === "right" ? ox > cx : dir === "up" ? oy < cy : oy > cy;
    if (!inDir) continue;
    const dist = Math.abs(ox - cx) + Math.abs(oy - cy);
    if (dist < bestDist) {
      bestDist = dist;
      best = id;
    }
  }
  return best;
}
