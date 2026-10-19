import { z } from "zod";
import { reportSource } from "@/db/schema";

// The file an agent writes after reading a lab report (imports/*.json, gitignored). Everything is
// copied as printed; parsing, matching and unit conversion happen in plan.ts.
export const stagingSchema = z.object({
  report: z.object({
    source: z.enum(reportSource.enumValues),
    // Quest: the specimen ID. Sources without one: the collection date.
    externalId: z.string().min(1),
    lab: z.string().nullish(),
    collectedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD"),
    collectedTime: z.string().nullish(),
    orderingAccount: z.string().nullish(),
    fasting: z.boolean().nullish(),
    sourceFile: z.string().nullish(),
    notes: z.string().nullish(),
  }),
  results: z
    .array(
      z.object({
        name: z.string().min(1),
        value: z.string().min(1),
        unit: z.string().nullish(),
        range: z.string().nullish(),
        flag: z.string().nullish(),
        calculated: z.boolean().optional(),
        // A biomarker slug, only when the printed name doesn't match on its own.
        biomarker: z.string().optional(),
        notes: z.string().nullish(),
      }),
    )
    .min(1),
});

export type Staging = z.infer<typeof stagingSchema>;
export type StagingRow = Staging["results"][number];
