import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";
import { blogPosts } from "@/data/generated/blog";
import { profile } from "@/data/profile";
import { socials } from "@/data/socials";
import { stripTodo } from "@/lib/strip-todo";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { themeInitScript } from "@/lib/themes/init-script";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const role = stripTodo(profile.role);

const description =
  profile.tagline && !profile.tagline.startsWith("TODO")
    ? profile.tagline
    : `${profile.name} — ${role}. A terminal-style developer portfolio.`;

// Match the browser chrome to the default themes (Tokyo Night / Day --bg).
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#16161e" },
    { media: "(prefers-color-scheme: light)", color: "#d5d6db" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(profile.siteUrl),
  title: `${profile.name} — ${role}`,
  description,
  applicationName: `${profile.name} — portfolio`,
  authors: [{ name: profile.name, url: profile.siteUrl }],
  creator: profile.name,
  keywords: [profile.name, role, "developer", "portfolio", "software engineer"],
  alternates: {
    canonical: "/",
    // Advertised only once the blog wakes up; /feed.xml itself always exists.
    ...(blogPosts.length
      ? { types: { "application/rss+xml": [{ url: "/feed.xml", title: "Blog feed" }] } }
      : {}),
  },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: profile.siteUrl,
    siteName: `${profile.name} — portfolio`,
    title: `${profile.name} — ${role}`,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${profile.name} — ${role}`,
    description,
  },
};

// JSON-LD Person schema for richer search results.
const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  url: profile.siteUrl,
  email: `mailto:${profile.email}`,
  jobTitle: role,
  sameAs: socials.filter((s) => s.url.startsWith("http")).map((s) => s.url),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The inline theme script sets data-theme + inline CSS vars on <html>
    // before hydration, so suppress the expected attribute mismatch warning.
    <html
      lang="en"
      className={`${jetbrainsMono.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/* First focusable on every page: jump past the chrome to content. */}
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {/* Apply the saved theme before first paint to avoid a colour flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript() }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        {/* Self-hosted Umami: cookie-free page views, dormant until configured. */}
        {profile.umami.scriptUrl && profile.umami.websiteId ? (
          <script defer src={profile.umami.scriptUrl} data-website-id={profile.umami.websiteId} />
        ) : null}
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
