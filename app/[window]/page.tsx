import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SitePage } from "@/components/SitePage";
import { WINDOW_META } from "@/lib/window-meta";
import { ACTIVE_WINDOW_IDS, type WindowId } from "@/lib/vfs/types";

/** One static route per window (FLOW §4) — /about/, /projects/, … */
export function generateStaticParams() {
  return ACTIVE_WINDOW_IDS.map((window) => ({ window }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ window: string }>;
}): Promise<Metadata> {
  const { window } = await params;
  const meta = WINDOW_META[window as WindowId];
  if (!meta) return {};
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `/${window}/` },
    openGraph: { title: meta.title, description: meta.description, url: `/${window}/` },
    twitter: { title: meta.title, description: meta.description },
  };
}

export default async function WindowPage({
  params,
}: {
  params: Promise<{ window: string }>;
}) {
  const { window } = await params;
  if (!(ACTIVE_WINDOW_IDS as readonly string[]).includes(window)) notFound();
  return <SitePage initialWindow={window as WindowId} />;
}
