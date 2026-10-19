"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Copies a share link's full URL, built from wherever the app is running.
export function CopyLinkButton({ token, label }: { token: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/s/${token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  // The slot is sized by an invisible copy of the wider "Copied" state, so the row never shifts;
  // the real button sits at its natural width against the slot's right edge.
  return (
    <span className="inline-grid">
      <span aria-hidden className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "invisible col-start-1 row-start-1")}>
        <Check /> Copied
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={copy}
        aria-label={`Copy the link for ${label}`}
        className="col-start-1 row-start-1 justify-self-end"
      >
        {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
      </Button>
    </span>
  );
}
