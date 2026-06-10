import { notFound } from "next/navigation";
import { SitePage } from "@/components/SitePage";
import { WINDOW_IDS, type WindowId } from "@/lib/vfs/types";

/** One static route per window (FLOW §4) — /about/, /projects/, … */
export function generateStaticParams() {
  return WINDOW_IDS.map((window) => ({ window }));
}

export const dynamicParams = false;

export default async function WindowPage({
  params,
}: {
  params: Promise<{ window: string }>;
}) {
  const { window } = await params;
  if (!(WINDOW_IDS as readonly string[]).includes(window)) notFound();
  return <SitePage initialWindow={window as WindowId} />;
}
