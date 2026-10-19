// Lab names vary in case, spacing and comma spacing ("VITAMIN D,25-OH" vs "Vitamin D, 25-OH").
// Every alias is stored in this form and every incoming name is compared in it.
export function normalizeName(name: string): string {
  return name
    .toUpperCase()
    .replace(/\s*,\s*/g, ",")
    .replace(/\s+/g, " ")
    .trim();
}
