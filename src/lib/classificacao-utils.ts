import * as XLSX from 'xlsx';
import {
  CLASSIFICACAO_COL_MAP,
  SPLICE_MOTIVOS,
  DER_MOTIVOS,
  MOTIVOS_LABELS,
} from './constants';
import { ClassificacaoRow, ClassificacaoMotivos } from '@/types';
import { normStr, safeNum } from './format';

const ALL_MOTIVOS = [...Object.keys(MOTIVOS_LABELS)] as (keyof ClassificacaoMotivos)[];

/**
 * Parse a ClassificacaoInfracaoInvalida.xlsx file.
 * Data starts at row 5 (index 4).
 */
export function parseClassificacaoFile(buffer: ArrayBuffer): ClassificacaoRow[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false }) as unknown[][];

  const dataStartRow = 4;

  return rows
    .slice(dataStartRow)
    .filter((row) => row[CLASSIFICACAO_COL_MAP.Equipamento] && row[CLASSIFICACAO_COL_MAP.Equipamento] !== '')
    .map((row) => {
      const validas = safeNum(row[CLASSIFICACAO_COL_MAP.Validas]) || 0;
      const motivos: ClassificacaoMotivos = {
        Imagem: safeNum(row[CLASSIFICACAO_COL_MAP.Imagem]) || 0,
        Ambiente: safeNum(row[CLASSIFICACAO_COL_MAP.Ambiente]) || 0,
        Enquadramento: safeNum(row[CLASSIFICACAO_COL_MAP.Enquadramento]) || 0,
        SinalizacaoTransito: safeNum(row[CLASSIFICACAO_COL_MAP.SinalizacaoTransito]) || 0,
        MudancaFaixa: safeNum(row[CLASSIFICACAO_COL_MAP.MudancaFaixa]) || 0,
        MaisVeiculos: safeNum(row[CLASSIFICACAO_COL_MAP.MaisVeiculos]) || 0,
        PlacaEstrangeira: safeNum(row[CLASSIFICACAO_COL_MAP.PlacaEstrangeira]) || 0,
        Placa: safeNum(row[CLASSIFICACAO_COL_MAP.Placa]) || 0,
        VeiculoNaoEncontrado: safeNum(row[CLASSIFICACAO_COL_MAP.VeiculoNaoEncontrado]) || 0,
        MarcaModelo: safeNum(row[CLASSIFICACAO_COL_MAP.MarcaModelo]) || 0,
      };

      let totalInvalidas = 0;
      let maiorMotivo: string | null = null;
      let maiorValor = 0;

      ALL_MOTIVOS.forEach((key) => {
        const val = motivos[key];
        totalInvalidas += val;
        if (val > maiorValor) {
          maiorValor = val;
          maiorMotivo = key;
        }
      });

      const splice = (SPLICE_MOTIVOS as readonly string[]).reduce(
        (sum, key) => sum + (motivos[key as keyof ClassificacaoMotivos] || 0), 0
      );
      const der = (DER_MOTIVOS as readonly string[]).reduce(
        (sum, key) => sum + (motivos[key as keyof ClassificacaoMotivos] || 0), 0
      );
      const total = validas + totalInvalidas;

      return {
        Operadora: String(row[CLASSIFICACAO_COL_MAP.Operadora] ?? ''),
        Rodovia: String(row[CLASSIFICACAO_COL_MAP.Rodovia] ?? ''),
        Km: safeNum(row[CLASSIFICACAO_COL_MAP.Km]),
        Equipamento: String(row[CLASSIFICACAO_COL_MAP.Equipamento] ?? ''),
        Tipo: String(row[CLASSIFICACAO_COL_MAP.Tipo] ?? ''),
        Faixa: String(row[CLASSIFICACAO_COL_MAP.Faixa] ?? ''),
        Validas: validas,
        Motivos: motivos,
        TotalInvalidas: totalInvalidas,
        PercInvalidas: total > 0 ? (totalInvalidas / total) * 100 : 0,
        PercDER: total > 0 ? (der / total) * 100 : 0,
        PercSplice: total > 0 ? (splice / total) * 100 : 0,
        MaiorMotivo: maiorMotivo,
        MaiorValor: maiorValor,
        Splice: splice,
        DER: der,
        RespPrincipal: (splice > der ? 'Splice' : 'DER') as 'Splice' | 'DER',
      };
    });
}

/**
 * Group rows by equipment, summing all values.
 */
export function groupClassificacaoByEquipment(rows: ClassificacaoRow[]): ClassificacaoRow[] {
  const groups: Record<string, {
    base: ClassificacaoRow;
    faixas: string[];
    Validas: number;
    TotalInvalidas: number;
    Splice: number;
    DER: number;
    Motivos: ClassificacaoMotivos;
  }> = {};

  rows.forEach((r) => {
    const equip = normStr(r.Equipamento);
    if (!equip) return;

    if (!groups[equip]) {
      groups[equip] = {
        base: { ...r },
        faixas: [],
        Validas: 0,
        TotalInvalidas: 0,
        Splice: 0,
        DER: 0,
        Motivos: { ...r.Motivos },
      };
      // Zero out motivos for clean accumulation
      ALL_MOTIVOS.forEach((k) => { groups[equip].Motivos[k] = 0; });
    }

    const g = groups[equip];
    g.faixas.push(r.Faixa);
    g.Validas += r.Validas;
    g.TotalInvalidas += r.TotalInvalidas;
    g.Splice += r.Splice;
    g.DER += r.DER;
    ALL_MOTIVOS.forEach((k) => { g.Motivos[k] += r.Motivos[k]; });
  });

  return Object.values(groups).map((g) => {
    let maiorMotivo: string | null = null;
    let maiorValor = 0;
    ALL_MOTIVOS.forEach((k) => {
      if (g.Motivos[k] > maiorValor) {
        maiorValor = g.Motivos[k];
        maiorMotivo = k;
      }
    });

    const total = g.Validas + g.TotalInvalidas;

    return {
      ...g.base,
      Validas: g.Validas,
      Motivos: g.Motivos,
      TotalInvalidas: g.TotalInvalidas,
      Splice: g.Splice,
      DER: g.DER,
      NumFaixas: g.faixas.length,
      Faixa: g.faixas.join(', '),
      PercInvalidas: total > 0 ? (g.TotalInvalidas / total) * 100 : 0,
      PercDER: total > 0 ? (g.DER / total) * 100 : 0,
      PercSplice: total > 0 ? (g.Splice / total) * 100 : 0,
      MaiorMotivo: maiorMotivo,
      MaiorValor: maiorValor,
      RespPrincipal: (g.Splice > g.DER ? 'Splice' : 'DER') as 'Splice' | 'DER',
      _isGrouped: true,
    };
  });
}

/**
 * Export classificação data to CSV.
 */
export function exportClassificacaoCSV(rows: ClassificacaoRow[]): void {
  let csv = 'Equipamento,Rodovia,Km,Faixa,Tipo,Validas,Invalidas,%Invalidas,%DER,%Splice,MaiorProblema,Splice,DER,RespPrincipal\n';
  rows.forEach((r) => {
    csv += `${r.Equipamento},${r.Rodovia},${r.Km},${r.Faixa},${r.Tipo},${r.Validas},${r.TotalInvalidas},${r.PercInvalidas.toFixed(2)},${r.PercDER.toFixed(2)},${r.PercSplice.toFixed(2)},${r.MaiorMotivo ? MOTIVOS_LABELS[r.MaiorMotivo] : ''},${r.Splice},${r.DER},${r.RespPrincipal}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'analise-classificacao-infracoes.csv';
  a.click();
  URL.revokeObjectURL(url);
}
