/**
 * Places 1-3 with ties sharing a place (1, 2, 2, then no 3). At most `limit` rows.
 */
export function rankTopThree<T extends { value: number }>(entries: T[], better: 'high' | 'low' = 'high', limit = 5): (T & { rank: number })[] {
  const sorted = [...entries].sort((first, second) => better === 'low' ? first.value - second.value : second.value - first.value);
  const ranked: (T & { rank: number })[] = [];
  sorted.forEach((entry, index) => {
    const rank = index > 0 && sorted[index - 1].value === entry.value ? ranked[index - 1].rank : index + 1;
    ranked.push({ ...entry, rank });
  });
  return ranked.filter(entry => entry.rank <= 3).slice(0, limit);
}
