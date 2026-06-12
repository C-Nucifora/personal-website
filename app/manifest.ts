import type { MetadataRoute } from "next";
import { profile } from "@/data/profile";
import { stripTodo } from "@/lib/strip-todo";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${profile.name} — portfolio`,
    short_name: profile.name.split(" ")[0],
    description: `${profile.name} — ${stripTodo(profile.role)}. A terminal-style developer portfolio.`,
    start_url: "/",
    display: "browser",
    background_color: "#16161e",
    theme_color: "#16161e",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
