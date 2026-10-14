"use client";

import type { ComponentProps } from "react";
import { AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function BrandImage({ className, ...props }: ComponentProps<typeof AvatarImage>) {
  return <AvatarImage {...props} className={cn("brand-image bg-logo-surface", className)} />;
}
