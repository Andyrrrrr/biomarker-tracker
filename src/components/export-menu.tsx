"use client";

import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// The header's download button. Each item is a plain link: the export/[format] route handlers send
// the file as a download. `basePath` is "" for the owner, "/s/<token>" on a share link.
export function ExportMenu({ basePath = "" }: { basePath?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Download results" />}>
        <Download />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem render={<a href={`${basePath}/export/pdf`} download />}>
          <FileText /> PDF
        </DropdownMenuItem>
        <DropdownMenuItem render={<a href={`${basePath}/export/csv`} download />}>
          <FileSpreadsheet /> CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
