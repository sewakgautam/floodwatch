// Bounded rolling history per station — NOT an unlimited time-series collection
// (that's exactly the pattern that killed query performance on the old Postgres
// VPS backend). Each station doc keeps at most MAX_HISTORY readings.
export const MAX_HISTORY = 8;

/** Appends a reading and trims to MAX_HISTORY, dropping the oldest. */
export function appendHistory(history, level, timestampMs) {
  const next = [...(history ?? []), { t: timestampMs, level }];
  return next.slice(-MAX_HISTORY);
}

/**
 * Estimates rise rate (m/hour) from the oldest vs newest reading in the window,
 * and how many hours until it would hit dangerLevel at that rate. Requires at
 * least 3 points and a consistently rising trend to avoid reacting to one noisy
 * sensor blip — a single bad reading shouldn't trigger a predictive escalation.
 */
export function estimateRise(history, dangerLevel) {
  if (!history || history.length < 3) return null;

  const consistentlyRising = history.every((pt, i) => i === 0 || pt.level >= history[i - 1].level);
  if (!consistentlyRising) return null;

  const oldest = history[0];
  const newest = history[history.length - 1];
  const hoursElapsed = (newest.t - oldest.t) / (1000 * 60 * 60);
  if (hoursElapsed <= 0) return null;

  const rateMPerHour = (newest.level - oldest.level) / hoursElapsed;
  if (rateMPerHour <= 0) return null;

  const hoursToDanger = dangerLevel != null && newest.level < dangerLevel
    ? (dangerLevel - newest.level) / rateMPerHour
    : null;

  return { rateMPerHour, hoursToDanger };
}
