/** Today's date in the showroom's timezone as YYYY-MM-DD. */
export function todayInShowroom(tz = "America/Los_Angeles"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
}
