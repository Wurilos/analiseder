import * as XLSX from 'xlsx';
import { INDICES_COL_MAP, VALORES_CONTRATUAIS } from './constants';
import { IndicesRow, MaiorProblemaInfo, PerdaSubIndice } from '@/types';
import { normStr, safeNum, pct, formatMoeda } from './format';

/**
 * Parse an indices XLSX file using the fixed column mapping.
 */
export function parseIndicesFile(buffer: ArrayBuffer): IndicesRow[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false }) as unknown[][];

  // Find data start row (first row with numeric Km)
  let dataStartRow = 0;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][INDICES_COL_MAP.Km] && typeof rows[i][INDICES_COL_MAP.Km] === 'number') {
      dataStartRow = i;
      break;
    }
  }

  return rows
    .slice(dataStartRow)
    .filter((row) => row[INDICES_COL_MAP.Equipamento] && row[INDICES_COL_MAP.Equipamento] !== '')
    .map((row) => ({
      Operadora: String(row[INDICES_COL_MAP.Operadora] ?? ''),
      Rodovia: String(row[INDICES_COL_MAP.Rodovia] ?? ''),
      Km: safeNum(row[INDICES_COL_MAP.Km]),
      Equipamento: String(row[INDICES_COL_MAP.Equipamento] ?? ''),
      Tipo: String(row[INDICES_COL_MAP.Tipo] ?? ''),
      Faixa: String(row[INDICES_COL_MAP.Faixa] ?? ''),
      ICId: safeNum(row[INDICES_COL_MAP.ICId]),
      ICIn: safeNum(row[INDICES_COL_MAP.ICIn]),
      IEVri: safeNum(row[INDICES_COL_MAP.IEVri]),
      IEVdt: safeNum(row[INDICES_COL_MAP.IEVdt]),
      ILPd: safeNum(row[INDICES_COL_MAP.ILPd]),
      ILPn: safeNum(row[INDICES_COL_MAP.ILPn]),
      IEF: safeNum(row[INDICES_COL_MAP.IEF]),
      ICV: safeNum(row[INDICES_COL_MAP.ICV]),
      IDF: safeNum(row[INDICES_COL_MAP.IDF]),
      ID: safeNum(row[INDICES_COL_MAP.ID]),
    }));
}

/**
 * Get contractual value for an equipment.
 */
export function getValorContratual(equipamento: string): number | null {
  return VALORES_CONTRATUAIS[normStr(equipamento)] || null;
}

/**
 * Identify the worst-performing sub-index for an equipment.
 * Uses weighted gap to determine priority.
 */
export function identificarMaiorProblema(equip: IndicesRow): MaiorProblemaInfo {
  const indices = [
    { nome: 'IDF', val: safeNum(equip.IDF), desc: 'Disponibilidade', peso: 100 },
    { nome: 'IEVri', val: safeNum(equip.IEVri), desc: 'Envio Imagens', peso: 28 },
    { nome: 'IEVdt', val: safeNum(equip.IEVdt), desc: 'Envio Dados', peso: 28 },
    { nome: 'ICId', val: safeNum(equip.ICId), desc: 'Captura Diurna', peso: 28 },
    { nome: 'ICIn', val: safeNum(equip.ICIn), desc: 'Captura Noturna', peso: 28 },
    { nome: 'ILPd', val: safeNum(equip.ILPd), desc: 'Leitura Diurna', peso: 7 },
    { nome: 'ILPn', val: safeNum(equip.ILPn), desc: 'Leitura Noturna', peso: 7 },
    { nome: 'ICV', val: safeNum(equip.ICV), desc: 'Classificação', peso: 10 },
  ];

  const problemas = indices
    .filter((i) => i.val !== null && i.val < 1.0)
    .map((i) => ({
      nome: i.nome,
      valor: i.val!,
      gap: (1 - i.val!) * 100,
      gapPonderado: (1 - i.val!) * i.peso,
      descricao: i.desc,
      peso: i.peso,
    }))
    .sort((a, b) => b.gapPonderado - a.gapPonderado);

  if (problemas.length === 0) {
    return { nome: 'Nenhum', valor: 1.0, gap: 0, severidade: 'ok', descricao: '' };
  }

  const pior = problemas[0];
  let severidade: MaiorProblemaInfo['severidade'] = 'ok';
  if (pior.gapPonderado > 15) severidade = 'critico';
  else if (pior.gapPonderado > 8) severidade = 'grave';
  else if (pior.gapPonderado > 3) severidade = 'moderado';
  else severidade = 'leve';

  return {
    nome: pior.nome,
    valor: pior.valor,
    gap: pior.gap,
    gapPonderado: pior.gapPonderado,
    descricao: pior.descricao,
    peso: pior.peso,
    severidade,
  };
}

/**
 * Calculate financial loss per sub-index for an equipment.
 *
 * Formula documentation:
 *   IEF = 0.8 × [(ICId + ICIn)/2] × [(IEVri + IEVdt)/2] + 0.2 × [(ILPd + ILPn)/2]
 *   ID = IDF × (0.9 × IEF + 0.1 × ICV)  [for CEV type]
 *
 * Losses are distributed proportionally to weighted gaps.
 * NOTE: This is NOT additive — individual losses sum to more than real total
 * because indices are interdependent (especially IEF which uses products).
 */
export function calcularPerdaPorSubIndice(equip: IndicesRow): PerdaSubIndice[] | null {
  const valorContratual = equip.ValorContratual;
  const ID_atual = safeNum(equip.ID);
  if (!valorContratual || !ID_atual) return null;

  const perdaTotal = valorContratual * (1 - ID_atual);

  const vals = {
    ICId: safeNum(equip.ICId),
    ICIn: safeNum(equip.ICIn),
    IEVri: safeNum(equip.IEVri),
    IEVdt: safeNum(equip.IEVdt),
    ILPd: safeNum(equip.ILPd),
    ILPn: safeNum(equip.ILPn),
    ICV: safeNum(equip.ICV),
    IDF: safeNum(equip.IDF),
  };

  if (Object.values(vals).some((v) => v === null)) return null;

  const indices = [
    { nome: 'ICId', valor: vals.ICId!, peso: 0.36 },
    { nome: 'ICIn', valor: vals.ICIn!, peso: 0.36 },
    { nome: 'IEVri', valor: vals.IEVri!, peso: 0.36 },
    { nome: 'IEVdt', valor: vals.IEVdt!, peso: 0.36 },
    { nome: 'ILPd', valor: vals.ILPd!, peso: 0.09 },
    { nome: 'ILPn', valor: vals.ILPn!, peso: 0.09 },
    { nome: 'ICV', valor: vals.ICV!, peso: 0.10 },
    { nome: 'IDF', valor: vals.IDF!, peso: 1.00 },
  ];

  let somaGapsPonderados = 0;
  const perdas: PerdaSubIndice[] = indices.map((ind) => {
    const gap = Math.max(0, 1 - ind.valor);
    const gapPonderado = gap * ind.peso;
    somaGapsPonderados += gapPonderado;
    return {
      nome: ind.nome,
      atual: ind.valor,
      gap,
      peso: ind.peso,
      gapPonderado,
      perda: 0,
      contribuicao: 0,
    };
  });

  perdas.forEach((p) => {
    if (somaGapsPonderados > 0) {
      p.perda = perdaTotal * (p.gapPonderado / somaGapsPonderados);
      p.contribuicao = (p.gapPonderado / somaGapsPonderados) * 100;
    }
  });

  return perdas.sort((a, b) => b.perda - a.perda);
}

/**
 * Group indices rows by equipment, averaging all index values.
 */
export function groupIndicesByEquipment(rows: IndicesRow[]): IndicesRow[] {
  const groups: Record<string, {
    base: IndicesRow;
    faixas: string[];
    arrays: Record<string, number[]>;
  }> = {};

  const indexKeys = ['ICId', 'ICIn', 'IEVri', 'IEVdt', 'ILPd', 'ILPn', 'IEF', 'ICV', 'IDF', 'ID'] as const;

  rows.forEach((r) => {
    const equip = normStr(r.Equipamento);
    if (!equip) return;

    if (!groups[equip]) {
      groups[equip] = {
        base: { ...r },
        faixas: [],
        arrays: {},
      };
      indexKeys.forEach((k) => { groups[equip].arrays[k] = []; });
    }

    const g = groups[equip];
    g.faixas.push(r.Faixa);
    indexKeys.forEach((k) => {
      const v = safeNum(r[k]);
      if (v !== null) g.arrays[k].push(v);
    });
  });

  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

  return Object.values(groups).map((g) => {
    const avgValues: Partial<IndicesRow> = {};
    indexKeys.forEach((k) => {
      (avgValues as any)[k] = avg(g.arrays[k]);
    });

    const valorContratual = getValorContratual(g.base.Equipamento);
    const avgID = avgValues.ID as number | null;
    const valorReceber = valorContratual && avgID !== null ? valorContratual * avgID : null;
    const desconto = valorContratual && valorReceber !== null ? valorContratual - valorReceber : null;

    const result: IndicesRow = {
      ...g.base,
      ...avgValues,
      Faixa: g.faixas.join(', '),
      NumFaixas: g.faixas.length,
      ValorContratual: valorContratual,
      ValorReceber: valorReceber,
      Desconto: desconto,
      _isGrouped: true,
    };

    result.MaiorProblema = identificarMaiorProblema(result);
    return result;
  });
}

/**
 * Export indices data to Excel.
 */
export function exportIndicesExcel(rows: IndicesRow[]): void {
  const dadosExportar = rows.map((r) => {
    let valorContratual = r.ValorContratual ?? null;
    let valorReceber = r.ValorReceber ?? null;
    let desconto = r.Desconto ?? null;

    if (!r._isGrouped && r.Equipamento) {
      valorContratual = getValorContratual(r.Equipamento);
      const id = safeNum(r.ID);
      if (valorContratual && id !== null) {
        valorReceber = valorContratual * id;
        desconto = valorContratual - valorReceber;
      }
    }

    return {
      Rodovia: normStr(r.Rodovia),
      Km: safeNum(r.Km),
      Equipamento: normStr(r.Equipamento),
      Faixa: normStr(r.Faixa),
      Tipo: normStr(r.Tipo),
      'ICId (%)': safeNum(r.ICId) !== null ? (safeNum(r.ICId)! * 100).toFixed(2) : '',
      'ICIn (%)': safeNum(r.ICIn) !== null ? (safeNum(r.ICIn)! * 100).toFixed(2) : '',
      'IEVri (%)': safeNum(r.IEVri) !== null ? (safeNum(r.IEVri)! * 100).toFixed(2) : '',
      'IEVdt (%)': safeNum(r.IEVdt) !== null ? (safeNum(r.IEVdt)! * 100).toFixed(2) : '',
      'ILPd (%)': safeNum(r.ILPd) !== null ? (safeNum(r.ILPd)! * 100).toFixed(2) : '',
      'ILPn (%)': safeNum(r.ILPn) !== null ? (safeNum(r.ILPn)! * 100).toFixed(2) : '',
      'IEF (%)': safeNum(r.IEF) !== null ? (safeNum(r.IEF)! * 100).toFixed(2) : '',
      'ICV (%)': safeNum(r.ICV) !== null ? (safeNum(r.ICV)! * 100).toFixed(2) : '',
      'IDF (%)': safeNum(r.IDF) !== null ? (safeNum(r.IDF)! * 100).toFixed(2) : '',
      'ID (%)': safeNum(r.ID) !== null ? (safeNum(r.ID)! * 100).toFixed(2) : '',
      'Valor Contratual (R$)': valorContratual?.toFixed(2) ?? '',
      'Valor a Receber (R$)': valorReceber?.toFixed(2) ?? '',
      'Desconto (R$)': desconto?.toFixed(2) ?? '',
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(dadosExportar);
  XLSX.utils.book_append_sheet(wb, ws, 'Relatório Índices');

  const agora = new Date();
  const dataHora = agora.toISOString().slice(0, 19).replace(/:/g, '-');
  XLSX.writeFile(wb, `Relatorio_Indices_${dataHora}.xlsx`);
}
