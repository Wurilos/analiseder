/**
 * Exporta o Relatório Executivo (página Resumo) para .xlsx FORMATADO,
 * com layout visual semelhante ao PDF: cards por equipamento, blocos de
 * índices coloridos por severidade, subíndices e recomendações.
 *
 * Usa xlsx-js-style (fork do SheetJS que respeita estilos).
 */
import XLSX from 'xlsx-js-style';
import { EquipGroup } from '@/types';

export interface ResumoStats {
  criticos: number;
  alerta: number;
  ok: number;
  descontoTotal: number;
}

// ---------- helpers de severidade / cores
function severidadeLabel(id: number | null): string {
  if (id === null) return 'Sem dados';
  if (id >= 0.85) return 'OK';
  if (id >= 0.60) return 'Alerta';
  return 'Crítico';
}
function corPorSeveridade(id: number | null) {
  if (id === null) return { bg: 'F3F4F6', fg: '6B7280' };
  if (id >= 0.85) return { bg: 'D1FAE5', fg: '065F46' };
  if (id >= 0.60) return { bg: 'FEF3C7', fg: '92400E' };
  return { bg: 'FEE2E2', fg: '991B1B' };
}

const NAVY = '1E3A5F';
const NAVY_LIGHT = '2D4A7A';
const MUTED_BG = 'F8FAFC';
const BORDER = 'CBD5E1';
const RED_BG = 'FEE2E2'; const RED_FG = '991B1B';
const AMBER_BG = 'FEF3C7'; const AMBER_FG = '92400E';
const GREEN_BG = 'D1FAE5'; const GREEN_FG = '065F46';

const fmtPct = (v: number | null) => v === null ? '—' : `${(v * 100).toFixed(1)}%`;
const fmtMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const border = {
  top: { style: 'thin', color: { rgb: BORDER } },
  bottom: { style: 'thin', color: { rgb: BORDER } },
  left: { style: 'thin', color: { rgb: BORDER } },
  right: { style: 'thin', color: { rgb: BORDER } },
};

// ---------- recomendações (mesmo conteúdo do PDF)
function gerarRecomendacoes(g: EquipGroup): string[] {
  const linhas: string[] = [];
  const id = g.c_ID ?? 0, idf = g.c_IDF ?? 0, ief = g.c_IEF ?? 0, icv = g.c_ICV ?? 0;
  const icid = g.c_ICId ?? 0, icin = g.c_ICIn ?? 0;
  const ievri = g.c_IEVri ?? 0, ievdt = g.c_IEVdt ?? 0;
  const ilpd = g.c_ILPd ?? 0, ilpn = g.c_ILPn ?? 0;

  if (id >= 0.85) {
    linhas.push('✓ Equipamento com desempenho satisfatório (ID ≥ 85%). Manter práticas atuais de manutenção e monitoramento.');
    return linhas;
  }
  if (idf < 0.95) linhas.push(`⚠ IDF em ${fmtPct(idf)} — Disponibilidade reduzida. Verificar telemetria, manutenção preventiva, certificação INMETRO e conectividade. Recuperação potencial: ${fmtMoeda(g.perdaIDF)}.`);
  if (icid < 0.85) linhas.push(`📷 ICId em ${fmtPct(icid)} — Captura diurna baixa. Revisar alinhamento, limpeza de lente, foco e obstruções.`);
  if (icin < 0.85) linhas.push(`🌙 ICIn em ${fmtPct(icin)} — Captura noturna baixa. Verificar iluminação IR, sensibilidade noturna e exposição.`);
  if (ievri < 0.90) linhas.push(`📤 IEVri em ${fmtPct(ievri)} — Envio de imagens abaixo do esperado. Verificar latência, fila de envio e falhas de rede.`);
  if (ievdt < 0.90) linhas.push(`📊 IEVdt em ${fmtPct(ievdt)} — Envio de dados de tráfego insuficiente. Verificar conexão e integridade dos pacotes.`);
  if (ilpd < 0.75) linhas.push(`🔤 ILPd em ${fmtPct(ilpd)} — Leitura de placas diurna deficiente. Revisar resolução, ângulo e condições das placas.`);
  if (ilpn < 0.75) linhas.push(`🔤 ILPn em ${fmtPct(ilpn)} — Leitura de placas noturna deficiente. Verificar IR, baixa luminosidade e exposição.`);
  if (icv < 0.95) linhas.push(`🚗 ICV em ${fmtPct(icv)} — Classificação de veículos abaixo do ideal. Verificar laços indutivos, sensores e parametrização.`);
  if (ief < 0.90 && linhas.length === 0) linhas.push(`📉 IEF em ${fmtPct(ief)} — Eficiência geral comprometida. Revisão completa dos sub-índices.`);
  if (linhas.length === 0) linhas.push('ℹ Equipamento com desempenho satisfatório, mas com margem para otimização.');
  if (g.melhorAlavanca.perda > 0) linhas.push(`💡 Maior alavanca de melhoria: ${g.melhorAlavanca.nome} — recuperação potencial até ${fmtMoeda(g.melhorAlavanca.perda)}.`);
  return linhas;
}

// ---------- builder de aba "Relatório" (visual semelhante ao PDF)
function buildRelatorio(groups: EquipGroup[], stats: ResumoStats | null, periodo: string): XLSX.WorkSheet {
  // Layout: 8 colunas (A..H). Larguras ajustadas.
  const COLS = 8;
  const ws: XLSX.WorkSheet = {};
  const merges: XLSX.Range[] = [];
  const rows: any[] = [];
  let r = 0;

  const setCell = (row: number, col: number, value: any, style?: any, type: 's' | 'n' = 's') => {
    const addr = XLSX.utils.encode_cell({ r: row, c: col });
    ws[addr] = { v: value, t: type === 'n' ? 'n' : 's', s: style };
  };
  const fillRow = (row: number, style: any) => {
    for (let c = 0; c < COLS; c++) {
      const addr = XLSX.utils.encode_cell({ r: row, c });
      if (!ws[addr]) ws[addr] = { v: '', t: 's', s: style };
    }
  };
  const setRowHeight = (row: number, h: number) => {
    rows[row] = { hpt: h };
  };

  // ===== CABEÇALHO PRINCIPAL =====
  setCell(r, 0, 'RELATÓRIO EXECUTIVO — DER ANALYTICS', {
    font: { bold: true, sz: 18, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: NAVY } },
    alignment: { horizontal: 'center', vertical: 'center' },
  });
  fillRow(r, { fill: { fgColor: { rgb: NAVY } } });
  merges.push({ s: { r, c: 0 }, e: { r, c: COLS - 1 } });
  setRowHeight(r, 32);
  r++;

  setCell(r, 0, `Período: ${periodo}    ·    Gerado em: ${new Date().toLocaleString('pt-BR')}`, {
    font: { sz: 10, italic: true, color: { rgb: '475569' } },
    alignment: { horizontal: 'center' },
  });
  fillRow(r, { fill: { fgColor: { rgb: MUTED_BG } } });
  merges.push({ s: { r, c: 0 }, e: { r, c: COLS - 1 } });
  setRowHeight(r, 20);
  r++;
  r++; // linha em branco

  // ===== KPIs GERAIS =====
  if (stats) {
    setCell(r, 0, 'KPIs GERAIS', {
      font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: NAVY_LIGHT } },
      alignment: { horizontal: 'left', vertical: 'center', indent: 1 },
    });
    fillRow(r, { fill: { fgColor: { rgb: NAVY_LIGHT } } });
    merges.push({ s: { r, c: 0 }, e: { r, c: COLS - 1 } });
    setRowHeight(r, 22);
    r++;

    const kpis = [
      { label: 'Críticos (<60%)', value: stats.criticos, bg: RED_BG, fg: RED_FG },
      { label: 'Alerta (60–85%)', value: stats.alerta, bg: AMBER_BG, fg: AMBER_FG },
      { label: 'OK (≥85%)', value: stats.ok, bg: GREEN_BG, fg: GREEN_FG },
      { label: 'Desconto Total', value: fmtMoeda(stats.descontoTotal), bg: 'F1F5F9', fg: '0F172A' },
    ];
    // labels
    kpis.forEach((k, i) => {
      const c = i * 2;
      setCell(r, c, k.label, {
        font: { bold: true, sz: 9, color: { rgb: '64748B' } },
        fill: { fgColor: { rgb: k.bg } },
        alignment: { horizontal: 'center' },
        border,
      });
      merges.push({ s: { r, c }, e: { r, c: c + 1 } });
    });
    setRowHeight(r, 18);
    r++;
    // values
    kpis.forEach((k, i) => {
      const c = i * 2;
      setCell(r, c, k.value, {
        font: { bold: true, sz: 16, color: { rgb: k.fg } },
        fill: { fgColor: { rgb: k.bg } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border,
      });
      merges.push({ s: { r, c }, e: { r, c: c + 1 } });
    });
    setRowHeight(r, 32);
    r++;
    r++;
  }

  // ===== UM "CARD" POR EQUIPAMENTO =====
  groups.forEach((g, idx) => {
    const sevId = g.c_ID;
    const sev = severidadeLabel(sevId);
    const sevC = corPorSeveridade(sevId);

    // --- header do card (faixa colorida por severidade)
    setCell(r, 0, `${idx + 1}.  ${g.equipamento}`, {
      font: { bold: true, sz: 12, color: { rgb: '0F172A' }, name: 'Consolas' },
      fill: { fgColor: { rgb: sevC.bg } },
      alignment: { horizontal: 'left', vertical: 'center', indent: 1 },
      border,
    });
    merges.push({ s: { r, c: 0 }, e: { r, c: 4 } });
    setCell(r, 5, `ID ${fmtPct(g.c_ID)}  (${sev})`, {
      font: { bold: true, sz: 11, color: { rgb: sevC.fg } },
      fill: { fgColor: { rgb: sevC.bg } },
      alignment: { horizontal: 'right', vertical: 'center' },
      border,
    });
    merges.push({ s: { r, c: 5 }, e: { r, c: COLS - 1 } });
    fillRow(r, { fill: { fgColor: { rgb: sevC.bg } }, border });
    setRowHeight(r, 26);
    r++;

    // --- subheader: localização + financeiro
    const loc = `${g.rodovia} km ${g.km}  ·  ${g.tipo}  ·  ${g.numFaixas} faixa(s)  ·  Lote ${g.lote || '—'}  ·  Série ${g.serie ?? 'Pendente'}`;
    setCell(r, 0, loc, {
      font: { sz: 9, color: { rgb: '475569' } },
      fill: { fgColor: { rgb: MUTED_BG } },
      alignment: { horizontal: 'left', vertical: 'center', indent: 1 },
      border,
    });
    merges.push({ s: { r, c: 0 }, e: { r, c: 4 } });
    const desc = g.descontoTotal > 0
      ? `Desconto: ${fmtMoeda(g.descontoTotal)}`
      : 'Sem desconto';
    setCell(r, 5, desc, {
      font: { sz: 9, bold: true, color: { rgb: g.descontoTotal > 0 ? RED_FG : '475569' } },
      fill: { fgColor: { rgb: MUTED_BG } },
      alignment: { horizontal: 'right', vertical: 'center' },
      border,
    });
    merges.push({ s: { r, c: 5 }, e: { r, c: COLS - 1 } });
    fillRow(r, { fill: { fgColor: { rgb: MUTED_BG } }, border });
    setRowHeight(r, 18);
    r++;

    // --- bloco "Índices Principais" — título
    setCell(r, 0, 'ÍNDICES PRINCIPAIS', {
      font: { bold: true, sz: 8, color: { rgb: '64748B' } },
      alignment: { horizontal: 'left', indent: 1 },
    });
    merges.push({ s: { r, c: 0 }, e: { r, c: COLS - 1 } });
    setRowHeight(r, 14);
    r++;

    // 4 cartões: ID, IDF, IEF, ICV — em 8 colunas (cada um ocupa 2 colunas)
    const principais = [
      { k: 'ID', label: 'Desempenho', v: g.c_ID, t: 0.95 },
      { k: 'IDF', label: 'Disponibilidade', v: g.c_IDF, t: 0.95 },
      { k: 'IEF', label: 'Eficiência', v: g.c_IEF, t: 0.90 },
      { k: 'ICV', label: 'Class. Veículos', v: g.c_ICV, t: 0.95 },
    ];
    // linha 1: sigla + valor
    principais.forEach((idx2, i) => {
      const c = i * 2;
      const bad = idx2.v !== null && idx2.v < idx2.t;
      const bg = bad ? RED_BG : 'F1F5F9';
      const fg = bad ? RED_FG : '0F172A';
      setCell(r, c, idx2.k, {
        font: { bold: true, sz: 9, color: { rgb: '64748B' } },
        fill: { fgColor: { rgb: bg } },
        alignment: { horizontal: 'left', indent: 1, vertical: 'center' },
        border,
      });
      setCell(r, c + 1, fmtPct(idx2.v), {
        font: { bold: true, sz: 13, color: { rgb: fg }, name: 'Consolas' },
        fill: { fgColor: { rgb: bg } },
        alignment: { horizontal: 'right', indent: 1, vertical: 'center' },
        border,
      });
    });
    setRowHeight(r, 22);
    r++;
    // linha 2: descrição
    principais.forEach((idx2, i) => {
      const c = i * 2;
      const bad = idx2.v !== null && idx2.v < idx2.t;
      const bg = bad ? RED_BG : 'F1F5F9';
      setCell(r, c, idx2.label, {
        font: { sz: 8, color: { rgb: '64748B' } },
        fill: { fgColor: { rgb: bg } },
        alignment: { horizontal: 'left', indent: 1 },
        border,
      });
      setCell(r, c + 1, '', {
        fill: { fgColor: { rgb: bg } },
        border,
      });
    });
    setRowHeight(r, 14);
    r++;

    // --- bloco "Subíndices" — título
    setCell(r, 0, 'SUBÍNDICES', {
      font: { bold: true, sz: 8, color: { rgb: '64748B' } },
      alignment: { horizontal: 'left', indent: 1 },
    });
    merges.push({ s: { r, c: 0 }, e: { r, c: COLS - 1 } });
    setRowHeight(r, 14);
    r++;

    // 6 subíndices em 8 colunas — vamos usar 6 dessas 8 (ocupam c=1..6 deixando margem)
    // Para simplicidade: cada subíndice usa 1 coluna; ocupamos cols 1..6 (8 cols totais — bordas em todas)
    const subs = [
      { k: 'ICId', label: 'Cap. Diurna', v: g.c_ICId, t: 0.85 },
      { k: 'ICIn', label: 'Cap. Noturna', v: g.c_ICIn, t: 0.85 },
      { k: 'IEVri', label: 'Env. Imagens', v: g.c_IEVri, t: 0.90 },
      { k: 'IEVdt', label: 'Env. Dados', v: g.c_IEVdt, t: 0.90 },
      { k: 'ILPd', label: 'Placa Diurna', v: g.c_ILPd, t: 0.75 },
      { k: 'ILPn', label: 'Placa Noturna', v: g.c_ILPn, t: 0.75 },
    ];
    // 6 subs em 8 colunas → distribui cada um em ceil(8/6)≈1 coluna; usa 6 colunas centralizadas + bordas nas 2 laterais
    // Mais simples: 6 colunas centrais (c=1..6), c=0 e c=7 ficam vazios (margem)
    setCell(r, 0, '', { fill: { fgColor: { rgb: 'FFFFFF' } } });
    setCell(r, 7, '', { fill: { fgColor: { rgb: 'FFFFFF' } } });
    subs.forEach((s, i) => {
      const c = i + 1;
      const bad = s.v !== null && s.v < s.t;
      const bg = bad ? RED_BG : 'F8FAFC';
      const fg = bad ? RED_FG : '0F172A';
      setCell(r, c, `${s.k}\n${fmtPct(s.v)}`, {
        font: { bold: true, sz: 10, color: { rgb: fg } },
        fill: { fgColor: { rgb: bg } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border,
      });
    });
    setRowHeight(r, 32);
    r++;
    // linha de descrição dos subs
    setCell(r, 0, '', { fill: { fgColor: { rgb: 'FFFFFF' } } });
    setCell(r, 7, '', { fill: { fgColor: { rgb: 'FFFFFF' } } });
    subs.forEach((s, i) => {
      const c = i + 1;
      const bad = s.v !== null && s.v < s.t;
      const bg = bad ? RED_BG : 'F8FAFC';
      setCell(r, c, s.label, {
        font: { sz: 7, color: { rgb: '64748B' } },
        fill: { fgColor: { rgb: bg } },
        alignment: { horizontal: 'center', wrapText: true },
        border,
      });
    });
    setRowHeight(r, 14);
    r++;

    // --- maior alavanca (se houver)
    if (g.melhorAlavanca && g.melhorAlavanca.perda > 0) {
      setCell(r, 0, `⚠ Principal causa: ${g.melhorAlavanca.nome} — Recuperação potencial: ${fmtMoeda(g.melhorAlavanca.perda)}`, {
        font: { bold: true, sz: 10, color: { rgb: AMBER_FG } },
        fill: { fgColor: { rgb: AMBER_BG } },
        alignment: { horizontal: 'left', vertical: 'center', indent: 1, wrapText: true },
        border: {
          top: { style: 'medium', color: { rgb: AMBER_FG } },
          bottom: { style: 'medium', color: { rgb: AMBER_FG } },
          left: { style: 'medium', color: { rgb: AMBER_FG } },
          right: { style: 'medium', color: { rgb: AMBER_FG } },
        },
      });
      merges.push({ s: { r, c: 0 }, e: { r, c: COLS - 1 } });
      fillRow(r, { fill: { fgColor: { rgb: AMBER_BG } } });
      setRowHeight(r, 22);
      r++;
    }

    // --- recomendações
    setCell(r, 0, 'RECOMENDAÇÕES DE MELHORIA', {
      font: { bold: true, sz: 9, color: { rgb: '0F172A' } },
      fill: { fgColor: { rgb: 'E2E8F0' } },
      alignment: { horizontal: 'left', vertical: 'center', indent: 1 },
      border,
    });
    fillRow(r, { fill: { fgColor: { rgb: 'E2E8F0' } } });
    merges.push({ s: { r, c: 0 }, e: { r, c: COLS - 1 } });
    setRowHeight(r, 18);
    r++;

    const recs = gerarRecomendacoes(g);
    recs.forEach(rec => {
      setCell(r, 0, rec, {
        font: { sz: 9, color: { rgb: '334155' } },
        alignment: { horizontal: 'left', vertical: 'top', indent: 1, wrapText: true },
        border,
      });
      fillRow(r, { border });
      merges.push({ s: { r, c: 0 }, e: { r, c: COLS - 1 } });
      // altura proporcional ao tamanho do texto
      setRowHeight(r, Math.max(20, Math.ceil(rec.length / 90) * 16));
      r++;
    });

    // --- linha "Observações / Imagens" (campo livre p/ o usuário)
    setCell(r, 0, 'Observações / Imagens:', {
      font: { bold: true, sz: 9, color: { rgb: '64748B' }, italic: true },
      fill: { fgColor: { rgb: MUTED_BG } },
      alignment: { horizontal: 'left', vertical: 'top', indent: 1 },
      border,
    });
    fillRow(r, { fill: { fgColor: { rgb: MUTED_BG } }, border });
    merges.push({ s: { r, c: 0 }, e: { r, c: COLS - 1 } });
    setRowHeight(r, 60);
    r++;

    // espaço entre cards
    r++;
  });

  // larguras de coluna
  ws['!cols'] = [
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
  ];
  ws['!rows'] = rows;
  ws['!merges'] = merges;
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r, c: COLS - 1 } });
  // congela o cabeçalho principal
  (ws as any)['!freeze'] = { xSplit: 0, ySplit: 2 };
  // configurações de impressão
  (ws as any)['!margins'] = { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 };

  return ws;
}

// ---------- aba "Dados" tabular (uma linha por equipamento) — para análise rápida
function buildDados(groups: EquipGroup[]): XLSX.WorkSheet {
  const headers = [
    'Equipamento', 'Nº Série', 'Rodovia', 'KM', 'Tipo', 'Lote', 'Nº Faixas',
    'ID', 'IDF', 'IEF', 'ICV',
    'ICId', 'ICIn', 'IEVri', 'IEVdt', 'ILPd', 'ILPn',
    'Severidade',
    'Valor Contratado (R$)', 'Valor Recebido (R$)', 'Desconto (R$)',
    'Principal Alavanca', 'Recuperação Potencial (R$)',
    'Observações',
  ];
  const rows = groups.map(g => [
    g.equipamento, g.serie ?? 'Pendente', g.rodovia, g.km, g.tipo, g.lote || '', g.numFaixas,
    g.c_ID, g.c_IDF, g.c_IEF, g.c_ICV,
    g.c_ICId, g.c_ICIn, g.c_IEVri, g.c_IEVdt, g.c_ILPd, g.c_ILPn,
    severidadeLabel(g.c_ID),
    g.valorTotal || 0, g.valorRecebidoTotal || 0, g.descontoTotal || 0,
    g.melhorAlavanca?.nome || '', g.melhorAlavanca?.perda || 0,
    '',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // estilo cabeçalho
  for (let c = 0; c < headers.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[addr]) {
      (ws[addr] as any).s = {
        font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: NAVY } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border,
      };
    }
  }
  // formatação por linha
  for (let r = 1; r <= rows.length; r++) {
    for (let c = 6; c <= 15; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (ws[addr]) {
        (ws[addr] as any).z = '0.0%';
        (ws[addr] as any).s = { ...((ws[addr] as any).s || {}), border, alignment: { horizontal: 'right' }, font: { name: 'Consolas', sz: 10 } };
      }
    }
    for (const c of [17, 18, 19, 21]) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (ws[addr]) {
        (ws[addr] as any).z = 'R$ #,##0.00';
        (ws[addr] as any).s = { ...((ws[addr] as any).s || {}), border, alignment: { horizontal: 'right' }, font: { name: 'Consolas', sz: 10 } };
      }
    }
    // severidade colorida
    const sevAddr = XLSX.utils.encode_cell({ r, c: 16 });
    const sev = rows[r - 1][16] as string;
    const c = sev === 'Crítico' ? { bg: RED_BG, fg: RED_FG }
           : sev === 'Alerta' ? { bg: AMBER_BG, fg: AMBER_FG }
           : sev === 'OK' ? { bg: GREEN_BG, fg: GREEN_FG }
           : { bg: 'F1F5F9', fg: '475569' };
    if (ws[sevAddr]) {
      (ws[sevAddr] as any).s = {
        font: { bold: true, sz: 10, color: { rgb: c.fg } },
        fill: { fgColor: { rgb: c.bg } },
        alignment: { horizontal: 'center' },
        border,
      };
    }
    // demais células de texto: borda + tamanho padrão
    for (const c2 of [0, 1, 2, 3, 4, 5, 20, 22]) {
      const addr = XLSX.utils.encode_cell({ r, c: c2 });
      if (ws[addr]) {
        (ws[addr] as any).s = { ...((ws[addr] as any).s || {}), border, font: { sz: 10 }, alignment: { vertical: 'center' } };
      }
    }
  }

  ws['!cols'] = [
    { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 8 },
    { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
    { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
    { wch: 12 },
    { wch: 16 }, { wch: 16 }, { wch: 14 },
    { wch: 16 }, { wch: 18 },
    { wch: 40 },
  ];
  (ws as any)['!freeze'] = { xSplit: 1, ySplit: 1 };
  (ws as any)['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: headers.length - 1 } }) };
  return ws;
}

// ---------- API pública
export function exportResumoToExcel(
  groups: EquipGroup[],
  stats: ResumoStats | null,
  periodo: string | null,
) {
  const periodoStr = periodo || 'geral';
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildRelatorio(groups, stats, periodoStr), 'Relatório');
  XLSX.utils.book_append_sheet(wb, buildDados(groups), 'Dados');
  XLSX.writeFile(wb, `Relatorio_Executivo_${periodoStr}.xlsx`);
}
