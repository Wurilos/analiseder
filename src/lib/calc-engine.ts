/**
 * Calculation engine matching the reference HTML exactly.
 * All formulas from Edital 145/2023.
 */

export function sn(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return isNaN(v) ? null : v;
  const n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? null : n;
}

function clamp(v: number, mn = 0, mx = 1) { return Math.max(mn, Math.min(mx, v)); }

export function calcICId(IVd: number, INd: number, TId: number | null): number | null {
  if (!TId) return null;
  const r = (IVd + INd) / TId;
  if (r >= 0.85) return 1.00;
  if (r >= 0.75) return 0.80;
  if (r >= 0.65) return 0.70;
  if (r >= 0.55) return 0.60;
  if (r >= 0.50) return 0.50;
  if (r >= 0.35) return 0.40;
  if (r >= 0.20) return 0.25;
  return 0.00;
}

export function calcICIn(IVn: number, INn: number, TIn: number | null): number | null {
  if (!TIn) return null;
  const r = (IVn + INn) / TIn;
  if (r >= 0.70) return 1.00;
  if (r >= 0.65) return 0.80;
  if (r >= 0.60) return 0.70;
  if (r >= 0.50) return 0.60;
  if (r >= 0.40) return 0.50;
  if (r >= 0.35) return 0.40;
  if (r >= 0.20) return 0.25;
  return 0.00;
}

export function calcILPd(LPd: number | null, IVd: number | null): number | null {
  if (!IVd || LPd === null) return null;
  const r = LPd / IVd;
  if (r >= 0.80) return 1.00;
  if (r >= 0.70) return 0.75;
  if (r >= 0.60) return 0.25;
  return 0.00;
}

export function calcILPn(LPn: number | null, IVn: number | null): number | null {
  if (!IVn || LPn === null) return null;
  const r = LPn / IVn;
  if (r >= 0.70) return 1.00;
  if (r >= 0.50) return 0.75;
  if (r >= 0.40) return 0.25;
  return 0.00;
}

export function calcIEVri(rfri1: number | null, rfri2: number | null, rfri3: number | null, rfri4: number | null, rfri5: number | null, total: number | null): number | null {
  if (!total) return null;
  const n = (rfri1 || 0) + 0.8 * (rfri2 || 0) + 0.6 * (rfri3 || 0) + 0.4 * (rfri4 || 0) + 0.2 * (rfri5 || 0);
  return clamp(n / total);
}

export function calcIEVdt(rfdt1: number | null, rfdt2: number | null, rfdt3: number | null, rfdt4: number | null, rfdt5: number | null, rfdt6: number | null, total: number | null): number | null {
  if (!total) return null;
  const n = (rfdt1 || 0) + 0.9 * (rfdt2 || 0) + 0.8 * (rfdt3 || 0) + 0.7 * (rfdt4 || 0) + 0.4 * (rfdt5 || 0) + 0.2 * (rfdt6 || 0);
  return clamp(n / total);
}

export function calcIEF(ICId: number | null, ICIn: number | null, IEVri: number | null, IEVdt: number | null, ILPd: number | null, ILPn: number | null): number | null {
  if (ICId === null || ICIn === null || IEVri === null || IEVdt === null || ILPd === null || ILPn === null) return null;
  const r = 0.8 * ((ICId + ICIn) / 2) * ((IEVri + IEVdt) / 2) + 0.2 * ((ILPd + ILPn) / 2);
  return clamp(r);
}

export function calcIDF(NHo: number | null, NHt: number | null): number | null {
  if (!NHt || NHo === null) return null;
  const r = NHo / NHt;
  return r >= 0.95 ? 1.00 : clamp(r);
}

export function calcICV(QVc: number | null, QVt: number | null): number | null {
  if (!QVt || QVc === null) return null;
  const r = QVc / QVt;
  if (r >= 0.80) return 1.00;
  if (r >= 0.70) return 0.75;
  if (r >= 0.60) return 0.25;
  return 0.00;
}

export function calcID(tipo: string, IDF: number | null, IEF: number | null, ICV: number | null): number | null {
  if (IDF === null || IEF === null || ICV === null) return null;
  return IDF * (0.9 * IEF + 0.1 * ICV);
}

/**
 * Calcula o ID "atual" ajustando o NHt proporcionalmente aos dias decorridos no período.
 * Período sempre vai do dia 16 ao dia 15 do mês seguinte.
 */
export function calcIDAtual(r: { NHo: number | null; NHt: number | null; c_IEF: number | null; c_ICV: number | null; tipo: string; dias: number | null }): number | null {
  if (r.NHo === null || r.NHt === null || !r.NHt || r.c_IEF === null || r.c_ICV === null || !r.dias) return null;

  const today = new Date();
  const day = today.getDate();

  // Determine period start date
  let startDate: Date;
  if (day >= 16) {
    // Current period started on the 16th of this month
    startDate = new Date(today.getFullYear(), today.getMonth(), 16);
  } else {
    // Current period started on the 16th of last month
    startDate = new Date(today.getFullYear(), today.getMonth() - 1, 16);
  }

  // Days elapsed from period start to today (inclusive of today)
  const elapsed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const totalDays = r.dias;

  if (elapsed <= 0 || totalDays <= 0) return null;

  // Proportional NHt for elapsed days
  const ratio = Math.min(elapsed / totalDays, 1);
  const NHt_atual = r.NHt * ratio;

  if (NHt_atual <= 0) return null;

  const idf_atual = calcIDF(r.NHo, NHt_atual);
  return calcID(r.tipo, idf_atual, r.c_IEF, r.c_ICV);
}

export function calcGainPotential(r: { c_IDF: number | null; c_IEF: number | null; c_ICV: number | null; c_ID: number | null; tipo: string }) {
  const idf = r.c_IDF ?? 0, ief = r.c_IEF ?? 0, icv = r.c_ICV ?? 0, id = r.c_ID ?? 0;
  const idf1 = calcID(r.tipo, 1.0, ief, icv) ?? 0;
  const ief1 = calcID(r.tipo, idf, 1.0, icv) ?? 0;
  const icv1 = calcID(r.tipo, idf, ief, 1.0) ?? 0;
  const all1 = calcID(r.tipo, 1.0, 1.0, 1.0) ?? 1;
  return {
    idf_gain: idf1 - id,
    ief_gain: ief1 - id,
    icv_gain: icv1 - id,
    total_gap: all1 - id,
    max_id: all1,
  };
}

export function getRecommendations(r: { c_IDF: number | null; c_IEF: number | null; c_ICV: number | null; c_ID: number | null; c_ICId: number | null; c_ICIn: number | null; c_IEVri: number | null; c_IEVdt: number | null; c_ILPd: number | null; c_ILPn: number | null; NHo: number | null; NHt: number | null; ICId_raw: number | null; ICIn_raw: number | null; ILPd_raw: number | null; ILPn_raw: number | null; LPd: number | null; IVd_ocr: number | null; LPn: number | null; IVn_ocr: number | null; QVc: number | null; QVt: number | null; tipo: string }) {
  const recos: { priority: 'high' | 'medium' | 'low'; title: string; desc: string; gain: string }[] = [];
  const add = (p: 'high' | 'medium' | 'low', t: string, d: string, gain = '') => recos.push({ priority: p, title: t, desc: d, gain });
  const pct = (v: number | null) => v !== null ? (v * 100).toFixed(1) + '%' : '—';
  const fmt3 = (v: number | null) => v !== null ? v.toFixed(3) : '—';

  if (r.c_IDF !== null && r.c_IDF < 0.95) {
    const g = calcGainPotential(r).idf_gain;
    add('high', 'IDF Crítico — Disponibilidade Reduzida',
      `Apenas ${pct(r.c_IDF)} de disponibilidade operacional (${r.NHo ?? '?'}h de ${r.NHt ?? '?'}h previstas). Verificar telemetria, manutenção preventiva.`,
      `+${pct(g)} no ID se IDF=100%`);
  }
  if (r.c_ICId !== null && r.c_ICId < 0.80) {
    add('high', 'ICId Baixo — Qualidade de Captura Diurna',
      `Taxa de captura diurna: ${fmt3(r.ICId_raw)}. Verificar: alinhamento de câmera, limpeza de lente, foco.`, `ICId=${pct(r.c_ICId)}`);
  }
  if (r.c_ICIn !== null && r.c_ICIn < 0.80) {
    add('high', 'ICIn Baixo — Qualidade de Captura Noturna',
      `Taxa de captura noturna: ${fmt3(r.ICIn_raw)}. Verificar: iluminação IR, sensibilidade noturna.`, `ICIn=${pct(r.c_ICIn)}`);
  }
  if (r.c_IEVri !== null && r.c_IEVri < 0.90) add('medium', 'IEVri Baixo — Envio de Registros de Imagens', `Índice: ${pct(r.c_IEVri)}. Verificar latência, fila de envio.`);
  if (r.c_IEVdt !== null && r.c_IEVdt < 0.90) add('medium', 'IEVdt Baixo — Envio de Dados de Tráfego', `Índice: ${pct(r.c_IEVdt)}. Verificar conexão com servidor.`);
  if (r.c_ILPd !== null && r.c_ILPd < 0.75) add('medium', 'ILPd Baixo — OCR de Placas Diurno', `Taxa OCR diurna: ${fmt3(r.ILPd_raw)}. Verificar qualidade de imagem.`);
  if (r.c_ILPn !== null && r.c_ILPn < 0.75) add('medium', 'ILPn Baixo — OCR de Placas Noturno', `Taxa OCR noturna: ${fmt3(r.ILPn_raw)}. Verificar iluminação IR.`);
  if (r.c_ICV !== null && r.c_ICV < 1.0) add('low', 'ICV Abaixo do Ideal — Classificação de Veículos', `ICV=${pct(r.c_ICV)} (${r.QVc}/${r.QVt}). Verificar laços indutivos.`);

  return recos.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]));
}
