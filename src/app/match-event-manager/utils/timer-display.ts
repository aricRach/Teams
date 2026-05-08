/** Elapsed ms → "mm:ss" (same idea as stopwatch display). */
export function formatElapsedMsAsMmSs(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Game "minute" bucket from elapsed time (floor of full minutes). */
export function elapsedMsToGameMinute(elapsedMs: number): number {
  return Math.floor(elapsedMs / 60000);
}

/** Validates "mm:ss" or "m:ss" format. */
export function isValidMmSs(value: string): boolean {
  if (!value) return false;
  return /^\d{1,3}:[0-5]\d$/.test(value);
}

/** Parses "mm:ss" to the integer minute (floor). E.g. "12:34" -> 12. */
export function parseMmSsToMinute(value: string): number {
  if (!isValidMmSs(value)) return 0;
  const [mm] = value.split(':');
  return parseInt(mm, 10);
}

/** Parses "mm:ss" or "m:ss" to total milliseconds. */
export function parseMmSsToMs(value: string): number {
  if (!isValidMmSs(value)) return 0;
  const [mm, ss] = value.split(':');
  const minutes = parseInt(mm, 10);
  const seconds = parseInt(ss, 10);
  return (minutes * 60 + seconds) * 1000;
}
