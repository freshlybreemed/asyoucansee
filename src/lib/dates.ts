/** Today's date in the showroom's timezone as YYYY-MM-DD. */
export function todayInShowroom(tz = "America/New_York"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
}
