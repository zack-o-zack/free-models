import { cn } from "@/lib/utils";

export function SiteLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-2.5", className)}>
      <svg
        aria-hidden="true"
        viewBox="0 0 48 48"
        className="size-10 shrink-0 text-primary sm:size-12"
        fill="none"
      >
        <rect width="48" height="48" rx="15" fill="currentColor" />
        <path
          d="M11 32V16h10M11 23h8M25 32V17l6 7 6-7v15"
          className="stroke-primary-foreground"
          strokeWidth="3.5"
          strokeLinecap="square"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-heading text-xl font-black tracking-[-0.06em] sm:text-2xl">
        free models<span className="text-primary">.</span>
      </span>
    </span>
  );
}
