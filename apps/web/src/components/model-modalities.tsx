import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  AudioLines,
  BookText,
  CircleHelp,
  Database,
  File,
  FileText,
  GitBranch,
  Image,
  ListFilter,
  Mic,
  Type,
  Video,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  decisions: GitBranch,
  audio: AudioLines,
  document: BookText,
  embeddings: Database,
  file: File,
  image: Image,
  pdf: FileText,
  rerank: ListFilter,
  speech: AudioLines,
  text: Type,
  transcript: Mic,
  transcription: Mic,
  video: Video,
};

function ModalityGroup({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-background/60">{label}</dt>
      <dd className="mt-3">
        {values.length > 0 ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-3">
            {values.map((value) => {
              const Icon = icons[value] ?? CircleHelp;
              return (
                <li
                  key={value}
                  className="flex min-w-8 flex-col items-center gap-1.5 text-background/85"
                >
                  <Icon className="size-5" aria-hidden="true" />
                  <span className="text-xs capitalize wrap-anywhere">
                    {value.replaceAll("_", " ")}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <span className="text-xs text-background/60">Not listed</span>
        )}
      </dd>
    </div>
  );
}

export function ModelModalities({ input, output }: { input: string[]; output: string[] }) {
  return (
    <section
      aria-label="Input and output formats"
      className="mt-6 border-t border-background/15 pt-5"
    >
      <div className="flex max-w-xl items-center gap-4 sm:w-fit sm:gap-6">
        <dl className="min-w-0 flex-[2] sm:flex-initial">
          <ModalityGroup label="Input" values={input} />
        </dl>
        <ArrowRight className="mt-5 size-5 shrink-0 text-background/40" aria-hidden="true" />
        <dl className="min-w-0 flex-1 sm:flex-initial">
          <ModalityGroup label="Output" values={output} />
        </dl>
      </div>
    </section>
  );
}
