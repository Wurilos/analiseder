/**
 * FINANCE ENGINE — Cérebro único de cálculo financeiro/ID.
 *
 * REGRA DE OURO: Toda página/cartão que precise de totais financeiros, contagens
 * por severidade, ID médio ou perdas (IDF/IEF/ICV/sub-IEF) DEVE consumir este
 * módulo. É proibido recalcular localmente — caso contrário voltamos a ter
 * cards divergentes entre Dashboard, Resumo, Valores e Modal de Análise.
 *
 * Decisões oficiais (memorizadas):
 *  • ID Geral / pagamento  = média simples por faixa.
 *  • Severidade            = <0.60 Crítico · 0.60–0.85 Alerta · ≥0.85 OK.
 *  • Perda Total           = Σ descontoTotal por equipamento.
 *  • IDF + IEF + ICV       = decomposição PROPORCIONAL de Perda Total
 *                            (somam exatamente Perda Total).
 *  • Sub-IEF (6 cards)     = ganho marginal real (simular sub=1.0),
 *                            normalizado para somar Perda IEF.
 *  • f_* (planilha)        = prioridade sobre c_* (calculado).
 */
import { IDRecord, EquipGroup } from '@/types';
import { groupByEquipamento } from '@/lib/grouping';
import { calcID, calcIEF } from '@/lib/calc-engine';

export interface FinancePerdaSub {
  ICId: number; ICIn: number; IEVri: number; IEVdt: number; ILPd: number; ILPn: number;
}

export interface FinanceTotals {
  // Universos
  numEquipamentos: number;
  numFaixas: number;
  numFaixasComID: number;
  numFaixasComIDPositivo: number;
  numEquipComIDPositivo: number;
  // Financeiro
  valorContratado: number;
  valorRecebido: number;
  descontoTotal: number;
  pctDesconto: number;
  // ID
  idMedioFaixa: number;          // média simples por faixa, inclui zerados (oficial p/ pagamento)
  idMedioFaixaSemZero: number;   // média operacional: ignora null e ID = 0
  idMedioEquipamento: number;    // média simples por equipamento (inclui zerados)
  idMedioEquipamentoSemZero: number; // média operacional por equipamento
  // Severidade
  faixasCriticas: number; faixasAlerta: number; faixasOk: number;
  equipCriticos: number;  equipAlerta: number;  equipOk: number;
  // Perdas — visão CONTÁBIL (proporcional, soma = descontoTotal).
  // Use nos cards principais que precisam fechar com a Perda Total.
  perdaIDF: number; perdaIEF: number; perdaICV: number;
  perdaSub: FinancePerdaSub;
  // Perdas — visão de AUDITORIA (ponderada pelo valor de cada equipamento,
  // ganho marginal isolado: "quanto este índice custa em R$, sozinho").
  // NÃO somam descontoTotal — a diferença é a sobreposição (efeito multiplicativo).
  audit: {
    perdaIDF: number;        // Σ (ID se IDF=1 − ID atual) × valor_equip
    perdaIEF: number;        // idem para IEF
    perdaICV: number;        // idem para ICV
    perdaSub: FinancePerdaSub; // sub-IEF SEM normalização (R$ reais isolados)
    somaIsoladas: number;    // perdaIDF + perdaIEF + perdaICV (auditoria)
    sobreposicao: number;    // somaIsoladas − descontoTotal
    pctSobreposicao: number; // sobreposicao / descontoTotal
  };
}

const getDisplayID = (r: { f_ID: number | null; c_ID: number | null }) =>
  r.f_ID ?? r.c_ID ?? null;

const SEV_CRIT = 0.60;
const SEV_OK = 0.85;

function emptyTotals(): FinanceTotals {
  return {
    numEquipamentos: 0, numFaixas: 0, numFaixasComID: 0,
    valorContratado: 0, valorRecebido: 0, descontoTotal: 0, pctDesconto: 0,
    idMedioFaixa: 0, idMedioEquipamento: 0,
    faixasCriticas: 0, faixasAlerta: 0, faixasOk: 0,
    equipCriticos: 0, equipAlerta: 0, equipOk: 0,
    perdaIDF: 0, perdaIEF: 0, perdaICV: 0,
    perdaSub: { ICId: 0, ICIn: 0, IEVri: 0, IEVdt: 0, ILPd: 0, ILPn: 0 },
    audit: {
      perdaIDF: 0, perdaIEF: 0, perdaICV: 0,
      perdaSub: { ICId: 0, ICIn: 0, IEVri: 0, IEVdt: 0, ILPd: 0, ILPn: 0 },
      somaIsoladas: 0, sobreposicao: 0, pctSobreposicao: 0,
    },
  };
}

/** Núcleo do motor: dados já agrupados + faixas que originaram os grupos. */
export function computeFinanceForGroups(groups: EquipGroup[], records: IDRecord[]): FinanceTotals {
  if (!groups.length && !records.length) return emptyTotals();

  const t = emptyTotals();

  // --- Universos
  t.numEquipamentos = groups.length;
  t.numFaixas = records.length;

  // --- ID por faixa (oficial — pagamento)
  const faixaIDs = records
    .map(r => getDisplayID(r))
    .filter((v): v is number => v !== null);
  t.numFaixasComID = faixaIDs.length;
  t.idMedioFaixa = faixaIDs.length
    ? faixaIDs.reduce((s, v) => s + v, 0) / faixaIDs.length
    : 0;

  // Severidade por faixa
  for (const v of faixaIDs) {
    if (v < SEV_CRIT) t.faixasCriticas++;
    else if (v < SEV_OK) t.faixasAlerta++;
    else t.faixasOk++;
  }

  // --- ID por equipamento (média simples)
  const equipIDs = groups
    .map(g => g.c_ID)
    .filter((v): v is number => v !== null);
  t.idMedioEquipamento = equipIDs.length
    ? equipIDs.reduce((s, v) => s + v, 0) / equipIDs.length
    : 0;
  for (const v of equipIDs) {
    if (v < SEV_CRIT) t.equipCriticos++;
    else if (v < SEV_OK) t.equipAlerta++;
    else t.equipOk++;
  }

  // --- Financeiro (somas brutas dos grupos — fonte única)
  for (const g of groups) {
    t.valorContratado += g.valorTotal || 0;
    t.valorRecebido += g.valorRecebidoTotal || 0;
  }
  t.descontoTotal = t.valorContratado - t.valorRecebido;
  t.pctDesconto = t.valorContratado > 0 ? t.descontoTotal / t.valorContratado : 0;

  // --- Decomposição proporcional aditiva: IDF+IEF+ICV = descontoTotal
  let rawIDF = 0, rawIEF = 0, rawICV = 0;
  for (const g of groups) {
    rawIDF += g.perdaIDF || 0;
    rawIEF += g.perdaIEF || 0;
    rawICV += g.perdaICV || 0;
  }
  const rawSum = rawIDF + rawIEF + rawICV;
  if (rawSum > 0) {
    const k = t.descontoTotal / rawSum;
    t.perdaIDF = rawIDF * k;
    t.perdaIEF = rawIEF * k;
    t.perdaICV = rawICV * k;
  }

  // --- Sub-IEF: ganho marginal real, normalizado p/ somar perdaIEF
  type SubKey = 'ICId' | 'ICIn' | 'IEVri' | 'IEVdt' | 'ILPd' | 'ILPn';
  const subKeys: SubKey[] = ['ICId', 'ICIn', 'IEVri', 'IEVdt', 'ILPd', 'ILPn'];
  const subRaw: Record<SubKey, number> = { ICId: 0, ICIn: 0, IEVri: 0, IEVdt: 0, ILPd: 0, ILPn: 0 };

  for (const g of groups) {
    const idf = g.c_IDF, icv = g.c_ICV, idAtual = g.c_ID;
    const valor = g.valorTotal || 0;
    if (idf === null || icv === null || idAtual === null || valor === 0) continue;

    const subVals: Record<SubKey, number> = {
      ICId: g.c_ICId ?? 1, ICIn: g.c_ICIn ?? 1,
      IEVri: g.c_IEVri ?? 1, IEVdt: g.c_IEVdt ?? 1,
      ILPd: g.c_ILPd ?? 1, ILPn: g.c_ILPn ?? 1,
    };

    for (const k of subKeys) {
      const v = { ...subVals, [k]: 1 };
      const newIEF = calcIEF(v.ICId, v.ICIn, v.IEVri, v.IEVdt, v.ILPd, v.ILPn) ?? 0;
      const newID = calcID(g.tipo, idf, newIEF, icv) ?? 0;
      const ganho = Math.max(0, newID - idAtual);
      subRaw[k] += ganho * valor;
    }
  }

  const subSum = subKeys.reduce((s, k) => s + subRaw[k], 0);
  if (subSum > 0 && t.perdaIEF > 0) {
    const k = t.perdaIEF / subSum;
    for (const sk of subKeys) t.perdaSub[sk] = subRaw[sk] * k;
  }

  // --- Auditoria (ponderada isolada, SEM normalização) — fonte oficial p/ cards de auditoria
  t.audit.perdaIDF = rawIDF;
  t.audit.perdaIEF = rawIEF;
  t.audit.perdaICV = rawICV;
  for (const sk of subKeys) t.audit.perdaSub[sk] = subRaw[sk];
  t.audit.somaIsoladas = rawIDF + rawIEF + rawICV;
  t.audit.sobreposicao = t.audit.somaIsoladas - t.descontoTotal;
  t.audit.pctSobreposicao = t.descontoTotal > 0
    ? t.audit.sobreposicao / t.descontoTotal
    : 0;

  return t;
}

/** Conveniência: agrupa internamente. Use quando só houver `records`. */
export function computeFinance(records: IDRecord[]): FinanceTotals {
  if (!records.length) return emptyTotals();
  const groups = groupByEquipamento(records);
  return computeFinanceForGroups(groups, records);
}
