"use client";

import { Check, Copy, ExternalLink, FileText, Search, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { termsData } from "@/lib/terms-data";
import { cn } from "@/lib/utils";

interface TermsDialogProps {
  className?: string;
  triggerVariant?: "link" | "button" | "ghost" | "outline";
  triggerLabel?: string;
}

export function TermsDialog({
  className,
  triggerVariant = "link",
  triggerLabel = "Terms & Conditions",
}: TermsDialogProps) {
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSections = searchQuery.trim()
    ? termsData.sections.filter(
        (sec) =>
          sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sec.content.some((para) => para.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    : termsData.sections;

  async function handleCopySummary() {
    try {
      await navigator.clipboard.writeText(
        `Terms & Conditions Summary — Free Models (${termsData.lastUpdated})\n\n${termsData.summaryNotice}\n\nTrademark Disclaimer: ${termsData.trademarkDisclaimer}\n\nProvider Claims: ${termsData.providerClaimsDisclaimer}`,
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          triggerVariant === "link" ? (
            <button
              type="button"
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-lg text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
                className,
              )}
            >
              <FileText aria-hidden="true" className="size-3.5" />
              <span>{triggerLabel}</span>
            </button>
          ) : (
            <Button
              variant={triggerVariant === "button" ? "default" : triggerVariant}
              size="sm"
              className={className}
            >
              <FileText aria-hidden="true" className="size-4" />
              <span>{triggerLabel}</span>
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/20 text-primary-foreground">
              <ShieldAlert className="size-4 text-foreground" />
            </span>
            <DialogTitle>Terms & Conditions & Disclaimer</DialogTitle>
          </div>
          <DialogDescription>
            Last updated: {termsData.lastUpdated} · Independent directory, zero ownership of
            third-party models, provider-dependent claims disclaimer.
          </DialogDescription>
        </DialogHeader>

        {/* Search filter tool */}
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search terms, provider disclaimer, trademarks, liability..."
            className="pl-9 text-xs"
            aria-label="Filter terms and conditions sections"
          />
        </div>

        {/* Highlights overview */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {termsData.highlights.map((h) => (
            <div
              key={h.id}
              className="flex flex-col justify-between rounded-xl border border-border/80 bg-muted/40 p-3 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-foreground">{h.title}</span>
                <Badge variant="outline" className="text-[10px]">
                  {h.badge}
                </Badge>
              </div>
              <p className="mt-1 text-muted-foreground leading-relaxed">{h.description}</p>
            </div>
          ))}
        </div>

        {/* Scrollable detailed sections */}
        <ScrollArea className="h-64 rounded-xl border border-border/70 bg-card p-4 text-xs sm:h-72">
          {filteredSections.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No matching sections found for &quot;{searchQuery}&quot;.
            </div>
          ) : (
            <div className="space-y-5">
              {filteredSections.map((sec) => (
                <div key={sec.id} className="space-y-1.5">
                  <h3 className="font-heading font-semibold text-foreground">{sec.title}</h3>
                  {sec.content.map((paragraph) => (
                    <p
                      key={`${sec.id}-${paragraph.slice(0, 32)}`}
                      className="text-muted-foreground leading-relaxed"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="items-center justify-between gap-2 sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopySummary}
              className="text-xs"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-positive" />
                  <span>Copied summary</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  <span>Copy summary</span>
                </>
              )}
            </Button>
            <DialogClose
              render={
                <Link
                  href="/terms"
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span>Full page view</span>
                  <ExternalLink className="size-3.5" />
                </Link>
              }
            />
          </div>

          <DialogClose
            render={
              <Button variant="outline" size="sm" className="text-xs">
                Close
              </Button>
            }
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
