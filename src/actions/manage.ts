"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import {
  addManualReport,
  addResults,
  deleteCategory,
  deleteReport,
  deleteResult,
  editResult,
  EditError,
  mergeBiomarkers,
  reorderBiomarkers,
  reorderCategories,
  saveCategory,
  saveBiomarker,
  updateReport,
} from "@/ingest/edits";
import { requireOwner } from "@/lib/auth";
import {
  addResultsForm,
  biomarkerForm,
  categoryForm,
  fieldErrors,
  manualReportForm,
  readForm,
  reportForm,
  resultForm,
  type FormState,
} from "@/lib/forms";

// The manage pages' Server Actions. Each one is a public POST endpoint, so it checks the caller is
// the signed-in owner and validates every argument, then hands off to src/ingest/edits.ts. Reads aren't
// cached, so refresh() is all a page needs to show the change.

const id = z.number().int().positive();
const slug = z.string().min(1);

// Runs a write; an EditError becomes the form's message instead of an error page.
async function attempt<T>(write: () => Promise<T>): Promise<{ value: T } | { state: FormState }> {
  try {
    return { value: await write() };
  } catch (e) {
    if (e instanceof EditError) return { state: { message: e.message, fields: e.fields } };
    throw e;
  }
}

function invalid(error: z.ZodError): FormState {
  return { message: "Check the highlighted fields.", fields: fieldErrors(error) };
}

export async function saveBiomarkerAction(target: string | null, formData: FormData): Promise<FormState> {
  await requireOwner();
  const current = slug.nullable().parse(target);
  const parsed = biomarkerForm.safeParse(readForm(formData));
  if (!parsed.success) return invalid(parsed.error);
  const saved = await attempt(() => saveBiomarker(getDb(), current, parsed.data));
  if ("state" in saved) return saved.state;
  if (!current) redirect(`/manage/biomarkers/${saved.value}`);
  refresh();
  return { ok: true, message: "Saved." };
}

export async function saveCategoryAction(target: string | null, formData: FormData): Promise<FormState> {
  await requireOwner();
  const current = slug.nullable().parse(target);
  const parsed = categoryForm.safeParse(readForm(formData));
  if (!parsed.success) return invalid(parsed.error);
  const saved = await attempt(() => saveCategory(getDb(), current, parsed.data));
  if ("state" in saved) return saved.state;
  if (!current) redirect(`/manage/categories/${saved.value}`);
  refresh();
  return { ok: true, message: "Saved." };
}

export async function deleteCategoryAction(category: string): Promise<FormState> {
  await requireOwner();
  const deleted = await attempt(() => deleteCategory(getDb(), slug.parse(category)));
  if ("state" in deleted) return deleted.state;
  redirect("/manage/categories");
}

export async function mergeBiomarkerAction(from: string, into: string): Promise<FormState> {
  await requireOwner();
  const merged = await attempt(() => mergeBiomarkers(getDb(), slug.parse(from), slug.parse(into)));
  if ("state" in merged) return merged.state;
  redirect(`/manage/biomarkers/${merged.value.into}`);
}

export async function addReportAction(formData: FormData): Promise<FormState> {
  await requireOwner();
  const parsed = manualReportForm.safeParse(readForm(formData));
  if (!parsed.success) return invalid(parsed.error);
  const added = await attempt(() => addManualReport(getDb(), parsed.data));
  if ("state" in added) return added.state;
  redirect(`/manage/reports/${added.value.reportId}`);
}

export async function addResultsAction(reportId: number, formData: FormData): Promise<FormState> {
  await requireOwner();
  const parsed = addResultsForm.safeParse(readForm(formData));
  if (!parsed.success) return invalid(parsed.error);
  const added = await attempt(() => addResults(getDb(), id.parse(reportId), parsed.data.results));
  if ("state" in added) return added.state;
  refresh();
  return { ok: true };
}

export async function updateReportAction(reportId: number, formData: FormData): Promise<FormState> {
  await requireOwner();
  const parsed = reportForm.safeParse(readForm(formData));
  if (!parsed.success) return invalid(parsed.error);
  await updateReport(getDb(), id.parse(reportId), parsed.data);
  refresh();
  return { ok: true, message: "Saved." };
}

export async function deleteReportAction(reportId: number): Promise<FormState> {
  await requireOwner();
  await deleteReport(getDb(), id.parse(reportId));
  redirect("/manage/reports");
}

export async function editResultAction(resultId: number, formData: FormData): Promise<FormState> {
  await requireOwner();
  const parsed = resultForm.safeParse(readForm(formData));
  if (!parsed.success) return invalid(parsed.error);
  const edited = await attempt(() => editResult(getDb(), id.parse(resultId), parsed.data));
  if ("state" in edited) return edited.state;
  refresh();
  return { ok: true };
}

export async function deleteResultAction(resultId: number): Promise<FormState> {
  await requireOwner();
  await deleteResult(getDb(), id.parse(resultId));
  refresh();
  return { ok: true };
}

const slugs = z.array(slug).max(1000);

export async function reorderCategoriesAction(order: string[]): Promise<FormState> {
  await requireOwner();
  const saved = await attempt(() => reorderCategories(getDb(), slugs.parse(order)));
  if ("state" in saved) return saved.state;
  refresh();
  return { ok: true };
}

export async function reorderBiomarkersAction(category: string, order: string[]): Promise<FormState> {
  await requireOwner();
  const saved = await attempt(() => reorderBiomarkers(getDb(), slug.parse(category), slugs.parse(order)));
  if ("state" in saved) return saved.state;
  refresh();
  return { ok: true };
}
