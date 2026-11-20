/** 'dd-MM-yyyy' -> 'Nov 16', or 'Nov 16, 2025' with the year. */
export function formatDay(dateKey: string, withYear = false): string {
  const [day, month, year] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: withYear ? 'numeric' : undefined,
  });
}

/** True when the date keys (sorted oldest first) are not all in the same year, so dates need their year. */
export function spansMultipleYears(dates: string[]): boolean {
  const yearOf = (dateKey: string) => dateKey.split('-')[2];
  return dates.length > 0 && yearOf(dates[0]) !== yearOf(dates[dates.length - 1]);
}

/** 'Nov 2 – Nov 16' for date keys sorted oldest first; with years when the span crosses a year. */
export function formatDateSpan(dates: string[]): string {
  const withYear = spansMultipleYears(dates);
  return `${formatDay(dates[0], withYear)} – ${formatDay(dates[dates.length - 1], withYear)}`;
}

/** plural(1, 'goal') -> '1 goal', plural(3, 'match', 'matches') -> '3 matches' */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
