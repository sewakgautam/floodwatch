// Ported from the old Flood-warn-backend src/nepal-sync/nepal-sync.service.ts.
// Single page gives us both river stations and rainfall stations in one fetch.
const DHM_FLOOD_MONITORING = 'https://dhm.gov.np/hydrology/floodMonitoring';

/**
 * Finds `(var|const|let) <varName> = [`, then scans forward tracking bracket/string
 * depth to find the real matching `]` — a non-greedy regex boundary like `\];` breaks
 * if any string inside the array happens to contain `]` or `;`.
 */
function extract(html, varName) {
  const start = html.match(new RegExp(`(?:var|const|let)\\s+${varName}\\s*=\\s*\\[`));
  if (!start) throw new Error(`${varName} not found in floodMonitoring HTML`);

  const openIdx = start.index + start[0].length - 1; // position of the opening '['
  let depth = 0;
  let inString = null; // '"' or "'" while inside a string literal, else null
  for (let i = openIdx; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (ch === '\\') { i++; continue; } // skip escaped char
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'") { inString = ch; continue; }
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) return JSON.parse(html.slice(openIdx, i + 1));
    }
  }
  throw new Error(`${varName}: unbalanced brackets in floodMonitoring HTML`);
}

/** DHM sends "N/A" (string) for missing readings — parseFloat("N/A") silently returns NaN. */
function toNumber(val) {
  if (val == null) return null;
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : null;
}

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in km — plain lat/lon Euclidean distance distorts badly at Nepal's latitudes. */
function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** Find the nearest rainfall station within 15 km. */
function nearestRainfall(lat, lon, list) {
  const THRESHOLD_KM = 15;
  let best = null;
  for (const r of list) {
    const dist = haversineKm(lat, lon, r.lat, r.lon);
    if (dist < THRESHOLD_KM && (best === null || dist < best.dist)) best = { dist, data: r };
  }
  return best?.data ?? null;
}

export async function fetchDhmStations() {
  const res = await fetch(DHM_FLOOD_MONITORING, {
    signal: AbortSignal.timeout(25000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const rawRiver = extract(html, 'riverwatch_coordinates');
  const rawRainfall = extract(html, 'rainfall_coordinates');

  const riverStations = rawRiver
    .filter((s) => s.id && s.name)
    .map((s) => {
      const elevation = toNumber(s.elevation);
      const rawLevel = toNumber(s.waterLevel?.value);
      const rawWarning = toNumber(s.warning_level);
      const rawDanger = toNumber(s.danger_level);

      // DHM mixes absolute MASL and gauge-height readings in the same feed.
      // If a value is > 50% of the station's base elevation it is in MASL → subtract.
      const toGauge = (val) => {
        if (val == null) return null;
        if (elevation != null && val > elevation * 0.5) return Math.round((val - elevation) * 1000) / 1000;
        if (elevation == null && val > 20) return null;
        return val;
      };

      const trendRaw = (s.steady ?? '').toUpperCase();
      const trend = ['RISING', 'FALLING', 'STEADY'].includes(trendRaw) ? trendRaw : null;

      return {
        dhmId: String(s.id),
        seriesId: s.series_id != null ? String(s.series_id) : null, // lets us pull DHM's own historical series for this gauge
        name: s.name.trim(),
        basin: s.basin || '',
        district: s.district || '',
        lat: toNumber(s.latitude),
        lon: toNumber(s.longitude),
        elevation,
        waterLevel: toGauge(rawLevel),
        warningLevel: toGauge(rawWarning),
        dangerLevel: toGauge(rawDanger),
        trend,
        trendRaw: trendRaw || null, // preserved in case DHM adds a value we don't normalize yet
        dhmStatus: (s.status ?? '').toUpperCase(),
      };
    });

  // averages array: [{interval:1,value,status:{warning,danger}}, {interval:3}, {interval:6}, {interval:12}, {interval:24}]
  const rainfallStations = rawRainfall
    .filter((s) => s.id && s.latitude != null && s.longitude != null)
    .map((s) => {
      const avgs = s.averages ?? [];
      // DHM sends `interval` as a string ("6"), so compare loosely rather than === a number.
      const get = (interval) => avgs.find((a) => Number(a.interval) === interval);
      const avg6h = get(6);
      const avg24h = get(24);
      return {
        lat: toNumber(s.latitude),
        lon: toNumber(s.longitude),
        mm6h: toNumber(avg6h?.value),
        mm24h: toNumber(avg24h?.value),
        rainfallWarning: avg6h?.status?.warning ?? false,
        rainfallDanger: avg6h?.status?.danger ?? false,
      };
    });

  const rainfallList = rainfallStations.filter((r) => r.lat != null && r.lon != null);

  return riverStations.map((s) => {
    const nearestRain = s.lat != null && s.lon != null ? nearestRainfall(s.lat, s.lon, rainfallList) : null;
    return { ...s, rainfall: nearestRain };
  });
}
