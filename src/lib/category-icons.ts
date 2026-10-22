// The icons a category can use (picked on manage → Categories). The stored name is the key, so
// renaming one strands the categories that use it. src/components/category-icon.tsx maps each to
// its Lucide icon; its type makes it list exactly these.
export const CATEGORY_ICONS = [
  "activity",
  "apple",
  "atom",
  "baby",
  "bean",
  "biohazard",
  "bone",
  "brain",
  "bug",
  "dna",
  "droplet",
  "dumbbell",
  "ear",
  "eye",
  "fish",
  "flame",
  "flask-conical",
  "gauge",
  "heart-pulse",
  "hourglass",
  "leaf",
  "mars",
  "microscope",
  "moon",
  "pill",
  "salad",
  "scale",
  "shield-check",
  "sparkles",
  "stethoscope",
  "sun-medium",
  "syringe",
  "test-tube",
  "thermometer",
  "venus",
  "waves",
  "wheat",
  "wind",
  "zap",
] as const;

export type CategoryIconName = (typeof CATEGORY_ICONS)[number];

export function isCategoryIcon(name: string): name is CategoryIconName {
  return (CATEGORY_ICONS as readonly string[]).includes(name);
}
