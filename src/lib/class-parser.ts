import * as XLSX from 'xlsx';
import { ClassRecord } from '@/types';

const EQUIP_RE = /^[A-Z]{2,3}\d{6,}$/i;
const TIPO_RE = /^(CEV|REV|CEC|REC)$/i;

export function parseClassFile(buffer: ArrayBuffer): ClassRecord[] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true }) as unknown[][];

  let dataStart = -1;
  for (let i = 0; i < Math.min(12, raw.length); i++) {
    const r = raw[i];
    if (!r || !r[6]) continue;
    const eq = String(r[6] || '').trim();
    const tp = String(r[7] || '').trim();
    if (EQUIP_RE.test(eq) && TIPO_RE.test(tp)) { dataStart = i; break; }
  }
  if (dataStart < 0) {
    for (let i = 0; i < Math.min(12, raw.length); i++) {
      const r = raw[i];
      if (!r || !r[0]) continue;
      const s = String(r[0]).trim();
      if (s.length > 4 && !s.toLowerCase().startsWith('operadora') && !s.toLowerCase().startsWith('tipo')) { dataStart = i; break; }
    }
  }
  if (dataStart < 0) dataStart = 4;

  const rows = raw.slice(dataStart).filter(r => r && r[6] && String(r[6]).trim());

  // Detect column offsets from header rows
  let colImagem = 10, colAmbiente = 11, colEnquadramento = 12, colSinalizacao = 13;
  let colMudanca = 14, colMaisUm = 15, colEstrangeira = 16, colPlaca = 17;
  let colRenavam = 18, colMarca = 19, colArt280 = 20;
  let colValidas = 9, colICId = 21, colICIn = 22;

  for (let i = 0; i < Math.min(dataStart, raw.length); i++) {
    const r = raw[i];
    if (!r) continue;
    for (let j = 0; j < r.length; j++) {
      const v = String(r[j] || '').trim().toLowerCase();
      if (v === 'imagem') colImagem = j;
      if (v === 'ambiente') colAmbiente = j;
      if (v.includes('enquadramento')) colEnquadramento = j;
      if (v.includes('sinaliza')) colSinalizacao = j;
      if (v.includes('mudança') || v.includes('mudanca')) colMudanca = j;
      if (v.includes('mais de um')) colMaisUm = j;
      if (v.includes('estrangeira')) colEstrangeira = j;
      if (v === 'placa') colPlaca = j;
      if (v.includes('renavam')) colRenavam = j;
      if (v.includes('marca')) colMarca = j;
      if (v.includes('280')) colArt280 = j;
      if (v.includes('válidas') || v.includes('validas')) colValidas = j;
      if (v === 'icid') colICId = j;
      if (v === 'icin') colICIn = j;
    }
  }

  return rows.map(r => {
    const g = (i: number) => {
      const v = r[i];
      if (v === null || v === undefined || v === '') return 0;
      if (typeof v === 'number') return isNaN(v) ? 0 : v;
      const n = parseFloat(String(v).replace(',', '.'));
      return isNaN(n) ? 0 : n;
    };
    const validas = g(colValidas);
    const imagem = g(colImagem);
    const ambiente = g(colAmbiente);
    const enquadramento = g(colEnquadramento);
    const sinalizacao = g(colSinalizacao);
    const mudancaFaixa = g(colMudanca);
    const maisUm = g(colMaisUm);
    const estrangeira = g(colEstrangeira);
    const placa = g(colPlaca);
    const renavam = g(colRenavam);
    const marca = g(colMarca);
    const art280 = g(colArt280);
    const totalSplice = imagem + enquadramento + sinalizacao;
    const totalOutros = ambiente + mudancaFaixa + maisUm + estrangeira + placa + renavam + marca + art280;
    const totalInvalidas = totalSplice + totalOutros;
    return {
      operadora: (r[0] || '').toString().trim(),
      tipoRodovia: (r[1] || '').toString().trim(),
      rodovia: (r[2] || '').toString().trim(),
      km: parseFloat(String(r[3])) || 0,
      municipio: (r[4] || '').toString().trim(),
      equipamento: (r[6] || '').toString().trim(),
      tipo: (r[7] || '').toString().trim().toUpperCase(),
      faixa: (r[8] || '').toString().trim(),
      validas, imagem, ambiente, enquadramento, sinalizacao,
      mudancaFaixa, maisUm, estrangeira, placa, renavam, marca, art280,
      totalSplice, totalOutros, totalInvalidas,
      totalConferidas: validas + totalInvalidas,
      pctSplice: totalInvalidas > 0 ? totalSplice / totalInvalidas : 0,
      ICId: g(colICId),
      ICIn: g(colICIn),
    };
  }).filter(r => r.equipamento && r.equipamento.length > 2);
}
