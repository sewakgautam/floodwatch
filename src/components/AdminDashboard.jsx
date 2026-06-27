'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Droplets, Radio, AlertTriangle, Activity, Bell, LogOut, RefreshCw, Wifi, WifiOff, Trash2, MapPin } from 'lucide-react';

const RISK_OPTIONS = ['NORMAL', 'WATCH', 'WARNING', 'CRITICAL'];

function MapViewSettings() {
  const [view, setView] = useState({ lat: '', lon: '', zoom: '' });
  const [status, setStatus] = useState('idle'); // idle | loading | saved | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/config').then((r) => r.json()).then((d) => setView(d.mapView)).catch(() => {});
  }, []);

  const save = async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: Number(view.lat), lon: Number(view.lon), zoom: Number(view.zoom) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus('saved');
    } catch (e) {
      setMessage(e.message);
      setStatus('error');
    }
  };

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <MapPin size={15} color="var(--fw-accent)" />
        <span style={{ fontWeight: 600, fontSize: 14 }}>Default map view</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--fw-text-muted)', marginBottom: 14 }}>
        Where the public map opens by default. Pick a zoom of 10+ to show every risk level near that point, not just CRITICAL stations.
      </p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 11, color: 'var(--fw-text-muted)' }}>
          Latitude
          <input className="input" type="number" step="0.0001" value={view.lat} onChange={(e) => setView((v) => ({ ...v, lat: e.target.value }))} style={{ width: 120, marginTop: 4 }} />
        </label>
        <label style={{ fontSize: 11, color: 'var(--fw-text-muted)' }}>
          Longitude
          <input className="input" type="number" step="0.0001" value={view.lon} onChange={(e) => setView((v) => ({ ...v, lon: e.target.value }))} style={{ width: 120, marginTop: 4 }} />
        </label>
        <label style={{ fontSize: 11, color: 'var(--fw-text-muted)' }}>
          Zoom
          <input className="input" type="number" min="1" max="18" value={view.zoom} onChange={(e) => setView((v) => ({ ...v, zoom: e.target.value }))} style={{ width: 80, marginTop: 4 }} />
        </label>
        <button onClick={save} disabled={status === 'loading'} className="btn btn-primary">
          {status === 'loading' ? 'Saving…' : 'Save'}
        </button>
        {status === 'saved' && <span style={{ fontSize: 12, color: 'var(--fw-normal)' }}>Saved</span>}
        {status === 'error' && <span style={{ fontSize: 12, color: 'var(--fw-critical)' }}>{message}</span>}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {label}
        </span>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} color={color} />
        </div>
      </div>
      <div className="mono" style={{ fontSize: 28, fontWeight: 700, color: 'var(--fw-text)' }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--fw-text-muted)' }}>{sub}</div>}
    </div>
  );
}

export default function AdminDashboard({ userEmail }) {
  const [stations, setStations] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [tab, setTab] = useState('stations'); // 'stations' | 'noData'
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stRes, subRes] = await Promise.all([fetch('/api/admin/stations'), fetch('/api/admin/subscriptions')]);
      if (!stRes.ok) throw new Error((await stRes.json()).error);
      if (!subRes.ok) throw new Error((await subRes.json()).error);
      setStations((await stRes.json()).stations);
      setSubscriptions((await subRes.json()).subscriptions);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setOverride = async (id, manualOverride) => {
    setStations((prev) => prev.map((s) => (s.id === id ? { ...s, manualOverride } : s)));
    const res = await fetch(`/api/admin/stations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manualOverride }),
    });
    if (!res.ok) load();
  };

  const removeSubscription = async (id) => {
    setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    const res = await fetch(`/api/admin/subscriptions/${id}`, { method: 'DELETE' });
    if (!res.ok) load();
  };

  const signOut = async () => {
    await fetch('/api/auth/session', { method: 'DELETE' });
    router.push('/login');
  };

  const hasData = (s) => s.waterLevel != null;
  const stationsWithData = stations.filter(hasData);
  const stationsNoData = stations.filter((s) => !hasData(s));
  const tabStations = tab === 'noData' ? stationsNoData : stationsWithData;
  const filteredStations = tabStations.filter((s) => s.name.toLowerCase().includes(filter.toLowerCase()) || s.location?.toLowerCase().includes(filter.toLowerCase()));
  const online = stationsWithData.filter((s) => s.computedRisk !== 'OFFLINE').length;
  const critical = stationsWithData.filter((s) => (s.manualOverride ?? s.computedRisk) === 'CRITICAL').length;
  const warnings = stationsWithData.filter((s) => (s.manualOverride ?? s.computedRisk) === 'WARNING').length;

  return (
    <div className="fw" style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 className="mono" style={{ fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Droplets size={20} color="var(--fw-accent)" /> FloodWatch Admin
          </h1>
          <p style={{ color: 'var(--fw-text-muted)', marginTop: 4, fontSize: 13 }}>{userEmail}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href="/map" className="btn btn-ghost" style={{ textDecoration: 'none' }}>View map</a>
          <button onClick={signOut} className="btn btn-ghost"><LogOut size={13} /> Sign out</button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 16px', background: 'var(--fw-critical-dim)', color: 'var(--fw-critical)', fontSize: 13, borderRadius: 8, marginBottom: 20 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <StatCard label="Stations with data" value={stationsWithData.length} icon={Radio} color="var(--fw-accent)" sub={`${online} online`} />
        <StatCard label="Critical" value={critical} icon={AlertTriangle} color="var(--fw-critical)" sub="active risk zones" />
        <StatCard label="Warning" value={warnings} icon={Activity} color="var(--fw-warning)" sub="monitoring required" />
        <StatCard label="Subscribers" value={subscriptions.length} icon={Bell} color="var(--fw-watch)" sub="alert subscriptions" />
      </div>

      <MapViewSettings />

      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--fw-border)' }}>
          {[
            { key: 'stations', label: `Stations (${stationsWithData.length})` },
            { key: 'noData', label: `No Data (${stationsNoData.length})` },
          ].map((tabDef) => (
            <button
              key={tabDef.key}
              onClick={() => setTab(tabDef.key)}
              style={{
                padding: '12px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: 'transparent', fontFamily: 'inherit',
                color: tab === tabDef.key ? 'var(--fw-accent)' : 'var(--fw-text-muted)',
                borderBottom: tab === tabDef.key ? '2px solid var(--fw-accent)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {tabDef.label}
            </button>
          ))}
        </div>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--fw-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{tab === 'noData' ? 'Stations missing water-level data' : 'Stations'} ({filteredStations.length})</span>
          <input
            className="input"
            placeholder="Filter by name or location…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ width: 'auto', minWidth: 220 }}
          />
          <button className="btn btn-ghost" onClick={load}><RefreshCw size={13} /> Refresh</button>
        </div>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--fw-text-muted)', fontSize: 13 }}>Loading…</div>
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: 480, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Station</th>
                  <th>Status</th>
                  <th>Water level</th>
                  <th>Rise rate</th>
                  <th>Rainfall</th>
                  <th>Computed risk</th>
                  <th>Manual override</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredStations.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--fw-text-muted)', marginTop: 2 }}>{s.location}</div>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                        {s.computedRisk !== 'OFFLINE'
                          ? <><Wifi size={12} color="var(--fw-normal)" /> <span style={{ color: 'var(--fw-normal)' }}>ONLINE</span></>
                          : <><WifiOff size={12} color="var(--fw-text-muted)" /> <span style={{ color: 'var(--fw-text-muted)' }}>OFFLINE</span></>}
                      </span>
                    </td>
                    <td className="mono">{s.waterLevel != null ? `${s.waterLevel}m` : '—'}</td>
                    <td className="mono" style={{ color: s.hoursToDanger != null && s.hoursToDanger <= 2 ? 'var(--fw-warning)' : undefined }}>
                      {s.riseRateMPerHour != null ? `+${s.riseRateMPerHour.toFixed(2)}m/h${s.hoursToDanger != null ? ` (${s.hoursToDanger.toFixed(1)}h to danger)` : ''}` : '—'}
                    </td>
                    <td className="mono">{s.rainfall != null ? `${s.rainfall}mm` : '—'}</td>
                    <td><span className={`badge badge-${s.computedRisk}`}>{s.computedRisk}</span></td>
                    <td>
                      <select
                        className="input"
                        value={s.manualOverride ?? ''}
                        onChange={(e) => setOverride(s.id, e.target.value || null)}
                        style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }}
                      >
                        <option value="">— none —</option>
                        {RISK_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="mono" style={{ fontSize: 11, color: 'var(--fw-text-muted)' }}>
                      {s.updatedAt ? new Date(s.updatedAt).toLocaleTimeString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--fw-border)' }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Subscribers ({subscriptions.length})</span>
        </div>
        <div style={{ overflowX: 'auto', maxHeight: 360, overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Station</th>
                <th>Severity</th>
                <th>Subscribed</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((s) => (
                <tr key={s.id}>
                  <td>{s.email}</td>
                  <td>{s.stationName}</td>
                  <td><span className={`badge badge-${s.severity}`}>{s.severity}</span></td>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--fw-text-muted)' }}>
                    {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <button onClick={() => removeSubscription(s.id)} className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 11 }}>
                      <Trash2 size={12} /> Remove
                    </button>
                  </td>
                </tr>
              ))}
              {subscriptions.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--fw-text-muted)' }}>No subscribers yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
