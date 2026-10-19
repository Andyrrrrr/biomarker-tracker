"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { getDb } from "@/db";
import { requireOwner } from "@/lib/auth";
import type { FormState } from "@/lib/forms";
import { SHARE_DURATIONS, expiryAfter } from "@/sharing/durations";
import { createShareLink, deleteShareLink, revokeShareLink } from "@/sharing/links";

const newLink = z.object({
  label: z.string().trim().min(1, "Give the link a name, like who it's for.").max(100),
  expires: z.enum(SHARE_DURATIONS.map((d) => d.value), "Pick how long it lasts."),
});

export type NewShareState = FormState & { url?: string };

// Creates a link and returns its full URL, ready to copy. The Sharing page can copy it again later.
export async function createShareLinkAction(formData: FormData): Promise<NewShareState> {
  await requireOwner();
  const parsed = newLink.safeParse({ label: formData.get("label"), expires: formData.get("expires") });
  if (!parsed.success) {
    const fields = Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]));
    return { message: "Check the highlighted fields.", fields };
  }
  const { days } = SHARE_DURATIONS.find((d) => d.value === parsed.data.expires)!;
  const { token } = await createShareLink(getDb(), {
    label: parsed.data.label,
    expiresAt: days === null ? null : expiryAfter(days),
  });
  const origin = (await headers()).get("origin");
  refresh();
  return { ok: true, url: `${origin}/s/${token}` };
}

export async function revokeShareLinkAction(id: number): Promise<FormState> {
  await requireOwner();
  await revokeShareLink(getDb(), z.number().int().positive().parse(id));
  refresh();
  return { ok: true };
}

export async function deleteShareLinkAction(id: number): Promise<FormState> {
  await requireOwner();
  await deleteShareLink(getDb(), z.number().int().positive().parse(id));
  refresh();
  return { ok: true };
}
