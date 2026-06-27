'use client';

import '@/lib/i18n';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import LanguageToggle from './LanguageToggle.jsx';

function Navbar() {
  const { t } = useTranslation();
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #1e293b',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px', height: 56,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: '#00d4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
          🌊
        </div>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9', letterSpacing: '-0.3px' }}>
          FloodWatch <span style={{ color: '#00d4ff' }}>Nepal</span>
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <LanguageToggle variant="light" />
        <Link href="/map" style={{ color: '#94a3b8', fontSize: 13, fontWeight: 500, textDecoration: 'none', padding: '6px 14px', borderRadius: 7 }}>
          {t('nav.liveMap')}
        </Link>
        <Link href="/login" style={{ background: '#00d4ff18', border: '1px solid #00d4ff44', color: '#00d4ff', fontSize: 13, fontWeight: 600, textDecoration: 'none', padding: '6px 16px', borderRadius: 8 }}>
          {t('nav.operatorLogin')}
        </Link>
      </div>
    </nav>
  );
}

function StatCard({ label, value, sub, color = '#00d4ff' }) {
  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '20px 24px', minWidth: 150 }}>
      <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: '-1px', lineHeight: 1 }}>{value ?? '—'}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', letterSpacing: '0.5px', marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '24px', flex: '1 1 260px' }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
}

export default function LandingPage() {
  const [stats, setStats] = useState(null);
  const { t } = useTranslation();

  useEffect(() => {
    fetch('/api/map-data')
      .then((r) => r.json())
      .then((d) => {
        const total = d.stations.length;
        const online = d.stations.filter((s) => s.status === 'ONLINE').length;
        const alerts = d.stations.filter((s) => s.risk === 'WARNING' || s.risk === 'CRITICAL').length;
        const critical = d.stations.filter((s) => s.risk === 'CRITICAL').length;
        setStats({ total, online, alerts, critical });
      })
      .catch(() => {});
  }, []);

  const steps = [
    { n: '1', title: t('howto.step1title'), desc: t('howto.step1desc') },
    { n: '2', title: t('howto.step2title'), desc: t('howto.step2desc') },
    { n: '3', title: t('howto.step3title'), desc: t('howto.step3desc') },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: '#e2e8f0' }}>
      <Navbar />

      <section style={{ paddingTop: 140, paddingBottom: 80, paddingLeft: 32, paddingRight: 32, maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#00d4ff18', border: '1px solid #00d4ff33', color: '#00d4ff', fontSize: 11, fontWeight: 700, letterSpacing: '2px', padding: '5px 14px', borderRadius: 99, marginBottom: 24 }}>
          {t('hero.badge')}
        </div>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 54px)', fontWeight: 800, lineHeight: 1.1, color: '#f1f5f9', margin: '0 0 20px', letterSpacing: '-1.5px' }}>
          {t('hero.title1')}<br />
          <span style={{ color: '#00d4ff' }}>{t('hero.title2')}</span>
        </h1>
        <p style={{ fontSize: 17, color: '#94a3b8', lineHeight: 1.7, maxWidth: 600, margin: '0 auto 36px' }}>
          {t('hero.subtitle', { count: stats?.total ?? '300' })}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/map" style={{ background: '#00d4ff', color: '#0f172a', fontWeight: 700, fontSize: 14, padding: '12px 28px', borderRadius: 10, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {t('hero.viewMap')}
          </Link>
          <Link href="/map" style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', fontWeight: 600, fontSize: 14, padding: '12px 28px', borderRadius: 10, textDecoration: 'none' }}>
            {t('hero.getAlerts')}
          </Link>
        </div>
      </section>

      <section style={{ padding: '0 32px 80px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <StatCard label={t('stats.monitoringStations')} value={stats?.total} sub={t('stats.acrossNepal')} color="#00d4ff" />
          <StatCard label={t('stats.onlineNow')} value={stats?.online} sub={t('stats.reportingLive')} color="#22c55e" />
          <StatCard label={t('stats.activeAlerts')} value={stats?.alerts} sub={t('stats.aboveWarning')} color="#f97316" />
          <StatCard label={t('stats.critical')} value={stats?.critical} sub={t('stats.immediateAttention')} color="#ef4444" />
        </div>
      </section>

      <section style={{ padding: '0 32px 80px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#00d4ff', letterSpacing: '2px', marginBottom: 10 }}>{t('features.sectionLabel')}</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', margin: 0, letterSpacing: '-0.5px' }}>{t('features.sectionTitle')}</h2>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <FeatureCard icon="📡" title={t('features.riverLevels')} desc={t('features.riverLevelsDesc')} />
          <FeatureCard icon="🌧️" title={t('features.rainfall')} desc={t('features.rainfallDesc')} />
          <FeatureCard icon="📧" title={t('features.emailAlerts')} desc={t('features.emailAlertsDesc')} />
          <FeatureCard icon="🗺️" title={t('features.map')} desc={t('features.mapDesc')} />
        </div>
      </section>

      <section style={{ padding: '60px 32px 80px', maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#00d4ff', letterSpacing: '2px', marginBottom: 10 }}>{t('howto.sectionLabel')}</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9', margin: '0 0 40px', letterSpacing: '-0.5px' }}>{t('howto.sectionTitle')}</h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          {steps.map((step) => (
            <div key={step.n} style={{ flex: '1 1 200px', background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '24px' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#00d4ff18', border: '2px solid #00d4ff44', color: '#00d4ff', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                {step.n}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>{step.title}</div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>{step.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 36 }}>
          <Link href="/map" style={{ background: '#00d4ff', color: '#0f172a', fontWeight: 700, fontSize: 14, padding: '13px 32px', borderRadius: 10, textDecoration: 'none' }}>
            {t('howto.openMap')}
          </Link>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid #1e293b', padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontSize: 12, color: '#475569' }}>{t('footer.credit')}</div>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link href="/map" style={{ fontSize: 12, color: '#475569', textDecoration: 'none' }}>{t('footer.liveMap')}</Link>
          <Link href="/login" style={{ fontSize: 12, color: '#475569', textDecoration: 'none' }}>{t('footer.operatorLogin')}</Link>
        </div>
      </footer>
    </div>
  );
}
