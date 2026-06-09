/**
 * Resume content. The `resume` command and the server-rendered fallback both
 * read these, in order: experience, education, skills, then a download button.
 */
export interface ResumeEntry {
  org: string;
  title: string;
  start: string; // "2023"
  end: string; // "Present"
  location?: string;
  bullets: string[]; // what you did / shipped, results first
}

export const experience: ResumeEntry[] = [
  {
    org: "TODO Company",
    title: "TODO Senior Software Engineer",
    start: "2023",
    end: "Present",
    location: "TODO City, Country",
    bullets: [
      "TODO Shipped X that did Y, measured by Z. Lead with the result.",
      "TODO Built / owned / improved some system; name the impact.",
    ],
  },
  {
    org: "TODO Earlier Company",
    title: "TODO Software Engineer",
    start: "2020",
    end: "2023",
    location: "TODO City, Country",
    bullets: [
      "TODO Another concrete accomplishment with a number in it.",
      "TODO Something you owned end to end.",
    ],
  },
];

export const education: ResumeEntry[] = [
  {
    org: "TODO University",
    title: "TODO B.S. in Computer Science",
    start: "2016",
    end: "2020",
    location: "TODO City, Country",
    bullets: [],
  },
];

export const skills: { group: string; items: string[] }[] = [
  { group: "Languages", items: ["TypeScript", "Python", "TODO"] },
  { group: "Frameworks", items: ["React", "Next.js", "TODO"] },
  { group: "Tools", items: ["Git", "Docker", "TODO"] },
];
