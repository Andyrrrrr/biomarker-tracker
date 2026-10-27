import { describe, expect, it } from "vitest";
import { findPathRefs, findRelativeLinks } from "./docs-check";

describe("findPathRefs", () => {
  it("finds backticked repo paths, including route groups and dynamic segments", () => {
    const text = "See `src/app/(owner)/manage/` and `src/app/s/[token]/`, then `src/lib/auth.ts`.";
    expect(findPathRefs(text)).toEqual(["src/app/(owner)/manage/", "src/app/s/[token]/", "src/lib/auth.ts"]);
  });

  it("finds bare doc paths in code comments, without trailing punctuation", () => {
    const text = "// Why: docs/decisions/2026-10-16-hand-edits-reimport.md.\n// See .agents/skills/ingest-labs/SKILL.md";
    expect(findPathRefs(text)).toEqual([
      "docs/decisions/2026-10-16-hand-edits-reimport.md",
      ".agents/skills/ingest-labs/SKILL.md",
    ]);
  });

  it("skips templates and paths that aren't repo-rooted", () => {
    expect(findPathRefs("Name it `docs/decisions/YYYY-MM-DD-short-slug.md`.")).toEqual([]);
    expect(findPathRefs("Routes under `export/[format]/`; see https://example.com/docs/page")).toEqual([]);
  });
});

describe("findRelativeLinks", () => {
  it("keeps relative targets without anchors, and skips web links and in-page anchors", () => {
    const text = "[a](README.md) [b](docs/x.md#why) [c](https://example.com) [d](#top) [e](mailto:a@b.c)";
    expect(findRelativeLinks(text)).toEqual(["README.md", "docs/x.md"]);
  });
});
