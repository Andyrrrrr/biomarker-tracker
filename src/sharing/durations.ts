// How long a new share link lasts; the create form offers these. Kept apart from links.ts, which
// is server-only, because the form runs in the browser.
// days: null never expires; revoking is then the only way to turn the link off.
export const SHARE_DURATIONS = [
  { value: "7", days: 7, label: "1 week" },
  { value: "30", days: 30, label: "30 days" },
  { value: "90", days: 90, label: "90 days" },
  { value: "365", days: 365, label: "1 year" },
  { value: "never", days: null, label: "Never" },
] as const;

export function expiryAfter(days: number, now = new Date()): Date {
  return new Date(now.getTime() + days * 24 * 3600 * 1000);
}
