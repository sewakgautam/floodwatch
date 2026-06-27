const RISK_COLOR = { NORMAL: '#22c55e', WATCH: '#eab308', WARNING: '#f97316', CRITICAL: '#ef4444' };

const RISK_LABEL = {
  en: { NORMAL: 'Normal', WATCH: 'Watch', WARNING: 'Warning', CRITICAL: 'Critical' },
  ne: { NORMAL: 'सामान्य', WATCH: 'सतर्कता', WARNING: 'चेतावनी', CRITICAL: 'गम्भीर' },
};

const TREND_LABEL = {
  en: { RISING: 'Rising ↑', FALLING: 'Falling ↓', STEADY: 'Steady →' },
  ne: { RISING: 'बढ्दैछ ↑', FALLING: 'घट्दैछ ↓', STEADY: 'स्थिर →' },
};

const EMERGENCY_NUMBERS = {
  en: [['Nepal Police', '100'], ['Fire Brigade', '101'], ['Ambulance', '102'], ['Natural Disaster / NDRRMA hotline', '1155']],
  ne: [['नेपाल प्रहरी', '100'], ['फायर ब्रिगेड', '101'], ['एम्बुलेन्स', '102'], ['प्राकृतिक प्रकोप / NDRRMA हटलाइन', '1155']],
};

const SAFETY_STEPS = {
  en: [
    'Move to higher ground immediately — don’t wait for water to reach you.',
    'Never walk or drive through moving flood water, even if it looks shallow.',
    'Stay away from riverbanks, bridges, and low-lying areas until levels drop.',
    'Keep a torch, phone charger, drinking water, and important documents ready to grab.',
    'Follow instructions from local authorities and emergency services.',
  ],
  ne: [
    'पानी आइपुग्नुअघि नै सुरक्षित अग्लो स्थानमा सर्नुहोस्।',
    'बहिरहेको बाढीको पानीमा कहिल्यै हिँडेर वा गाडी चलाएर नजानुहोस्, पानी कम देखिए पनि।',
    'जलस्तर नघटुन्जेल नदी किनार, पुल र होचो ठाउँबाट टाढा रहनुहोस्।',
    'टर्च, फोन चार्जर, पिउने पानी र आवश्यक कागजात तयारी अवस्थामा राख्नुहोस्।',
    'स्थानीय प्रशासन र आपतकालीन सेवाको निर्देशन पालना गर्नुहोस्।',
  ],
};

const STR = {
  en: {
    confirmedBadge: 'SUBSCRIBED',
    confirmedTitle: "You're set to receive alerts",
    confirmedBody: (stationName, severity, color) =>
      `You'll get an email whenever <strong style="color:#e2e8f0;">${stationName}</strong> reaches <strong style="color:${color};">${severity}</strong> level or higher.`,
    confirmedFooter: 'You can manage your subscriptions any time from the FloodWatch map.',
    alertTitle: 'alert',
    alertBody: (stationName, risk, color) => `This station is now at <strong style="color:${color};">${risk}</strong> level.`,
    waterLevel: 'Current water level',
    warningLevel: 'Warning level',
    dangerLevel: 'Danger / critical level',
    rainfall: 'Rainfall (6h)',
    trend: 'Trend',
    safetySteps: 'SAFETY STEPS',
    emergencyNumbers: 'NEPAL EMERGENCY NUMBERS',
    viewMap: 'View live map',
    disclaimer: 'Emergency numbers are Nepal\'s general national lines, not specific to DHM or this monitoring station. Always follow guidance from local authorities.',
    deescalatedBadge: 'BACK TO NORMAL',
    deescalatedTitle: (stationName) => `${stationName} has dropped to a lower level`,
    deescalatedBody: (risk, color) => `Good news — this station is now back down to <strong style="color:${color};">${risk}</strong> level, below your alert threshold.`,
    rapidRise: (hours) => `Based on its recent rise rate, this station is projected to reach danger level in about <strong>${hours.toFixed(1)} hours</strong> if the trend continues.`,
    subject: { alert: (n, r) => `${n}: ${r} alert`, deescalated: (n) => `${n}: back to a lower level` },
  },
  ne: {
    confirmedBadge: 'सदस्यता लिइयो',
    confirmedTitle: 'तपाईं सूचना पाउनको लागि तयार हुनुभयो',
    confirmedBody: (stationName, severity, color) =>
      `<strong style="color:#e2e8f0;">${stationName}</strong> <strong style="color:${color};">${RISK_LABEL.ne[severity] ?? severity}</strong> स्तर वा माथि पुगेपछि तपाईंले इमेल पाउनुहुनेछ।`,
    confirmedFooter: 'तपाईं जुनसुकै बेला FloodWatch नक्साबाट आफ्नो सदस्यता व्यवस्थापन गर्न सक्नुहुन्छ।',
    alertTitle: 'सूचना',
    alertBody: (stationName, risk, color) => `यो स्टेशन अहिले <strong style="color:${color};">${RISK_LABEL.ne[risk] ?? risk}</strong> स्तरमा छ।`,
    waterLevel: 'हालको जलस्तर',
    warningLevel: 'चेतावनी स्तर',
    dangerLevel: 'खतरा / गम्भीर स्तर',
    rainfall: 'वर्षा (६ घण्टा)',
    trend: 'प्रवृत्ति',
    safetySteps: 'सुरक्षा उपायहरू',
    emergencyNumbers: 'नेपाल आपतकालीन नम्बरहरू',
    viewMap: 'लाइभ नक्सा हेर्नुहोस्',
    disclaimer: 'यी नेपालका सामान्य राष्ट्रिय आपतकालीन नम्बरहरू हुन्, DHM वा यो स्टेशन विशेषका होइनन्। सधैं स्थानीय प्रशासनको निर्देशन पालना गर्नुहोस्।',
    deescalatedBadge: 'सामान्य स्थितिमा फर्कियो',
    deescalatedTitle: (stationName) => `${stationName} अहिले कम स्तरमा झर्यो`,
    deescalatedBody: (risk, color) => `राम्रो खबर — यो स्टेशन अहिले तपाईंको सूचना सीमाभन्दा तल <strong style="color:${color};">${RISK_LABEL.ne[risk] ?? risk}</strong> स्तरमा फर्किएको छ।`,
    rapidRise: (hours) => `यसको हालको बढ्ने दरको आधारमा, यो स्टेशन लगभग <strong>${hours.toFixed(1)} घण्टा</strong> भित्र खतरा स्तरमा पुग्ने प्रक्षेपण छ, यदि यो प्रवृत्ति जारी रह्यो भने।`,
    subject: { alert: (n, r) => `${n}: ${RISK_LABEL.ne[r] ?? r} सूचना`, deescalated: (n) => `${n}: कम स्तरमा फर्कियो` },
  },
};

function shell(footerText, bodyHtml) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f172a;font-family:'DM Sans',Segoe UI,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:32px 24px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px;">
      <span style="font-size:22px;">🌊</span>
      <span style="font-size:16px;font-weight:700;color:#f1f5f9;">FloodWatch <span style="color:#00d4ff;">Nepal</span></span>
    </div>
    <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:28px 24px;">
      ${bodyHtml}
    </div>
    <div style="text-align:center;margin-top:24px;font-size:11px;color:#475569;">
      ${footerText} · FloodWatch Nepal — data from DHM Nepal
    </div>
  </div>
</body>
</html>`;
}

function row(label, value) {
  return `<tr>
    <td style="padding:6px 0;font-size:12px;color:#64748b;">${label}</td>
    <td style="padding:6px 0;font-size:13px;color:#e2e8f0;text-align:right;font-family:monospace;">${value}</td>
  </tr>`;
}

export function subscriptionConfirmedEmail({ stationName, severity, lang = 'en' }) {
  const t = STR[lang] ?? STR.en;
  const color = RISK_COLOR[severity] ?? '#00d4ff';
  return shell(
    t.confirmedTitle,
    `<div style="display:inline-block;background:${color}18;border:1px solid ${color}44;color:${color};font-size:11px;font-weight:700;letter-spacing:0.5px;padding:4px 12px;border-radius:99px;margin-bottom:16px;">${t.confirmedBadge}</div>
     <h1 style="font-size:18px;font-weight:700;color:#f1f5f9;margin:0 0 12px;">${t.confirmedTitle}</h1>
     <p style="font-size:14px;color:#94a3b8;line-height:1.6;margin:0 0 16px;">${t.confirmedBody(stationName, severity, color)}</p>
     <p style="font-size:12px;color:#64748b;line-height:1.6;margin:0;">${t.confirmedFooter}</p>`,
  );
}

export function alertEmail({ stationName, risk, waterLevel, warningLevel, dangerLevel, rainfall, trend, lang = 'en', rapidRise, hoursToDanger }) {
  const t = STR[lang] ?? STR.en;
  const trendLabel = TREND_LABEL[lang] ?? TREND_LABEL.en;
  const riskLabel = RISK_LABEL[lang]?.[risk] ?? risk;
  const color = RISK_COLOR[risk] ?? '#00d4ff';
  const isSevere = risk === 'WARNING' || risk === 'CRITICAL';

  const readingsRows = [
    waterLevel != null ? row(t.waterLevel, `${waterLevel.toFixed(2)} m`) : '',
    warningLevel != null ? row(t.warningLevel, `${warningLevel.toFixed(2)} m`) : '',
    dangerLevel != null ? row(t.dangerLevel, `${dangerLevel.toFixed(2)} m`) : '',
    rainfall != null ? row(t.rainfall, `${rainfall.toFixed(1)} mm`) : '',
    trend ? row(t.trend, trendLabel[trend] ?? trend) : '',
  ].join('');

  const readingsBlock = readingsRows
    ? `<table style="width:100%;border-collapse:collapse;margin:0 0 20px;border-top:1px solid #334155;border-bottom:1px solid #334155;">${readingsRows}</table>`
    : '';

  const rapidRiseBlock = rapidRise && hoursToDanger != null
    ? `<div style="margin:0 0 20px;padding:12px 14px;background:#1c0a03;border:1px solid #f9731644;border-radius:8px;font-size:12px;color:#fdba74;line-height:1.6;">⚡ ${t.rapidRise(hoursToDanger)}</div>`
    : '';

  const safetySteps = SAFETY_STEPS[lang] ?? SAFETY_STEPS.en;
  const emergencyNumbers = EMERGENCY_NUMBERS[lang] ?? EMERGENCY_NUMBERS.en;

  const safetyBlock = isSevere
    ? `<div style="margin:0 0 20px;padding:14px 16px;background:#1c0a03;border:1px solid #f9731644;border-radius:10px;">
         <div style="font-size:12px;font-weight:700;color:#f97316;letter-spacing:0.5px;margin-bottom:8px;">${t.safetySteps}</div>
         <ul style="margin:0;padding-left:18px;font-size:12px;color:#cbd5e1;line-height:1.7;">
           ${safetySteps.map((s) => `<li>${s}</li>`).join('')}
         </ul>
       </div>
       <div style="margin:0 0 20px;padding:14px 16px;background:#1f0303;border:1px solid #ef444444;border-radius:10px;">
         <div style="font-size:12px;font-weight:700;color:#ef4444;letter-spacing:0.5px;margin-bottom:8px;">${t.emergencyNumbers}</div>
         <table style="width:100%;border-collapse:collapse;">
           ${emergencyNumbers.map(([label, num]) => `<tr><td style="padding:3px 0;font-size:12px;color:#cbd5e1;">${label}</td><td style="padding:3px 0;font-size:13px;color:#f1f5f9;text-align:right;font-family:monospace;font-weight:700;">${num}</td></tr>`).join('')}
         </table>
       </div>`
    : '';

  return shell(
    `${riskLabel} ${t.alertTitle}`,
    `<div style="display:inline-block;background:${color}18;border:1px solid ${color}44;color:${color};font-size:11px;font-weight:700;letter-spacing:0.5px;padding:4px 12px;border-radius:99px;margin-bottom:16px;">${riskLabel}</div>
     <h1 style="font-size:18px;font-weight:700;color:#f1f5f9;margin:0 0 12px;">${stationName}</h1>
     <p style="font-size:14px;color:#94a3b8;line-height:1.6;margin:0 0 20px;">${t.alertBody(stationName, riskLabel, color)}</p>
     ${readingsBlock}
     ${rapidRiseBlock}
     ${safetyBlock}
     <a href="${process.env.APP_URL ?? 'http://localhost:3000'}/map" style="display:inline-block;background:#00d4ff;color:#0f172a;font-weight:700;font-size:13px;padding:10px 22px;border-radius:8px;text-decoration:none;">
       ${t.viewMap}
     </a>
     <p style="font-size:10px;color:#475569;line-height:1.5;margin:16px 0 0;">${t.disclaimer}</p>`,
  );
}

export function deescalationEmail({ stationName, risk, lang = 'en' }) {
  const t = STR[lang] ?? STR.en;
  const riskLabel = RISK_LABEL[lang]?.[risk] ?? risk;
  const color = RISK_COLOR[risk] ?? '#22c55e';
  return shell(
    t.deescalatedTitle(stationName),
    `<div style="display:inline-block;background:${color}18;border:1px solid ${color}44;color:${color};font-size:11px;font-weight:700;letter-spacing:0.5px;padding:4px 12px;border-radius:99px;margin-bottom:16px;">${t.deescalatedBadge}</div>
     <h1 style="font-size:18px;font-weight:700;color:#f1f5f9;margin:0 0 12px;">${stationName}</h1>
     <p style="font-size:14px;color:#94a3b8;line-height:1.6;margin:0 0 20px;">${t.deescalatedBody(riskLabel, color)}</p>
     <a href="${process.env.APP_URL ?? 'http://localhost:3000'}/map" style="display:inline-block;background:#00d4ff;color:#0f172a;font-weight:700;font-size:13px;padding:10px 22px;border-radius:8px;text-decoration:none;">
       ${t.viewMap}
     </a>`,
  );
}

export function emailSubject({ stationName, risk, deescalated, lang = 'en' }) {
  const t = STR[lang] ?? STR.en;
  return deescalated ? t.subject.deescalated(stationName) : t.subject.alert(stationName, risk);
}
