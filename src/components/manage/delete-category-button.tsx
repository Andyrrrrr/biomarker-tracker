"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { deleteCategoryAction } from "@/actions/manage";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "./confirm-button";

// Deletes an empty category after a confirm. A category with biomarkers can't be deleted
// (deleteCategory in src/ingest/edits.ts), so the same button explains how to empty it instead.
export function DeleteCategoryButton({
  category,
  biomarkers,
}: {
  category: { slug: string; name: string };
  biomarkers: { slug: string; name: string; onlyHere: boolean }[];
}) {
  if (!biomarkers.length) {
    return (
      <ConfirmButton
        title="Delete this category?"
        description="It has no biomarkers. This can't be undone."
        confirm="Delete category"
        action={deleteCategoryAction.bind(null, category.slug)}
      >
        <Trash2 /> Delete category
      </ConfirmButton>
    );
  }

  const onlyHere = biomarkers.some((b) => b.onlyHere);
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button type="button" variant="destructive" />}>
        <Trash2 /> Delete category
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Empty this category first</AlertDialogTitle>
          <AlertDialogDescription>
            A category can only be deleted once no biomarkers are in it. {category.name} has{" "}
            {biomarkers.length === 1 ? "1 biomarker" : `${biomarkers.length} biomarkers`}. To move each one out:
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Open the biomarker below.</li>
          <li>Under Categories, uncheck {category.name}.</li>
          {onlyHere && <li>If it&apos;s the only category checked, check another one first; every biomarker needs one.</li>}
          <li>Save, then come back here.</li>
        </ol>
        <ul className="max-h-60 divide-y overflow-y-auto rounded-md border text-sm">
          {biomarkers.map((b) => (
            <li key={b.slug} className="flex items-center justify-between gap-3 px-3 py-2">
              <Link href={`/manage/biomarkers/${b.slug}`} className="font-medium hover:underline">
                {b.name}
              </Link>
              {b.onlyHere && <span className="shrink-0 text-xs text-muted-foreground">Only category</span>}
            </li>
          ))}
        </ul>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
