import type { ReactNode } from "react";
import type { RendererId, VfsFile } from "@/lib/vfs/types";
import { About } from "@/components/content/About";
import { Uses } from "@/components/content/Uses";
import { Resume } from "@/components/content/Resume";
import { ContactCard } from "./ContactCard";
import { CodeBlock } from "./CodeBlock";
import { Markdown } from "./Markdown";
import { ProjectReadme } from "./ProjectReadme";

/**
 * RendererId → rich `cat` output. The raw markdown in the file is always the
 * vim-viewer source of truth; these are nicer inline presentations of the
 * same data (both read from data/).
 */
const RENDERERS: Record<RendererId, (file: VfsFile) => ReactNode> = {
  about: () => <About />,
  uses: () => <Uses />,
  resume: () => <Resume />,
  contact: () => <ContactCard />,
  "project-readme": (file) => <ProjectReadme slug={file.meta} raw={file.raw} />,
};

export function renderFile(file: VfsFile): ReactNode {
  if (file.download) {
    return (
      <div className="space-y-2">
        <pre className="whitespace-pre-wrap font-mono text-sm text-fg">{file.raw}</pre>
        <p>
          <a href={file.download} download className="text-accent">
            ⇩ download {file.name}
          </a>
        </p>
      </div>
    );
  }
  if (file.render) {
    const node = RENDERERS[file.render](file);
    if (node !== null) return node;
  }
  if (file.language === "markdown") {
    return <Markdown source={file.raw} />;
  }
  if (file.language !== "text") {
    return <CodeBlock raw={file.raw} language={file.language} />;
  }
  return <pre className="whitespace-pre-wrap font-mono text-sm text-fg">{file.raw}</pre>;
}
