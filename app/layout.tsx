import type { Metadata } from "next";
import { JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";
import { profile } from "@/data/profile";
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

const description =
  profile.tagline && !profile.tagline.startsWith("TODO")
    ? profile.tagline
    : `${profile.name} — ${profile.role.replace(/^TODO\s*/, "")}. A terminal-style developer portfolio.`;

export const metadata: Metadata = {
  title: `${profile.name} — ${profile.role.replace(/^TODO\s*/, "")}`,
  description,
  openGraph: {
    title: `${profile.name} — developer portfolio`,
    description,
    type: "website",
  },
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
        {/* Apply the saved theme before first paint to avoid a colour flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript() }} />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
