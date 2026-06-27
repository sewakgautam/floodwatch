/**
 * Risk computation. DHM's "status" field turns out to be a near-constant value
 * ("BELOW WARNING LEVEL") across almost every station regardless of actual
 * readings — it can't be trusted as the sole signal. So we compute risk from
 * DHM's status AND from real waterLevel-vs-threshold comparison independently,
 * then take whichever is worse. Rainfall flags only escalate, never downgrade.
 */
export function computeRisk({ dhmStatus, waterLevel, warningLevel, dangerLevel, rainfallWarning, rainfallDanger }) {
  const dhm = (dhmStatus ?? '').toUpperCase();
  let dhmRisk = 'NORMAL';
  if (dhm.includes('ABOVE DANGER') || (dhm.includes('DANGER') && !dhm.includes('BELOW'))) {
    dhmRisk = 'CRITICAL';
  } else if (dhm.includes('ABOVE WARNING') || (dhm.includes('WARNING') && !dhm.includes('BELOW'))) {
    dhmRisk = 'WARNING';
  }

  let thresholdRisk = 'NORMAL';
  if (waterLevel != null && warningLevel != null && dangerLevel != null && dangerLevel > warningLevel) {
    if (waterLevel >= dangerLevel) thresholdRisk = 'CRITICAL';
    else if (waterLevel >= warningLevel) thresholdRisk = 'WARNING';
  }

  let risk = SEVERITY_RANK[dhmRisk] >= SEVERITY_RANK[thresholdRisk] ? dhmRisk : thresholdRisk;

  if (rainfallDanger && risk !== 'CRITICAL') risk = 'CRITICAL';
  else if (rainfallWarning && risk !== 'CRITICAL' && risk !== 'WARNING') risk = 'WARNING';

  return risk;
}

export const SEVERITY_RANK = { NORMAL: 0, WATCH: 1, WARNING: 2, CRITICAL: 3 };
