// Parse a "YYYY-MM-DD" string as a local-time Date. `new Date("YYYY-MM-DD")`
// interprets the string as UTC midnight, which renders as the previous day for
// users west of UTC when formatted in local time. Use this helper wherever a
// session date string is converted to a Date for display.
export function parseLocalDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) {
    return new Date(iso);
  }
  return new Date(year, month - 1, day);
}

export function todayLocalISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
