/**
 * Exporta o Relatório Executivo (página Resumo) para .xlsx editável.
 * Mesma fonte de dados do PDF — paridade total com a UI.
 */
import * as XLSX from 'xlsx';
import { EquipGroup } from '@/types';

export interface ResumoStats {
  criticos: number;
  alerta: number;
  ok: number;
  descontoTotal: number;
}

function severidadeLabel(id: number | null): string {
  if (id === null) return 'Sem dados';
  if (id >= 0.85) return 'OK';
  if (id >= 0.60) return 'Alerta';
  return 'Crítico';
}

function gerarRecomendacoes(g: EquipGroup): string[] {
  const linhas: string[] = [];
  const id = g.c_ID ?? 0;
  const idf = g.c_IDF ?? 0;
  const ief = g.c_IEF ?? 0;
  const icv = g.c_ICV ?? 0;
  const icid = g.c_ICId ?? 0;
  const icin = g.c_ICIn ?? 0;
  const ievri = g.c_IEVri ?? 0;
  const ievdt = g.c_IEVdt ?? 0;
  const ilpd = g.c_ILPd ?? 0;
  const ilpn = g.c_ILPn ?? 0;
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (id >= 0.85) {
    linhas.push('Equipamento com desempenho satisfatório (ID ≥ 85%). Manter práticas atuais de manutenção e monitoramento.');
    return linhas;
  }
  if (idf < 0.95) linhas.push(`IDF em ${pct(idf)} — Disponibilidade reduzida. Verificar telemetria, manutenção preventiva, certificação INMETRO e conectividade. Recuperação potencial: ${fmt(g.perdaIDF)}.`);
  if (icid < 0.85) linhas.push(`ICId em ${pct(icid)} — Captura diurna baixa. Revisar alinhamento, limpeza de lente, foco e obstruções.`);
  if (icin < 0.85) linhas.push(`ICIn em ${pct(icin)} — Captura noturna baixa. Verificar iluminação IR, sensibilidade noturna e exposição.`);
  if (ievri < 0.90) linhas.push(`IEVri em ${pct(ievri)} — Envio de imagens abaixo do esperado. Verificar latência, fila de envio e falhas de rede.`);
  if (ievdt < 0.90) linhas.push(`IEVdt em ${pct(ievdt)} — Envio de dados de tráfego insuficiente. Verificar conexão e integridade dos pacotes.`);
  if (ilpd < 0.75) linhas.push(`ILPd em ${pct(ilpd)} — Leitura de placas diurna deficiente. Revisar resolução, ângulo e condições das placas.`);
  if (ilpn < 0.75) linhas.push(`ILPn em ${pct(ilpn)} — Leitura de placas noturna deficiente. Verificar IR, baixa luminosidade e exposição.`);
  if (icv < 0.95) linhas.push(`ICV em ${pct(icv)} — Classificação de veículos abaixo do ideal. Verificar laços indutivos, sensores e parametrização.`);
  if (ief < 0.90 && linhas.length === 0) linhas.push(`IEF em ${pct(ief)} — Eficiência geral comprometida. Revisão completa dos sub-índices.`);
  if (linhas.length === 0) linhas.push('Equipamento com desempenho satisfatório, mas com margem para otimização.');
  if (g.melhorAlavanca.perda > 0) linhas.push(`Maior alavanca de melhoria: ${g.melhorAlavanca.nome} — recuperação potencial até ${fmt(g.melhorAlavanca.perda)}.`);
  return linhas;
}

const NAVY = '1E3A5F';
const RED = 'FCA5A5';
const AMBER = 'FCD34D';
const GREEN = 'A7F3D0';

function styleHeader(cell: XLSX.CellObject) {
  (cell as any).s = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: NAVY } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } },
    },
  };
}

export function exportResumoToExcel(
  groups: EquipGroup[],
  stats: ResumoStats | null,
  periodo: string | null,
) {
  const wb = XLSX.utils.book_new();
  const periodoStr = periodo || 'geral';
  const dataGeracao = new Date().toLocaleString('pt-BR');

  // ============= Aba 1 — Resumo Executivo =============
  const resumoAOA: any[][] = [
    ['Relatório Executivo — DER Analytics'],
    [`Período: ${periodoStr}`],
    [`Gerado em: ${dataGeracao}`],
    [],
    ['KPIs Gerais'],
    ['Indicador', 'Valor'],
    ['Equipamentos Críticos (<60%)', stats?.criticos ?? 0],
    ['Equipamentos Alerta (60–85%)', stats?.alerta ?? 0],
    ['Equipamentos OK (≥85%)', stats?.ok ?? 0],
    ['Desconto Total (R$)', stats?.descontoTotal ?? 0],
    [],
    ['Observações Gerais'],
    [''], [''], [''], [''], [''], [''], [''], [''],
    [],
    ['Imagens / Anexos'],
    [''], [''], [''], [''], [''], [''],
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumoAOA);
  wsResumo['!cols'] = [{ wch: 40 }, { wch: 30 }];
  wsResumo['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
    { s: { r: 11, c: 0 }, e: { r: 11, c: 1 } },
    { s: { r: 20, c: 0 }, e: { r: 20, c: 1 } },
  ];
  // título
  if (wsResumo['A1']) (wsResumo['A1'] as any).s = { font: { bold: true, sz: 16, color: { rgb: NAVY } } };
  if (wsResumo['A5']) (wsResumo['A5'] as any).s = { font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: NAVY } } };
  if (wsResumo['A12']) (wsResumo['A12'] as any).s = { font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: NAVY } } };
  if (wsResumo['A21']) (wsResumo['A21'] as any).s = { font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: NAVY } } };
  if (wsResumo['A6']) styleHeader(wsResumo['A6'] as XLSX.CellObject);
  if (wsResumo['B6']) styleHeader(wsResumo['B6'] as XLSX.CellObject);
  // formato moeda no desconto total
  if (wsResumo['B10']) (wsResumo['B10'] as any).z = 'R$ #,##0.00';
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo Executivo');

  // ============= Aba 2 — Equipamentos =============
  const headers = [
    'Equipamento', 'Rodovia', 'KM', 'Tipo', 'Lote', 'Nº Faixas',
    'ID', 'IDF', 'IEF', 'ICV',
    'ICId', 'ICIn', 'IEVri', 'IEVdt', 'ILPd', 'ILPn',
    'Severidade',
    'Valor Contratado (R$)', 'Valor Recebido (R$)', 'Desconto (R$)',
    'Principal Alavanca', 'Recuperação Potencial (R$)',
    'Observações', 'Imagem',
  ];
  const rows = groups.map(g => [
    g.equipamento, g.rodovia, g.km, g.tipo, g.lote || '', g.numFaixas,
    g.c_ID, g.c_IDF, g.c_IEF, g.c_ICV,
    g.c_ICId, g.c_ICIn, g.c_IEVri, g.c_IEVdt, g.c_ILPd, g.c_ILPn,
    severidadeLabel(g.c_ID),
    g.valorTotal || 0, g.valorRecebidoTotal || 0, g.descontoTotal || 0,
    g.melhorAlavanca?.nome || '', g.melhorAlavanca?.perda || 0,
    '', '',
  ]);
  const wsEquip = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  wsEquip['!cols'] = [
    { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 8 },
    { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
    { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
    { wch: 12 },
    { wch: 16 }, { wch: 16 }, { wch: 14 },
    { wch: 16 }, { wch: 18 },
    { wch: 40 }, { wch: 18 },
  ];
  wsEquip['!freeze'] = { xSplit: 1, ySplit: 1 } as any;
  (wsEquip as any)['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: headers.length - 1 } }) };

  // estiliza cabeçalhos
  for (let c = 0; c < headers.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (wsEquip[addr]) styleHeader(wsEquip[addr] as XLSX.CellObject);
  }
  // formatação por linha
  for (let r = 1; r <= rows.length; r++) {
    // percentuais (cols 6..15)
    for (let c = 6; c <= 15; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (wsEquip[addr]) (wsEquip[addr] as any).z = '0.0%';
    }
    // moedas (cols 17..19, 21)
    for (const c of [17, 18, 19, 21]) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (wsEquip[addr]) (wsEquip[addr] as any).z = 'R$ #,##0.00';
    }
    // severidade — cor de fundo (col 16)
    const sevAddr = XLSX.utils.encode_cell({ r, c: 16 });
    const sev = rows[r - 1][16] as string;
    const sevColor = sev === 'Crítico' ? RED : sev === 'Alerta' ? AMBER : sev === 'OK' ? GREEN : 'EEEEEE';
    if (wsEquip[sevAddr]) {
      (wsEquip[sevAddr] as any).s = {
        font: { bold: true },
        fill: { fgColor: { rgb: sevColor } },
        alignment: { horizontal: 'center' },
      };
    }
  }
  XLSX.utils.book_append_sheet(wb, wsEquip, 'Equipamentos');

  // ============= Aba 3 — Recomendações Detalhadas =============
  const recAOA: any[][] = [['Equipamento', 'Localização', 'Severidade', 'ID', 'Recomendação', 'Observações / Imagem']];
  groups.forEach(g => {
    const sev = severidadeLabel(g.c_ID);
    const idStr = g.c_ID !== null ? `${(g.c_ID * 100).toFixed(1)}%` : '—';
    const loc = `${g.rodovia} km ${g.km} · ${g.tipo}`;
    const recs = gerarRecomendacoes(g);
    recs.forEach((rec, i) => {
      recAOA.push([
        i === 0 ? g.equipamento : '',
        i === 0 ? loc : '',
        i === 0 ? sev : '',
        i === 0 ? idStr : '',
        rec,
        '',
      ]);
    });
    recAOA.push(['', '', '', '', '', '']); // espaço entre equipamentos
  });
  const wsRec = XLSX.utils.aoa_to_sheet(recAOA);
  wsRec['!cols'] = [
    { wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 10 }, { wch: 80 }, { wch: 40 },
  ];
  wsRec['!freeze'] = { xSplit: 0, ySplit: 1 } as any;
  for (let c = 0; c < 6; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (wsRec[addr]) styleHeader(wsRec[addr] as XLSX.CellObject);
  }
  // wrap text na coluna de recomendação
  for (let r = 1; r < recAOA.length; r++) {
    const addr = XLSX.utils.encode_cell({ r, c: 4 });
    if (wsRec[addr]) (wsRec[addr] as any).s = { alignment: { wrapText: true, vertical: 'top' } };
  }
  XLSX.utils.book_append_sheet(wb, wsRec, 'Recomendações');

  XLSX.writeFile(wb, `Relatorio_Executivo_${periodoStr}.xlsx`);
}
