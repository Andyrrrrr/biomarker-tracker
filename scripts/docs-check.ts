// npm run docs:check — every doc against its size budget, and every doc path resolving.
// Exits 1 if a doc is over budget or a path is broken.
//
// Why budgets: AGENTS.md loads every session, and a session adds to the docs far more often than
// it trims them. A budget turns "this doc is getting long" into a number a session checks before
// adding to it (AGENTS.md → How these docs work).
//
// A budget is a prompt to look, not a limit. A doc over budget gets the tidy-docs pass, looking
// for stories (cut to rule + why + pointer) and duplicates (replace with a link), before anything
// new goes in. If what's there is genuinely rules, raise the budget and say why in the commit
// message; never cut a rule, or the why that makes it usable, to hit a number.
//
// Budgets ratchet down: when a tidy pass leaves a doc smaller, lower its budget here to the new
// size plus ~5%. They don't just hold the line. The budgets live here and nowhere else.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

// Set 2026-10-26 at each doc's size plus ~5%, before any tidy pass, so they are ceilings.
const BUDGET_KB: Record<string, number> = {
  "AGENTS.md": 9.5,
  ".agents/skills/ingest-labs/SKILL.md": 4.5,
};
// docs/decisions/README.md has no budget: it's an index and grows by one line per decision.
const AGENTS_MAX_LINES = 155;
// Each docs/decisions/<entry>.md: a guideline. Long entries are listed for a tidy pass, never failed.
const DECISION_KB = 3;

// The docs this project maintains. Vendored and harness-copied skills (supabase, tidy-docs) aren't
// ours to fix, so their paths aren't checked.
const DOC_ROOTS = ["AGENTS.md", "README.md", "SECURITY.md", "docs", ".agents/skills/ingest-labs"];

/** Repo paths a doc names in backticks, or code names in comments: `src/…`, `docs/…`, … */
export function findPathRefs(text: string): string[] {
  const refs = new Set<string>();
  for (const [, path] of text.matchAll(/`((?:src|docs|scripts|\.agents\/skills)\/[^`\s]*)`/g)) refs.add(path);
  for (const [, path] of text.matchAll(/(?<![\w./-])((?:docs|\.agents\/skills)\/[\w./-]*[\w/])/g)) refs.add(path);
  // A template like docs/decisions/YYYY-MM-DD-slug.md names a shape, not a file.
  return [...refs].filter((path) => !/YYYY|</.test(path));
}

/** Relative Markdown link targets, without any #anchor; web links and in-page anchors skipped. */
export function findRelativeLinks(text: string): string[] {
  return [...text.matchAll(/\]\(([^)\s]+)\)/g)]
    .map(([, target]) => target)
    .filter((target) => !/^(https?|mailto):|^#/.test(target))
    .map((target) => target.split("#")[0]);
}

function filesUnder(path: string, extensions: string[]): string[] {
  if (!existsSync(path)) return [];
  if (statSync(path).isFile()) return [path];
  return readdirSync(path, { recursive: true, encoding: "utf8" })
    .map((name) => join(path, name))
    .filter((file) => extensions.some((ext) => file.endsWith(ext)));
}

const kb = (file: string) => statSync(file).size / 1024;

function main() {
  let failed = false;

  console.log("Docs against their budgets:");
  for (const [file, budget] of Object.entries(BUDGET_KB)) {
    if (!existsSync(file)) {
      console.log(`  ${file.padEnd(40)} missing`);
      failed = true;
      continue;
    }
    const over = kb(file) > budget;
    failed ||= over;
    console.log(`  ${file.padEnd(40)} ${kb(file).toFixed(1).padStart(5)} KB / ${budget} KB  ${over ? "OVER" : "ok"}`);
  }
  const lines = readFileSync("AGENTS.md", "utf8").split("\n").length;
  failed ||= lines > AGENTS_MAX_LINES;
  console.log(`  ${"AGENTS.md".padEnd(40)} ${String(lines).padStart(5)} lines / ${AGENTS_MAX_LINES}  ${lines > AGENTS_MAX_LINES ? "OVER" : "ok"}`);

  const entries = filesUnder("docs/decisions", [".md"]).filter((file) => !file.endsWith("README.md"));
  const long = entries.filter((file) => kb(file) > DECISION_KB);
  console.log(`  ${"docs/decisions/ entries".padEnd(40)} ${entries.length} files, ${long.length} longer than ${DECISION_KB} KB (fine if the reasoning needs it)`);
  for (const file of long) console.log(`      ${file} (${kb(file).toFixed(1)} KB)`);

  console.log("\nDoc paths:");
  const broken: string[] = [];
  const sources = [
    ...DOC_ROOTS.flatMap((root) => filesUnder(root, [".md"])).map((file) => ({ file, markdown: true })),
    ...filesUnder("src", [".ts", ".tsx"]).map((file) => ({ file, markdown: false })),
  ];
  for (const { file, markdown } of sources) {
    const text = readFileSync(file, "utf8");
    // Code is only checked for doc paths; its imports are the compiler's job.
    const refs = findPathRefs(text).filter((ref) => markdown || /^(docs|\.agents)\//.test(ref));
    for (const ref of refs) if (!existsSync(ref)) broken.push(`${ref}\n           cited in ${file}`);
    if (!markdown) continue;
    for (const link of findRelativeLinks(text)) {
      if (!existsSync(join(dirname(file), link))) broken.push(`${link}\n           linked from ${file}`);
    }
  }
  for (const line of broken) console.log(`  missing: ${line}`);
  if (broken.length === 0) console.log("  all resolve");

  if (failed) console.log("\nOver budget: run the tidy-docs pass; if it's all rules, raise the budget (AGENTS.md → How these docs work).");
  if (broken.length > 0) console.log("\nBroken paths: point them at the file's current home.");
  if (failed || broken.length > 0) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
