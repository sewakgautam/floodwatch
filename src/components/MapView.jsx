'use client';

import '@/lib/i18n';
import { useEffect, useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';
import LanguageToggle from './LanguageToggle.jsx';

const RISK_COLOR = {
  NORMAL: { hex: '#22c55e', bg: '#052e16' },
  WATCH: { hex: '#eab308', bg: '#1c1a03' },
  WARNING: { hex: '#f97316', bg: '#1c0a03' },
  CRITICAL: { hex: '#ef4444', bg: '#1f0303' },
  OFFLINE: { hex: '#64748b', bg: '#1e293b' },
};

function riskOf(s) {
  return RISK_COLOR[s.risk] ?? RISK_COLOR.NORMAL;
}

const TREND_ARROW = { RISING: '↑', FALLING: '↓', STEADY: '→' };
const TREND_COLOR = { RISING: '#ef4444', FALLING: '#22c55e', STEADY: '#94a3b8' };

function makeIcon(station, riskLabels) {
  const rc = riskOf(station);
  const level = station.riverLevel?.levelM;
  const levelText = level != null ? `${level.toFixed(2)} m` : '— m';
  const isOffline = station.status === 'OFFLINE';
  const isCritical = station.risk === 'CRITICAL';
  const label = isOffline ? (riskLabels.OFFLINE ?? 'Offline') : (riskLabels[station.risk] ?? station.risk);

  const trendArrow = station.trend ? TREND_ARROW[station.trend] ?? '' : '';
  const trendColor = station.trend ? TREND_COLOR[station.trend] ?? '#94a3b8' : rc.hex;

  const pulse = isCritical
    ? `<span style="position:absolute;top:-3px;right:-3px;width:10px;height:10px;border-radius:50%;background:${rc.hex};opacity:0.5;animation:pulse 1.4s infinite;"></span>`
    : '';

  const html = `
    <div style="position:relative;font-family:sans-serif;user-select:none;">
      ${pulse}
      <div style="background:${rc.bg};border:2px solid ${rc.hex};border-radius:10px 10px 10px 2px;padding:5px 9px 4px;min-width:82px;box-shadow:0 2px 12px rgba(0,0,0,0.55);backdrop-filter:blur(4px);">
        <div style="display:flex;align-items:baseline;gap:4px;">
          <div style="font-size:15px;font-weight:700;color:${rc.hex};letter-spacing:-0.3px;line-height:1;margin-bottom:3px;">${levelText}</div>
          ${trendArrow ? `<span style="font-size:13px;font-weight:700;color:${trendColor};line-height:1;">${trendArrow}</span>` : ''}
        </div>
        <div style="font-size:9.5px;color:rgba(255,255,255,0.65);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:96px;line-height:1.1;margin-bottom:3px;">${station.name}</div>
        <div style="display:flex;align-items:center;gap:4px;">
          <span style="width:6px;height:6px;border-radius:50%;background:${isOffline ? '#64748b' : rc.hex};flex-shrink:0;display:inline-block;"></span>
          <span style="font-size:9px;font-weight:600;color:${isOffline ? '#64748b' : rc.hex};text-transform:uppercase;letter-spacing:0.5px;">${label}</span>
        </div>
      </div>
      <div style="width:0;height:0;border-left:5px solid transparent;border-right:0px solid transparent;border-top:7px solid ${rc.hex};margin-left:2px;"></div>
    </div>
    <style>@keyframes pulse{0%,100%{transform:scale(1);opacity:0.5;}50%{transform:scale(2.2);opacity:0;}}</style>
  `;

  return L.divIcon({ html, className: '', iconAnchor: [10, 0], popupAnchor: [45, -10] });
}

function SubscribeButton({ stationId, currentUser, existingSubscription, onSubscribed }) {
  const { t, i18n } = useTranslation();
  const [severity, setSeverity] = useState(existingSubscription?.severity ?? 'WARNING');
  const [status, setStatus] = useState('idle'); // idle | editing | loading | done | error
  const [message, setMessage] = useState('');

  const subscribe = async () => {
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }
    setStatus('loading');
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationId, severity, lang: i18n.language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to subscribe');
      setMessage(data.message);
      setStatus('done');
      onSubscribed?.(stationId, severity);
    } catch (e) {
      setMessage(e.message);
      setStatus('error');
    }
  };

  if (status !== 'editing' && status !== 'loading' && status !== 'error' && existingSubscription) {
    return (
      <div style={{ marginTop: 10, padding: '7px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7, fontSize: 11, color: '#16a34a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
        <span>✓ Subscribed at {existingSubscription.severity}+</span>
        <button onClick={() => setStatus('editing')} style={{ background: 'none', border: 'none', color: '#16a34a', fontWeight: 700, fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>
          Change
        </button>
      </div>
    );
  }

  if (status === 'done') {
    return <div style={{ marginTop: 8, fontSize: 11, color: '#16a34a', fontWeight: 600 }}>✓ {message}</div>;
  }

  return (
    <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
      <select value={severity} onChange={(e) => setSeverity(e.target.value)} style={{ flex: 1, padding: '7px 6px', borderRadius: 7, fontSize: 11, border: '1px solid #cbd5e1' }}>
        <option value="WATCH">{t('subscribe.watchLevel')}</option>
        <option value="WARNING">{t('subscribe.warningLevel')}</option>
        <option value="CRITICAL">{t('subscribe.criticalLevel')}</option>
      </select>
      <button onClick={subscribe} disabled={status === 'loading'} style={{ padding: '7px 12px', borderRadius: 7, border: 'none', background: '#0ea5e9', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
        {status === 'loading' ? '…' : currentUser ? t('map.getAlertsBtn') : t('subscribe.subscribe')}
      </button>
      {status === 'error' && <div style={{ fontSize: 10, color: '#ef4444' }}>{message}</div>}
    </div>
  );
}

function DetailPopup({ s, currentUser, existingSubscription, onSubscribed }) {
  const { t } = useTranslation();
  const rc = riskOf(s);
  const level = s.riverLevel?.levelM;
  const thresholds = s.thresholds;
  const pct = level && thresholds?.criticalRiver ? Math.min((level / (thresholds.criticalRiver * 1.2)) * 100, 100) : 0;

  const lastSeen = s.lastSeenAt ? new Date(s.lastSeenAt) : null;
  const minutesAgo = lastSeen ? Math.floor((Date.now() - lastSeen) / 60000) : null;
  const freshness =
    minutesAgo == null ? t('map.noData') : minutesAgo < 60 ? `${minutesAgo}m ago` : minutesAgo < 1440 ? `${Math.floor(minutesAgo / 60)}h ago` : lastSeen.toLocaleDateString();

  return (
    <div style={{ fontFamily: 'sans-serif', width: 230, color: '#0f172a' }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
          <strong style={{ fontSize: 13, lineHeight: 1.3, flex: 1 }}>{s.name}</strong>
          <span style={{ flexShrink: 0, padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: rc.hex + '22', color: rc.hex, border: `1px solid ${rc.hex}44` }}>
            {t(`risk.${s.risk}`)}
          </span>
        </div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{s.location}</div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{t('map.waterLevel')}</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: rc.hex, fontFamily: 'monospace', lineHeight: 1 }}>
            {level != null ? `${level.toFixed(2)}m` : '—'}
          </span>
        </div>
        {level != null && thresholds?.criticalRiver != null && (
          <>
            <div style={{ background: '#e2e8f0', borderRadius: 4, height: 7, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: rc.hex, borderRadius: 4 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: '#94a3b8', marginTop: 2 }}>
              <span>0m</span>
              <span style={{ color: '#f97316' }}>{thresholds.warningRiver}m warn</span>
              <span style={{ color: '#ef4444' }}>{thresholds.criticalRiver}m crit</span>
            </div>
          </>
        )}
      </div>

      <div style={{ marginBottom: 10, padding: '6px 8px', background: '#f1f5f9', borderRadius: 7 }}>
        <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginBottom: 2 }}>{t('map.rainfall6h')}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
          {s.rainfall?.valueMm != null ? `${s.rainfall.valueMm.toFixed(1)} mm` : t('map.noData')}
        </div>
      </div>

      {s.rapidRise && s.hoursToDanger != null && (
        <div style={{ marginBottom: 10, padding: '6px 8px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 7, fontSize: 11, color: '#c2410c', fontWeight: 600 }}>
          ⚡ Rising fast — projected to reach danger level in ~{s.hoursToDanger.toFixed(1)}h
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.status === 'OFFLINE' ? '#94a3b8' : '#22c55e', display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: s.status === 'OFFLINE' ? '#94a3b8' : '#22c55e' }}>{t(`risk.${s.status}`)}</span>
          </div>
          {s.trend && (
            <span style={{ fontSize: 11, fontWeight: 700, color: TREND_COLOR[s.trend] ?? '#94a3b8', display: 'flex', alignItems: 'center', gap: 2 }}>
              {TREND_ARROW[s.trend]} {t(`map.trend.${s.trend}`)}
            </span>
          )}
        </div>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>{t('map.updated', { time: freshness })}</span>
      </div>

      {s.risk === 'CRITICAL' && (
        <div style={{ marginTop: 8, padding: '5px 8px', background: '#fef2f2', borderRadius: 6, border: '1px solid #fecaca', fontSize: 11, color: '#dc2626', fontWeight: 600 }}>
          {t('map.criticalMsg')}
        </div>
      )}
      {s.risk === 'WARNING' && (
        <div style={{ marginTop: 8, padding: '5px 8px', background: '#fff7ed', borderRadius: 6, border: '1px solid #fed7aa', fontSize: 11, color: '#c2410c', fontWeight: 600 }}>
          {t('map.warningMsg')}
        </div>
      )}

      <SubscribeButton stationId={s.id} currentUser={currentUser} existingSubscription={existingSubscription} onSubscribed={onSubscribed} />
    </div>
  );
}

function StatsBar({ stations, updatedAt, onRefresh, loading, currentUser }) {
  const { t } = useTranslation();
  // Same "has a real water-level reading" filter as the map markers, so this count
  // doesn't get inflated by snow/met stations DHM lists with no river data at all.
  const stationsWithData = stations.filter((s) => s.riverLevel?.levelM != null);
  const counts = { NORMAL: 0, WATCH: 0, WARNING: 0, CRITICAL: 0 };
  stationsWithData.forEach((s) => { counts[s.risk] = (counts[s.risk] ?? 0) + 1; });

  return (
    <div style={{
      background: 'rgba(10,15,28,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', gap: 12, flexWrap: 'wrap',
    }}>
      <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <span style={{ fontSize: 18 }}>{'🌊'}</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{t('map.nepalFlood')}</div>
          <div style={{ fontSize: 10, color: '#475569' }}>{t('map.stationsMonitored', { count: stationsWithData.length })}</div>
        </div>
      </a>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {Object.entries(counts).filter(([, n]) => n > 0).map(([risk, n]) => (
          <div key={risk} style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: RISK_COLOR[risk].hex + '18', color: RISK_COLOR[risk].hex, border: `1px solid ${RISK_COLOR[risk].hex}44`,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: RISK_COLOR[risk].hex, display: 'inline-block' }} />
            {n} {t(`risk.${risk}`)}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
        <LanguageToggle variant="light" />
        {updatedAt && (
          <span style={{ fontSize: 10, color: '#475569' }}>
            {loading ? t('map.refreshing') : t('map.updated', { time: new Date(updatedAt).toLocaleTimeString() })}
          </span>
        )}
        <button onClick={onRefresh} style={{
          background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)', color: '#00d4ff',
          borderRadius: 6, padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
        }}>
          {t('map.refresh')}
        </button>
        {currentUser ? (
          <button onClick={() => firebaseSignOut(auth)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#e2e8f0', borderRadius: 6, padding: '4px 12px', fontSize: 11, cursor: 'pointer' }}>
            {currentUser.email}
          </button>
        ) : (
          <a href="/login" style={{ fontSize: 11, color: '#00d4ff', textDecoration: 'none', fontWeight: 600 }}>{t('nav.operatorLogin')}</a>
        )}
      </div>
    </div>
  );
}

function Legend() {
  const { t } = useTranslation();
  return (
    <div style={{
      position: 'absolute', bottom: 24, right: 10, zIndex: 1000, background: 'rgba(10,15,28,0.92)',
      backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px',
    }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: '#475569', marginBottom: 7, textTransform: 'uppercase', letterSpacing: 1 }}>{t('map.riskLevel')}</div>
      {['NORMAL', 'WATCH', 'WARNING', 'CRITICAL', 'OFFLINE'].map((key) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: RISK_COLOR[key].hex, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: '#cbd5e1' }}>{t(`risk.${key}`)}</span>
        </div>
      ))}
    </div>
  );
}

// At a country-wide zoom, only show CRITICAL/OFFLINE markers so the map isn't
// a wall of green dots. Zooming in (e.g. after locating the user) reveals everything.
function visibleAtZoom(zoom) {
  if (zoom <= 7) return ['CRITICAL', 'OFFLINE'];
  if (zoom <= 9) return ['WARNING', 'CRITICAL', 'OFFLINE'];
  return ['NORMAL', 'WATCH', 'WARNING', 'CRITICAL', 'OFFLINE'];
}

function ZoomTracker({ onZoom }) {
  useMapEvents({ zoomend: (e) => onZoom(e.target.getZoom()) });
  return null;
}

/** Flies the map to the operator-configured default view once it's fetched from /api/config. */
function FlyToDefault({ view }) {
  const map = useMap();
  useEffect(() => {
    if (view) map.flyTo([view.lat, view.lon], view.zoom, { duration: 1 });
  }, [view, map]);
  return null;
}

const SATELLITE_TILE = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Tiles &copy; Esri',
};
// Raw satellite imagery has no place names — Esri's reference layer overlays
// boundaries/city/road labels on top of it, same as the "Imagery Hybrid" basemap.
const SATELLITE_LABELS_TILE = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Tiles &copy; Esri',
};
const STREETS_TILE = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
};

function userLocationIcon() {
  return L.divIcon({
    html: `<div style="width:14px;height:14px;border-radius:50%;background:#0ea5e9;border:3px solid #fff;box-shadow:0 0 0 2px rgba(14,165,233,0.4),0 1px 4px rgba(0,0,0,0.4);"></div>`,
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

/** Flies to a position once (when it first becomes available), without re-flying on every render. */
function FlyToLocation({ position }) {
  const map = useMap();
  const flownTo = useRef(null);
  useEffect(() => {
    if (!position || flownTo.current === position) return;
    flownTo.current = position;
    map.flyTo(position, Math.max(map.getZoom(), 12), { duration: 1 });
  }, [position, map]);
  return null;
}

// Below this zoom, an Overpass query would cover too much of the country to be useful
// (or fast) — river lines only load once the user has zoomed in on a specific area.
const RIVER_LINE_MIN_ZOOM = 11;
// Nepal's mountainous terrain has a dense tributary/stream network compared to flatter
// regions — including "stream" at the same zoom the UK would be fine with risks the
// Overpass query timing out or getting rate-limited, so streams only load once zoomed
// in further; "river" (the larger, more useful lines) loads from RIVER_LINE_MIN_ZOOM.
const STREAM_MIN_ZOOM = 13;
// Multiple public mirrors of the same free Overpass service — falls over to the next
// one if the first is rate-limited or times out, rather than silently showing nothing.
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

async function queryOverpass(query) {
  let lastErr;
  for (const url of OVERPASS_URLS) {
    try {
      const res = await fetch(url, { method: 'POST', body: `data=${encodeURIComponent(query)}`, signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

/** Fetches OSM waterway geometry for the current viewport and draws it as named polylines. */
function RiverLines({ enabled, onStatusChange }) {
  const [lines, setLines] = useState([]);
  const debounceRef = useRef(null);

  const fetchForBounds = useCallback((map) => {
    const zoom = map.getZoom();
    if (zoom < RIVER_LINE_MIN_ZOOM) {
      setLines([]);
      onStatusChange('zoomIn');
      return;
    }
    const waterwayTypes = zoom >= STREAM_MIN_ZOOM ? 'river|stream|canal' : 'river';
    const b = map.getBounds();
    const bbox = `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;
    const query = `[out:json][timeout:20];(way["waterway"~"${waterwayTypes}"](${bbox}););out geom tags;`;
    onStatusChange('loading');
    queryOverpass(query)
      .then((data) => {
        const ways = (data.elements ?? [])
          .filter((el) => el.type === 'way' && el.geometry)
          .map((el) => ({ positions: el.geometry.map((g) => [g.lat, g.lon]), name: el.tags?.name ?? null }));
        setLines(ways);
        onStatusChange('idle');
      })
      .catch(() => onStatusChange('error')); // Free shared service — surface the failure instead of silently showing nothing.
  }, [onStatusChange]);

  const map = useMapEvents({
    moveend: () => {
      if (!enabled) return;
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchForBounds(map), 600);
    },
  });

  useEffect(() => {
    if (enabled) fetchForBounds(map);
    else { setLines([]); onStatusChange('idle'); }
  }, [enabled, map, fetchForBounds, onStatusChange]);

  if (!enabled) return null;
  return lines.map(({ positions, name }, i) => (
    <Polyline key={i} positions={positions} pathOptions={{ color: '#38bdf8', weight: 2, opacity: 0.7 }}>
      {name && <Tooltip sticky>{name}</Tooltip>}
    </Polyline>
  ));
}

export default function MapView() {
  const { t } = useTranslation();
  const [stations, setStations] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(7);
  const [currentUser, setCurrentUser] = useState(null);
  const [defaultView, setDefaultView] = useState(null);
  const [mySubscriptions, setMySubscriptions] = useState({});
  const [satelliteMode, setSatelliteMode] = useState(false);
  const [showRivers, setShowRivers] = useState(false);
  const [riverStatus, setRiverStatus] = useState('idle'); // idle | loading | error | zoomIn
  const [userLocation, setUserLocation] = useState(null);
  const [flyToUser, setFlyToUser] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setCurrentUser), []);

  useEffect(() => {
    fetch('/api/config').then((r) => r.json()).then((d) => setDefaultView(d.mapView)).catch(() => {});
  }, []);

  const locateMe = useCallback((flyAfter) => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        setLocationError(false);
        setLocating(false);
        if (flyAfter) setFlyToUser(coords);
      },
      () => {
        setLocationError(true);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  // Auto-locate and zoom in on load; the "My Location" button re-runs the same flow on demand.
  useEffect(() => { locateMe(true); }, [locateMe]);

  const loadMySubscriptions = useCallback(() => {
    if (!currentUser) { setMySubscriptions({}); return; }
    fetch('/api/subscriptions/mine')
      .then((r) => r.json())
      .then((d) => setMySubscriptions(Object.fromEntries((d.subscriptions ?? []).map((s) => [s.stationId, s]))))
      .catch(() => {});
  }, [currentUser]);

  useEffect(() => { loadMySubscriptions(); }, [loadMySubscriptions]);

  const riskLabels = {
    NORMAL: t('risk.NORMAL'),
    WATCH: t('risk.WATCH'),
    WARNING: t('risk.WARNING'),
    CRITICAL: t('risk.CRITICAL'),
    OFFLINE: t('risk.OFFLINE'),
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/map-data');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStations(data.stations);
      setUpdatedAt(data.updatedAt);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 60_000);
    return () => clearInterval(id);
  }, [fetchData]);

  // Re-render markers when language changes
  const langKey = useTranslation().i18n.language;

  const allowed = visibleAtZoom(zoom);
  // Some DHM "river watch" entries are actually snow/met stations with no water-level
  // sensor at all — showing them on a flood map with a permanent "—" reading isn't useful.
  const mappable = stations.filter((s) => s.latitude != null && s.longitude != null && s.riverLevel?.levelM != null && allowed.includes(s.risk ?? 'NORMAL'));

  return (
    <div style={{ height: '100vh', width: '100vw', position: 'relative', background: '#0f172a', fontFamily: 'sans-serif' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 }}>
        <StatsBar stations={stations} updatedAt={updatedAt} onRefresh={fetchData} loading={loading} currentUser={currentUser} />
      </div>

      {error && (
        <div style={{
          position: 'absolute', top: 58, left: '50%', transform: 'translateX(-50%)', zIndex: 1001,
          background: '#1f0303', border: '1px solid #ef4444', color: '#ef4444', borderRadius: 8, padding: '6px 16px', fontSize: 12,
        }}>
          {t('map.apiError', { msg: error })}
        </div>
      )}

      <div style={{ position: 'absolute', top: 64, right: 10, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          onClick={() => setSatelliteMode((v) => !v)}
          style={{
            background: 'rgba(10,15,28,0.92)', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0',
            borderRadius: 6, padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(8px)',
          }}
        >
          {satelliteMode ? `🗺️ ${t('map.streets')}` : `🛰️ ${t('map.satellite')}`}
        </button>
        <button
          onClick={() => setShowRivers((v) => !v)}
          style={{
            background: showRivers ? 'rgba(56,189,248,0.18)' : 'rgba(10,15,28,0.92)', border: `1px solid ${showRivers ? '#38bdf8' : 'rgba(255,255,255,0.12)'}`,
            color: showRivers ? '#38bdf8' : '#e2e8f0', borderRadius: 6, padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(8px)',
          }}
        >
          🌊 Rivers{showRivers && riverStatus === 'loading' ? '…' : ''}
        </button>
        {showRivers && riverStatus === 'zoomIn' && (
          <div style={{ background: 'rgba(10,15,28,0.92)', border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8', borderRadius: 6, padding: '6px 10px', fontSize: 10, maxWidth: 150 }}>
            Zoom in to load river lines
          </div>
        )}
        {showRivers && riverStatus === 'error' && (
          <div style={{ background: 'rgba(31,3,3,0.92)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: 6, padding: '6px 10px', fontSize: 10, maxWidth: 150 }}>
            River data unavailable — try again
          </div>
        )}
        <button
          onClick={() => locateMe(true)}
          style={{
            background: 'rgba(10,15,28,0.92)', border: '1px solid rgba(255,255,255,0.12)', color: locationError ? '#ef4444' : '#e2e8f0',
            borderRadius: 6, padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(8px)',
          }}
        >
          {locating ? `📍 ${t('map.locating')}` : locationError ? `📍 ${t('map.locationDenied')}` : `📍 ${t('map.locateMe')}`}
        </button>
      </div>

      <MapContainer center={[28.3949, 84.124]} zoom={7} style={{ height: '100%', width: '100%' }} zoomControl={true}>
        <TileLayer
          key={satelliteMode ? 'satellite' : 'streets'}
          attribution={satelliteMode ? SATELLITE_TILE.attribution : STREETS_TILE.attribution}
          url={satelliteMode ? SATELLITE_TILE.url : STREETS_TILE.url}
        />
        {satelliteMode && <TileLayer url={SATELLITE_LABELS_TILE.url} attribution={SATELLITE_LABELS_TILE.attribution} />}
        <RiverLines enabled={showRivers} onStatusChange={setRiverStatus} />
        <ZoomTracker onZoom={setZoom} />
        <FlyToDefault view={defaultView} />
        <FlyToLocation position={flyToUser} />
        {userLocation && <Marker position={userLocation} icon={userLocationIcon()} />}
        {mappable.map((s) => (
          <Marker key={`${s.id}-${langKey}`} position={[s.latitude, s.longitude]} icon={makeIcon(s, riskLabels)}>
            <Popup maxWidth={260} minWidth={230}>
              <DetailPopup
                s={s}
                currentUser={currentUser}
                existingSubscription={mySubscriptions[s.id]}
                onSubscribed={(stationId, severity) => setMySubscriptions((prev) => ({ ...prev, [stationId]: { stationId, severity } }))}
              />
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <Legend />
    </div>
  );
}
