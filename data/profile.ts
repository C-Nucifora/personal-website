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
  // Your homelab dashboard. Set this to the real URL to enable the `homelab`
  // command; leave the placeholder and the command explains how to configure it.
  homelabUrl: "https://dashboard.christiannucifora.com",
  // Canonical site URL, used for SEO metadata, sitemap, and Open Graph.
  siteUrl: "https://christiannucifora.com",
  // Self-hosted Umami analytics (cookie-free page views). Fill both values
  // to enable the tracking script; while either is empty, nothing loads.
  umami: {
    scriptUrl: "", // e.g. "https://umami.christiannucifora.com/script.js"
    websiteId: "", // the website ID from the Umami dashboard
  },
  // Third-party form endpoint (Formspree / Web3Forms / Basin style URL).
  // Empty = no form renders anywhere; mailto stays primary regardless.
  formEndpoint: "" as string,
} as const;

export type Profile = typeof profile;
