import { describe, expect, it } from "vitest";
import { compareByCategory, reorderWithin } from "./order";

describe("reorderWithin", () => {
  it("swaps members within the slots they hold", () => {
    expect(reorderWithin(["a", "x", "b", "y", "c"], ["c", "a", "b"])).toEqual(["c", "x", "a", "y", "b"]);
  });

  it("leaves the list alone when the order is unchanged", () => {
    expect(reorderWithin(["a", "b", "c"], ["a", "b", "c"])).toEqual(["a", "b", "c"]);
  });

  it("ignores slugs that aren't in the list", () => {
    expect(reorderWithin(["a", "b"], ["b", "gone", "a"])).toEqual(["b", "a"]);
  });
});

describe("compareByCategory", () => {
  it("sorts by category, then biomarker order, then id", () => {
    const rows = [
      { name: "late", categoryOrder: 1, sortOrder: 0, id: 1 },
      { name: "tie-b", categoryOrder: 0, sortOrder: 5, id: 3 },
      { name: "tie-a", categoryOrder: 0, sortOrder: 5, id: 2 },
      { name: "first", categoryOrder: 0, sortOrder: 1, id: 9 },
    ];
    expect(rows.sort(compareByCategory).map((r) => r.name)).toEqual(["first", "tie-a", "tie-b", "late"]);
  });
});
