/**
 * `fortune` lines (EASTER_EGGS §1.1): programming aphorisms plus a few
 * originals. Add freely — one string per fortune.
 */
export const fortunes: string[] = [
  "There are only two hard things in computer science: cache invalidation, naming things, and off-by-one errors.",
  "It works on my machine. — everyone, eventually",
  "Weeks of coding can save you hours of planning.",
  "A good commit message is a love letter to your future self.",
  "Premature optimization is the root of all evil. — Donald Knuth",
  "Simplicity is prerequisite for reliability. — Edsger Dijkstra",
  "Programs must be written for people to read, and only incidentally for machines to execute. — Abelson & Sussman",
  "First, solve the problem. Then, write the code. — John Johnson",
  "Deleted code is debugged code. — Jeff Sickel",
  "The best error message is the one that never shows up. — Thomas Fuchs",
  "Nine people can't make a baby in a month. — Fred Brooks",
  "Make it work, make it right, make it fast. — Kent Beck",
  "Any sufficiently advanced bug is indistinguishable from a feature.",
  "Real terminals don't need a mouse. This one humors you.",
  "The S in IoT stands for security.",
  "If debugging is the process of removing bugs, then programming must be the process of putting them in. — Edsger Dijkstra",
  "Documentation is a love language.",
  "There is no cloud. It's just someone else's computer.",
  "You are not your code review.",
  "This fortune intentionally left meaningful.",
];

export function randomFortune(): string {
  return fortunes[Math.floor(Math.random() * fortunes.length)];
}
