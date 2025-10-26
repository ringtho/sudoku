export function formatDuration(durationMs: number | null): string {
  if (durationMs === null || Number.isNaN(durationMs) || durationMs < 0) {
    return "—";
  }

  const totalSeconds = Math.floor(durationMs / 1000);
  const clampedSeconds = Math.max(0, totalSeconds);

  const hours = Math.floor(clampedSeconds / 3600);
  const minutes = Math.floor((clampedSeconds % 3600) / 60);
  const seconds = clampedSeconds % 60;

  const hoursPart = hours.toString().padStart(2, "0");
  const minutesPart = minutes.toString().padStart(2, "0");
  const secondsPart = seconds.toString().padStart(2, "0");

  return `${hoursPart}:${minutesPart}:${secondsPart}`;
}
