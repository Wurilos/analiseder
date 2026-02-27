import { IndicesRow } from '@/types';
import { safeNum, pct, fmt } from './format';

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  desc: string;
  gain: string;
}

export interface GainPotential {
  idf_gain: number;
  ief_gain: number;
  icv_gain: number;
  total_gap: number;
  max_id: number;
  best_lever: string;
}

function calcID(tipo: string, idf: number, ief: number, icv: number): number {
  const isCECorREC = /CEC|REC/i.test(tipo);
  if (isCECorREC) return idf * (0.7 * ief + 0.1 * icv + 0.2 * 1.0); // IP assumed 1.0
  return idf * (0.9 * ief + 0.1 * icv);
}

export function calcGainPotential(r: IndicesRow): GainPotential {
  const idf = safeNum(r.IDF) ?? 0;
  const ief = safeNum(r.IEF) ?? 0;
  const icv = safeNum(r.ICV) ?? 0;
  const id = safeNum(r.ID) ?? 0;
  const tipo = String(r.Tipo || '').trim().toUpperCase();

  const idf1 = calcID(tipo, 1.0, ief, icv);
  const ief1 = calcID(tipo, idf, 1.0, icv);
  const icv1 = calcID(tipo, idf, ief, 1.0);
  const all1 = calcID(tipo, 1.0, 1.0, 1.0);

  const gains = {
    idf_gain: idf1 - id,
    ief_gain: ief1 - id,
    icv_gain: icv1 - id,
  };

  const best = Object.entries(gains).sort(([, a], [, b]) => b - a)[0][0];

  return {
    ...gains,
    total_gap: all1 - id,
    max_id: all1,
    best_lever: best,
  };
}

export function getRecommendations(r: IndicesRow): Recommendation[] {
  const recos: Recommendation[] = [];
  const add = (p: Recommendation['priority'], t: string, d: string, gain = '') =>
    recos.push({ priority: p, title: t, desc: d, gain });

  const idf = safeNum(r.IDF);
  const icid = safeNum(r.ICId);
  const icin = safeNum(r.ICIn);
  const ievri = safeNum(r.IEVri);
  const ievdt = safeNum(r.IEVdt);
  const ilpd = safeNum(r.ILPd);
  const ilpn = safeNum(r.ILPn);
  const icv = safeNum(r.ICV);
  const nho = safeNum(r.NHo);
  const nht = safeNum(r.NHt);

  if (idf !== null && idf < 0.95) {
    const g = calcGainPotential(r).idf_gain;
    add('high', 'IDF Crítico — Disponibilidade Reduzida',
      `Apenas ${pct(idf)} de disponibilidade operacional${nho !== null && nht !== null ? ` (${nho.toFixed(0)}h de ${nht.toFixed(0)}h previstas)` : ''}. Verificar telemetria, pacotes faltando, manutenção preventiva, certificação INMETRO.`,
      `+${pct(g)} no ID se IDF=100%`);
  }
  if (icid !== null && icid < 0.80) {
    add('high', 'ICId Baixo — Qualidade de Captura Diurna',
      `Verificar: alinhamento de câmera, limpeza de lente, foco, iluminação, ângulo de captura, obstruções.`,
      `ICId=${pct(icid)}`);
  }
  if (icin !== null && icin < 0.80) {
    add('high', 'ICIn Baixo — Qualidade de Captura Noturna',
      `Verificar: iluminação IR, sensibilidade noturna, limpeza de lente, exposição.`,
      `ICIn=${pct(icin)}`);
  }
  if (ievri !== null && ievri < 0.90) {
    add('medium', 'IEVri Baixo — Envio de Registros de Imagens',
      `Índice de envio de imagens: ${pct(ievri)}. Verificar: latência de conexão, processamento do servidor, fila de envio, falhas de rede.`);
  }
  if (ievdt !== null && ievdt < 0.90) {
    add('medium', 'IEVdt Baixo — Envio de Dados de Tráfego',
      `Índice de envio de tráfego: ${pct(ievdt)}. Verificar: conexão com servidor, atrasos no processamento.`);
  }
  if (ilpd !== null && ilpd < 0.75) {
    add('medium', 'ILPd Baixo — OCR de Placas Diurno',
      `Verificar: qualidade de imagem, resolução, ângulo de câmera, oclusões, placas sujas/danificadas.`);
  }
  if (ilpn !== null && ilpn < 0.75) {
    add('medium', 'ILPn Baixo — OCR de Placas Noturno',
      `Verificar: iluminação IR, configuração de câmera para baixa luminosidade, exposição.`);
  }
  if (icv !== null && icv < 1.0) {
    add('low', 'ICV Abaixo do Ideal — Classificação de Veículos',
      `ICV=${pct(icv)}. Verificar: configuração dos laços indutivos, sensores de classificação, parametrização.`);
  }

  return recos.sort((a, b) => {
    const p = { high: 0, medium: 1, low: 2 };
    return p[a.priority] - p[b.priority];
  });
}
