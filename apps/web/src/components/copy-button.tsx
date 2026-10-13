"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      aria-label={copied ? `${label} copied` : label}
      onClick={copyValue}
      size="icon-xs"
      title={copied ? "Copied" : label}
      variant="ghost"
    >
      {copied ? <Check /> : <Copy />}
    </Button>
  );
}
