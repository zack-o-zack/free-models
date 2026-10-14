"use client";

import type { ComponentProps } from "react";
import { AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function BrandImage({ className, ...props }: ComponentProps<typeof AvatarImage>) {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] bg-logo-surface"
      />
      <AvatarImage {...props} className={cn("brand-image", className)} />
    </>
  );
}
