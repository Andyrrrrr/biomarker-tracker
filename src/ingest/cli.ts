// npm run ingest -- <command>
//
//   plan <file.json>                       show what importing the staging file would do
//   apply <file.json> [--replace-conflicts] write it (refuses while the plan has blockers)
//   reports                                list stored reports
//
// Reads DATABASE_URL from .env.local. See .agents/skills/ingest-labs/SKILL.md for the workflow.
import { readFile } from "node:fs/promises";
import { config } from "dotenv";
import { asc, count, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { reports, results } from "@/db/schema";
import { sameUnit } from "@/lib/units";
import { applyImport, BlockedImportError } from "./apply";
import { BLOCKING, blockers, planImport, type Plan } from "./plan";
import { stagingSchema } from "./staging";

config({ path: ".env.local", quiet: true });

const [command, file, ...flags] = process.argv.slice(2);

async function readStaging(path: string | undefined) {
  if (!path) throw new Error("Pass the staging file path.");
  const parsed = stagingSchema.safeParse(JSON.parse(await readFile(path, "utf8")));
  if (!parsed.success) {
    console.error(`${path} doesn't match the staging format:`);
    for (const issue of parsed.error.issues) console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    process.exit(1);
  }
  return parsed.data;
}

const LABEL: Record<Plan["items"][number]["kind"], string> = {
  new: "New",
  replaces: "Replaces a lower-ranked source",
  identical: "Already stored (skip)",
  covered: "Covered by a higher-ranked source (skip)",
  conflict: "CONFLICT: stored with a different value",
  unit: "UNIT PROBLEM",
  duplicate: "DUPLICATE in this file",
  unmatched: "UNMATCHED name",
  invalid: "INVALID",
};

function printPlan(plan: Plan) {
  const { report } = plan.staging;
  console.log(
    `${report.source} ${report.externalId}, collected ${report.collectedOn}` +
      (plan.reportExists ? " (report already stored)" : " (new report)"),
  );
  const order = Object.keys(LABEL) as (keyof typeof LABEL)[];
  for (const kind of order) {
    const items = plan.items.filter((i) => i.kind === kind);
    if (!items.length) continue;
    console.log(`\n${LABEL[kind]}: ${items.length}`);
    for (const item of items) {
      const where = `  #${item.line} ${item.row.name} = ${item.row.value}${item.row.unit ? ` ${item.row.unit}` : ""}`;
      const target = "biomarker" in item ? ` → ${item.biomarker.slug}` : "";
      let detail = "";
      if ("value" in item && item.value.valueNumeric !== null && !sameUnit(item.row.unit, item.biomarker.unit)) {
        detail = ` (stored as ${item.value.valueNumeric} ${item.biomarker.unit})`;
      }
      if (item.kind === "conflict" || item.kind === "identical" || item.kind === "covered") {
        detail += ` [stored: ${item.existing.value} from ${item.existing.source} ${item.existing.externalId}]`;
      }
      if (item.kind === "replaces") {
        detail += ` [replaces ${item.existing.map((e) => `${e.value} from ${e.source}`).join(", ")}]`;
      }
      if (item.kind === "new" && item.sameDay.length) {
        detail += ` [same day, also kept: ${item.sameDay.map((e) => `${e.value} from ${e.source} ${e.externalId}`).join(", ")}]`;
      }
      if (item.kind === "unit" || item.kind === "invalid") detail += `: ${item.reason}`;
      if (item.kind === "duplicate") detail += `: same biomarker as #${item.firstLine}`;
      console.log(where + target + detail);
    }
  }
  const blocking = blockers(plan);
  console.log(
    blocking.length
      ? `\n${blocking.length} blocker(s) (${BLOCKING.join(", ")}). Resolve them before applying.`
      : "\nNo blockers. Ready to apply.",
  );
}

async function main() {
  const db = getDb();

  if (command === "plan") {
    printPlan(await planImport(db, await readStaging(file)));
  } else if (command === "apply") {
    try {
      const summary = await applyImport(db, await readStaging(file), {
        replaceConflicts: flags.includes("--replace-conflicts"),
      });
      console.log("Applied:", summary);
    } catch (e) {
      if (e instanceof BlockedImportError) {
        printPlan(e.plan);
        process.exitCode = 1;
      } else throw e;
    }
  } else if (command === "reports") {
    const rows = await db
      .select({
        collectedOn: reports.collectedOn,
        source: reports.source,
        externalId: reports.externalId,
        sourceFile: reports.sourceFile,
        results: count(results.id),
      })
      .from(reports)
      .leftJoin(results, eq(results.reportId, reports.id))
      .groupBy(reports.id)
      .orderBy(asc(reports.collectedOn));
    console.table(rows);
  } else {
    console.log("Usage: npm run ingest -- plan|apply <file.json> [--replace-conflicts] | reports");
    process.exitCode = 1;
  }
}

main().then(() => process.exit());
