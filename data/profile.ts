/**
 * Site identity. Edit these values — components and SEO read from here.
 * Anything marked TODO is placeholder copy to replace with your own.
 */
export const profile = {
  name: "Christian Nucifora",
  username: "christian", // used in the prompt: visitor@christian:~$
  role: "TODO Full-stack developer",
  location: "TODO City, Country",
  tagline: "TODO one line that sounds like you",
  about: [
    "TODO a couple of sentences about who you are and what you build. Keep it in your own voice, not a job-application summary.",
    "TODO what you're into right now, or what you're looking for next.",
  ],
  resumePdf: "/resume.pdf", // place the actual PDF in /public
  email: "cgnucifora@proton.me",
} as const;

export type Profile = typeof profile;
