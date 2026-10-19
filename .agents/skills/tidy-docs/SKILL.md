---
name: tidy-docs
description: The periodic docs pass. Brings AGENTS.md, docs/ and the decision log back in line with the code and inside their budgets, cutting stories to rule + why + pointer, merging duplicates, marking reversed decisions and archiving finished plans. Use when the docs check reports a doc over budget, before a release, or when asked to tidy the docs.
---

# tidy-docs

Docs left alone only grow, because every session adds and none removes, and the extra copies start
contradicting the code. This pass is the removing half. The rules it enforces are
`How these docs work` in `AGENTS.md`; this file is the procedure.

Work one doc at a time, and read each doc in full before editing it. **Never drop a rule, or the
reasoning that makes it usable.** A story becomes a rule plus a pointer; if you're unsure whether a
sentence is load-bearing, keep it. A pass that loses a rule is worse than no pass, and a budget is a
prompt to look, not a target to hit.

## 1. Measure

Run the docs check named in `AGENTS.md` (budgets, broken links), then see what grew:

```bash
git log --grep "tidy-docs" --oneline -1                  # the last pass
git log --since="<last pass>" --stat -- AGENTS.md docs   # what grew since
```

Start with the docs over budget, then the ones that grew most.

## 2. Sort each section

| Kind                                                                | What to do                                                                                                                                                                                       |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A current rule or reference                                         | Keep it, tightened.                                                                                                                                                                              |
| The why behind a rule                                               | Keep enough that someone who wasn't there can apply it. Longer history belongs in a decision entry, linked.                                                                                      |
| A story: measurements, log excerpts, false trails, "on 2026-09-16…" | Cut to the rule, one sentence of why and a pointer. Find the issue with `gh issue list --state all --search` and the commit with `git log -S`; if neither holds it, the commit removing it does. |
| Stale                                                               | Fix it, or delete it if the thing is gone. Check the code first (step 3).                                                                                                                        |
| Duplicated                                                          | Keep the copy in the fact's home (the map in `AGENTS.md`) and link to it from everywhere else.                                                                                                   |
| Derivable from code: file lists, option lists, sizes, UI copy       | Name the file and keep only what's not obvious from it.                                                                                                                                          |
| A procedure                                                         | Move it to a skill, or to `scripts/` if it can run unattended.                                                                                                                                   |
| Lifecycle state: pending checks, open questions, to-dos             | Remove it and list it for the user, who decides whether it becomes an issue.                                                                                                                     |

## 3. Verify against the code

Every claim that names a file, a function, a component, a count or a value can be checked: grep for
it, `ls`, or read the code. Typical finds: a function described in detail that no longer exists, a
count that's off, a feature described under its old behavior, a plan marked "not started" that
shipped. Fix what's wrong. If you can't verify a claim, keep it and say so in the report.

## 4. Decisions

- **The index matches the files.** Every entry has one index line, and every line points at a file
  that exists.
- **Reversals are marked.** When a later entry reverses an earlier one, the earlier entry's Status
  and index line say so. Search for pairs on the same subject: two entries that both look current
  are the most dangerous thing in the log, because a search finds the stale one first.
- **An entry that restates a current rule** keeps its why and links to the rule's home rather than
  repeating it.

## 5. Finished plans

A plan, spike or review whose work has shipped moves to `docs/archive/` with `git mv`. First copy
anything still load-bearing (a rule, a rejected alternative, a constraint) into a living doc or a
decision entry; then mark the file as archived and repoint every link to it.

## 6. Check and report

Run the docs check and the formatter again. Grep for any heading you renamed, since docs and code
comments cite sections by name.

Then report each doc's size before and after, what moved where, the contradictions you fixed with
the code evidence, and any lifecycle items that need a decision. Put "tidy-docs" in the commit
subject so the next pass can find this one.
