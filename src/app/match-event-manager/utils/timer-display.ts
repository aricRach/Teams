export function formatElapsedMsAsMmSs(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function elapsedMsToGameMinute(elapsedMs: number): number {
  return Math.floor(elapsedMs / 60000);
}

export function isValidMmSs(value: string): boolean {
  if (!value) return false;
  return /^\d{1,3}:[0-5]\d$/.test(value);
}

export function parseMmSsToMinute(value: string): number {
  if (!isValidMmSs(value)) return 0;
  const [mm] = value.split(':');
  return parseInt(mm, 10);
}

export function parseMmSsToMs(value: string): number {
  if (!isValidMmSs(value)) return 0;
  const [mm, ss] = value.split(':');
  const minutes = parseInt(mm, 10);
  const seconds = parseInt(ss, 10);
  return (minutes * 60 + seconds) * 1000;
}
