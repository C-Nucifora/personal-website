import type { MetadataRoute } from "next";
import { profile } from "@/data/profile";
import { ACTIVE_WINDOW_IDS } from "@/lib/vfs/types";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {
      url: `${profile.siteUrl}/`,
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
    },
    ...ACTIVE_WINDOW_IDS.map((window) => ({
      url: `${profile.siteUrl}/${window}/`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
