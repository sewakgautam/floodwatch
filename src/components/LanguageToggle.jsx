'use client';

import '@/lib/i18n';
import { useTranslation } from 'react-i18next';

/** EN / NE language switcher. `variant` is "light" (dark bg pages) or "dark" (admin). */
export default function LanguageToggle({ variant = 'light' }) {
  const { i18n } = useTranslation();
  const isNe = i18n.language === 'ne';

  const toggle = () => {
    const next = isNe ? 'en' : 'ne';
    i18n.changeLanguage(next);
    localStorage.setItem('fw_lang', next);
  };

  const base = {
    display: 'inline-flex', alignItems: 'center',
    borderRadius: 20, padding: '3px 4px',
    cursor: 'pointer', border: 'none',
    gap: 2, fontSize: 11, fontWeight: 700,
    letterSpacing: '0.03em', userSelect: 'none',
    background: variant === 'light' ? 'rgba(255,255,255,0.07)' : '#16161f',
    outline: '1px solid',
    outlineColor: variant === 'light' ? 'rgba(255,255,255,0.15)' : '#2a2a3e',
  };

  const pill = (active) => ({
    padding: '2px 9px', borderRadius: 16,
    background: active ? '#00d4ff' : 'transparent',
    color: active ? '#0f172a' : (variant === 'light' ? '#94a3b8' : '#6b6b8a'),
    transition: 'all 0.15s',
  });

  return (
    <button onClick={toggle} style={base} title="Switch language / भाषा परिवर्तन">
      <span style={pill(!isNe)}>EN</span>
      <span style={pill(isNe)}>NP</span>
    </button>
  );
}
