import React, { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { groupByEquipamento } from '@/lib/grouping';
import { calcGainPotential, getRecommendations, calcIDAtual } from '@/lib/calc-engine';
import { IDRecord, EquipGroup, ViewMode } from '@/types';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DetailModal } from '@/components/RankingDetailModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Layers, Server, FileDown, MessageSquareText } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { EQUIP_CATALOG } from '@/lib/equip-catalog';
import { useObservacoes } from '@/hooks/useObservacoes';

function displaySerie(equipamento: string, serie: number | null | undefined): string {
  let s = serie ?? 0;
  if (!s) {
    const cat = EQUIP_CATALOG[equipamento];
    if (cat && cat.serie) s = cat.serie;
  }
  return s > 0 ? String(s) : 'Pendente';
}

function displayCodMedicao(equipamento: string): string {
  return EQUIP_CATALOG[equipamento]?.codMedicao || '—';
}

function fmt(v: number | null, d = 3) {
  if (v === null || v === undefined || isNaN(v as number)) return '—';
  return Number(v).toFixed(d);
}

function getDisplayID<T extends { f_ID?: number | null; c_ID?: number | null }>(item: T) {
  return item.f_ID ?? item.c_ID ?? null;
}

function idBadge(v: number | null) {
  if (v === null) return 'badge-slate';
  return v < 0.6 ? 'badge-red' : v < 0.85 ? 'badge-amber' : 'badge-green';
}

function idxCell(v: number | null) {
  if (v === null || v === undefined) return <span className="text-muted-foreground">—</span>;
  const color = v < 0.5 ? 'text-red-600 dark:text-destructive' : v < 0.8 ? 'text-amber-600 dark:text-primary' : 'text-green-600 dark:text-emerald-400';
  return <span className={`font-mono ${color}`}>{fmt(v)}</span>;
}

function pdfIdxColor(v: number | null): string {
  if (v === null || v === undefined || isNaN(v as number)) return '#666';
  if (v < 0.5) return '#dc2626';
  if (v < 0.8) return '#d97706';
  return '#16a34a';
}

function pdfIdColor(v: number | null): string {
  if (v === null || v === undefined || isNaN(v as number)) return '#666';
  if (v < 0.6) return '#dc2626';
  if (v < 0.85) return '#d97706';
  return '#16a34a';
}

function pdfIdxCell(v: number | null): string {
  const color = pdfIdxColor(v);
  return `<td style="text-align:center;color:${color};font-weight:600">${fmt(v)}</td>`;
}

function fmtCurrency(v: number) {
  return v.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

const RankingPage: React.FC = () => {
  const { getActiveRecords } = useData();
  const records = getActiveRecords();
  const { obs: obsMap } = useObservacoes();
  const [search, setSearch] = useState('');
  const [fTipo, setFTipo] = useState('');
  const [fRodovia, setFRodovia] = useState('');
  const [sortBy, setSortBy] = useState('id_asc');
  const [idxFilter, setIdxFilter] = useState('');
  const [maintFilter, setMaintFilter] = useState<'' | 'only' | 'hide'>('');
  const [detail, setDetail] = useState<IDRecord | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('faixa');
  const [exporting, setExporting] = useState(false);

  const tipos = useMemo(() => [...new Set(records.map(r => r.tipo))].sort(), [records]);
  const rodovias = useMemo(() => [...new Set(records.map(r => r.rodovia))].sort(), [records]);

  const filteredRecords = useMemo(() => {
    let recs = [...records];
    if (search) {
      const s = search.toLowerCase();
      recs = recs.filter(r =>
        r.equipamento.toLowerCase().includes(s) ||
        r.municipio.toLowerCase().includes(s) ||
        String(r.serie ?? '').includes(s)
      );
    }
    if (fTipo) recs = recs.filter(r => r.tipo === fTipo);
    if (fRodovia) recs = recs.filter(r => r.rodovia === fRodovia);
    if (maintFilter === 'only') recs = recs.filter(r => Boolean(obsMap[r.equipamento]));
    else if (maintFilter === 'hide') recs = recs.filter(r => !obsMap[r.equipamento]);
    if (idxFilter) {
      const [field, op, valStr] = idxFilter.split('|');
      const val = parseFloat(valStr);
      recs = recs.filter(r => {
        const v = field === 'f_ID' ? getDisplayID(r) : (r as any)[field];
        if (v === null || v === undefined) return false;
        if (op === 'lt') return v < val;
        if (op === 'gte') return v >= val;
        if (op === 'eq') return Math.abs(v - val) < 0.001;
        return true;
      });
    }
    return recs;
  }, [records, search, fTipo, fRodovia, idxFilter, maintFilter, obsMap]);

  const sorted = useMemo(() => {
      const SORT_FIELDS: Record<string, string> = {
      id_asc: 'display_ID',
      id_desc: 'display_ID',
      idf_asc: 'c_IDF',
      idf_desc: 'c_IDF',
      ief_asc: 'c_IEF',
      ief_desc: 'c_IEF',
      icv_asc: 'c_ICV',
      icv_desc: 'c_ICV',
      icid_asc: 'c_ICId',
      icin_asc: 'c_ICIn',
      ievri_asc: 'c_IEVri',
      ievdt_asc: 'c_IEVdt',
      ilpd_asc: 'c_ILPd',
      ilpn_asc: 'c_ILPn',
    };

    return [...filteredRecords].sort((a, b) => {
      if (sortBy === 'gain_desc') {
        return calcGainPotential(a).total_gap - calcGainPotential(b).total_gap;
      }
      const fld = SORT_FIELDS[sortBy] || 'display_ID';
      const av = fld === 'display_ID' ? getDisplayID(a) : (a as any)[fld];
      const bv = fld === 'display_ID' ? getDisplayID(b) : (b as any)[fld];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      return sortBy.endsWith('desc') ? bv - av : av - bv;
    });
  }, [filteredRecords, sortBy]);

  const totalEquipamentos = useMemo(() => groupByEquipamento(records).length, [records]);

  const equipGroups = useMemo(() => {
    const groups = groupByEquipamento(filteredRecords);
    return [...groups].sort((a, b) => {
      if (sortBy === 'gain_desc') return b.descontoTotal - a.descontoTotal;
      const fld = sortBy.replace('_asc', '').replace('_desc', '');
      const key = `c_${fld.toUpperCase()}`;
      const av = (a as any)[key] ?? (a as any)[`c_${fld}`];
      const bv = (b as any)[key] ?? (b as any)[`c_${fld}`];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      return sortBy.endsWith('desc') ? bv - av : av - bv;
    });
  }, [filteredRecords, sortBy]);

  const faixaCount = sorted.length;
  const equipamentoCount = equipGroups.length;
  const totalFaixas = records.length;
  const hasFilters = Boolean(search || fTipo || fRodovia || idxFilter || maintFilter);

  const handleExportPDF = async () => {
    setExporting(true);
    let container: HTMLDivElement | null = null;

    try {
      const dateStr = new Date().toLocaleDateString('pt-BR');
      const isEquip = viewMode === 'equipamento';
      const title = isEquip ? 'Ranking de Equipamentos' : 'Ranking de Faixas';
      const totalLabel = isEquip
        ? `${equipamentoCount} de ${totalEquipamentos} Equipamentos`
        : `${faixaCount} de ${totalFaixas} Faixas`;

      let rowsHtml = '';
      if (isEquip) {
        rowsHtml = equipGroups.map((g, i) => {
          const idAtuais = filteredRecords
            .filter(r => r.equipamento === g.equipamento)
            .map(r => calcIDAtual(r))
            .filter((v): v is number => v !== null);
          const avgAtual = idAtuais.length ? idAtuais.reduce((s, v) => s + v, 0) / idAtuais.length : null;
          const idColor = g.c_ID === null ? '#666' : g.c_ID < 0.6 ? '#dc2626' : g.c_ID < 0.85 ? '#d97706' : '#16a34a';
          const atColor = avgAtual === null ? '#666' : avgAtual < 0.6 ? '#dc2626' : avgAtual < 0.85 ? '#d97706' : '#16a34a';

          return `<tr>
            <td style="text-align:center">${i + 1}</td>
            <td style="text-align:center;font-weight:bold;color:#1e40af">${displaySerie(g.equipamento, g.serie)}</td>
            <td style="text-align:center;font-family:monospace;font-size:7px">${displayCodMedicao(g.equipamento)}</td>
            <td style="text-align:left">${g.equipamento}</td>
            <td style="text-align:center">${g.tipo}</td>
            <td style="text-align:center">${g.numFaixas}</td>
            <td style="text-align:center">${g.rodovia}</td>
            <td style="text-align:center">${g.km ?? '—'}</td>
            ${pdfIdxCell(g.c_IDF)}
            ${pdfIdxCell(g.c_IEF)}
            ${pdfIdxCell(g.c_ICV)}
            ${pdfIdxCell(g.c_ICId)}
            ${pdfIdxCell(g.c_ICIn)}
            ${pdfIdxCell(g.c_IEVri)}
            ${pdfIdxCell(g.c_IEVdt)}
            ${pdfIdxCell(g.c_ILPd)}
            ${pdfIdxCell(g.c_ILPn)}
            <td style="text-align:center;color:${idColor};font-weight:700">${fmt(g.c_ID)}</td>
            <td style="text-align:center;color:${atColor};font-weight:700">${fmt(avgAtual)}</td>
            <td style="text-align:left">${g.melhorAlavanca.perda > 0 ? g.melhorAlavanca.nome : '✓ Bom'}</td>
            <td style="text-align:center;color:#dc2626;font-weight:700">${g.descontoTotal > 0 ? fmtCurrency(g.descontoTotal) : '—'}</td>
          </tr>`;
        }).join('');
      } else {
        rowsHtml = sorted.map((r, i) => {
          const gain = calcGainPotential(r);
          const recos = getRecommendations(r);
          const main = recos[0];
          const id = getDisplayID(r);
          const idAt = calcIDAtual(r);
          const idColor = id === null ? '#666' : id < 0.6 ? '#dc2626' : id < 0.85 ? '#d97706' : '#16a34a';
          const atColor = idAt === null ? '#666' : idAt < 0.6 ? '#dc2626' : idAt < 0.85 ? '#d97706' : '#16a34a';

          return `<tr>
            <td style="text-align:center">${i + 1}</td>
            <td style="text-align:center;font-weight:bold;color:#1e40af">${displaySerie(r.equipamento, r.serie)}</td>
            <td style="text-align:center;font-family:monospace;font-size:7px">${displayCodMedicao(r.equipamento)}</td>
            <td style="text-align:left">${r.equipamento}</td>
            <td style="text-align:center">${r.tipo}</td>
            <td style="text-align:center">${r.faixa}</td>
            <td style="text-align:center">${r.rodovia}</td>
            <td style="text-align:center">${r.km ?? '—'}</td>
            ${pdfIdxCell(r.c_IDF)}
            ${pdfIdxCell(r.c_IEF)}
            ${pdfIdxCell(r.c_ICV)}
            ${pdfIdxCell(r.c_ICId)}
            ${pdfIdxCell(r.c_ICIn)}
            ${pdfIdxCell(r.c_IEVri)}
            ${pdfIdxCell(r.c_IEVdt)}
            ${pdfIdxCell(r.c_ILPd)}
            ${pdfIdxCell(r.c_ILPn)}
            <td style="text-align:center;color:${idColor};font-weight:700">${fmt(id)}</td>
            <td style="text-align:center;color:${atColor};font-weight:700">${fmt(idAt)}</td>
            <td style="text-align:left">${main ? main.title.split(' — ')[0] : '✓ Bom'}</td>
            <td style="text-align:center;color:#16a34a;font-weight:700">+${fmt(gain.total_gap)}</td>
          </tr>`;
        }).join('');
      }

      const headersHtml = isEquip
        ? `<tr><th>#</th><th>Série</th><th>Cód. DER</th><th>Equipamento</th><th>Tipo</th><th>Faixas</th><th>Rodovia</th><th>Km</th><th>IDF</th><th>IEF</th><th>ICV</th><th>ICId</th><th>ICIn</th><th>IEVri</th><th>IEVdt</th><th>ILPd</th><th>ILPn</th><th>ID Médio</th><th>ID Atual</th><th>Alavanca</th><th>Desconto</th></tr>`
        : `<tr><th>#</th><th>Série</th><th>Cód. DER</th><th>Equip</th><th>Tipo</th><th>Faixa</th><th>Rodovia</th><th>Km</th><th>IDF</th><th>IEF</th><th>ICV</th><th>ICId</th><th>ICIn</th><th>IEVri</th><th>IEVdt</th><th>ILPd</th><th>ILPn</th><th>ID</th><th>ID Atual</th><th>Causa Principal</th><th>Ganho</th></tr>`;

      const filtersInfo = [
        fTipo && `Tipo: ${fTipo}`,
        fRodovia && `Rodovia: ${fRodovia}`,
        search && `Busca: "${search}"`,
        idxFilter && 'Filtro índice ativo',
      ].filter(Boolean).join(' • ');

      const PAGE_WIDTH_PX = 1075;
      const PDF_PAGE_WIDTH_MM = 297;
      const PDF_PAGE_HEIGHT_MM = 210;
      const PDF_MARGIN_MM = 8;
      const PDF_CONTENT_WIDTH_MM = PDF_PAGE_WIDTH_MM - PDF_MARGIN_MM * 2;
      const PDF_CONTENT_HEIGHT_MM = PDF_PAGE_HEIGHT_MM - PDF_MARGIN_MM * 2;

      container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '0';
      container.style.top = '0';
      container.style.width = `${PAGE_WIDTH_PX}px`;
      container.style.background = '#ffffff';
      container.style.zIndex = '-1';
      container.style.pointerEvents = 'none';
      container.style.boxSizing = 'border-box';
      container.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 0; color: #111; background: #fff; width: ${PAGE_WIDTH_PX}px; box-sizing: border-box;">
          <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1e40af;padding-bottom:6px;margin-bottom:8px;gap:12px;">
            <div>
              <h1 style="margin:0;font-size:16px;color:#1e40af">DER/SP — ${title}</h1>
              <div style="font-size:9px;color:#555;margin-top:2px">Edital 145/2023 • ${totalLabel}${filtersInfo ? ' • ' + filtersInfo : ''}</div>
            </div>
            <div style="font-size:9px;color:#555;text-align:right;white-space:nowrap">Gerado em ${dateStr}</div>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:7.5px;table-layout:fixed;word-break:break-word;overflow-wrap:anywhere;">
            <thead style="background:#1e40af;color:#fff;display:table-header-group">${headersHtml}</thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <style>
            table th, table td { border: 1px solid #d1d5db; padding: 2px 3px; text-align: center; vertical-align: middle; }
            table thead th { font-weight: 700; font-size: 7.5px; text-align: center; }
            table tbody tr:nth-child(even) { background: #f8fafc; }
          </style>
        </div>
      `;
      document.body.appendChild(container);

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const fullCanvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: PAGE_WIDTH_PX,
        width: PAGE_WIDTH_PX,
        scrollX: 0,
        scrollY: 0,
      });

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageHeightPx = Math.floor((fullCanvas.width * PDF_CONTENT_HEIGHT_MM) / PDF_CONTENT_WIDTH_MM);
      let offsetY = 0;
      let isFirstPage = true;

      while (offsetY < fullCanvas.height) {
        const sliceHeightPx = Math.min(pageHeightPx, fullCanvas.height - offsetY);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = fullCanvas.width;
        pageCanvas.height = sliceHeightPx;

        const ctx = pageCanvas.getContext('2d');
        if (!ctx) throw new Error('Falha ao preparar a página do PDF.');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          fullCanvas,
          0,
          offsetY,
          fullCanvas.width,
          sliceHeightPx,
          0,
          0,
          fullCanvas.width,
          sliceHeightPx,
        );

        const sliceHeightMm = (sliceHeightPx * PDF_CONTENT_WIDTH_MM) / fullCanvas.width;
        if (!isFirstPage) pdf.addPage();
        pdf.addImage(
          pageCanvas.toDataURL('image/jpeg', 0.98),
          'JPEG',
          PDF_MARGIN_MM,
          PDF_MARGIN_MM,
          PDF_CONTENT_WIDTH_MM,
          sliceHeightMm,
        );

        offsetY += sliceHeightPx;
        isFirstPage = false;
      }

      pdf.save(`Ranking_${isEquip ? 'Equipamentos' : 'Faixas'}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      if (container?.parentNode) {
        container.parentNode.removeChild(container);
      }
      setExporting(false);
    }
  };

  if (!records.length) {
    return (
      <div className="empty-state">
        <div className="text-5xl mb-4">📋</div>
        <h3 className="text-lg font-semibold mb-1">Sem dados</h3>
        <p>Importe uma planilha primeiro.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Ranking & Diagnóstico</div>
          <div className="page-subtitle">Todos os equipamentos com análise de causa e potencial de melhoria</div>
        </div>
        <div className="filters">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode('faixa')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${viewMode === 'faixa' ? 'bg-primary text-primary-foreground' : 'bg-secondary/30 text-muted-foreground hover:bg-secondary/50'}`}
            >
              <Layers className="w-4 h-4" /> Faixa
            </button>
            <button
              onClick={() => setViewMode('equipamento')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${viewMode === 'equipamento' ? 'bg-primary text-primary-foreground' : 'bg-secondary/30 text-muted-foreground hover:bg-secondary/50'}`}
            >
              <Server className="w-4 h-4" /> Equipamento
            </button>
          </div>

          <input
            type="text"
            placeholder="Buscar série/equip..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-44"
          />

          <select value={fTipo} onChange={e => setFTipo(e.target.value)}>
            <option value="">Todos tipos</option>
            {tipos.map(t => <option key={t}>{t}</option>)}
          </select>

          <select value={fRodovia} onChange={e => setFRodovia(e.target.value)}>
            <option value="">Todas rodovias</option>
            {rodovias.map(r => <option key={r}>{r}</option>)}
          </select>

          <select value={maintFilter} onChange={e => setMaintFilter(e.target.value as '' | 'only' | 'hide')} title="Filtrar equipamentos em manutenção (com observação cadastrada)">
            <option value="">Manutenção: todos</option>
            <option value="only">🛠 Só em manutenção</option>
            <option value="hide">Ocultar em manutenção</option>
          </select>

          <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <optgroup label="Índice de Desempenho">
              <option value="id_asc">ID ↑ (pior primeiro)</option>
              <option value="id_desc">ID ↓ (melhor primeiro)</option>
            </optgroup>
            <optgroup label="Subíndices">
              <option value="idf_asc">IDF ↑</option>
              <option value="ief_asc">IEF ↑</option>
              <option value="icv_asc">ICV ↑</option>
              <option value="icid_asc">ICId ↑</option>
              <option value="icin_asc">ICIn ↑</option>
              <option value="ievri_asc">IEVri ↑</option>
              <option value="ievdt_asc">IEVdt ↑</option>
              <option value="ilpd_asc">ILPd ↑</option>
              <option value="ilpn_asc">ILPn ↑</option>
            </optgroup>
            <optgroup label="Análise">
              <option value="gain_desc">{viewMode === 'faixa' ? 'Maior Ganho Potencial' : 'Maior Desconto'}</option>
            </optgroup>
          </select>

          <select className="min-w-[140px]" value={idxFilter} onChange={e => setIdxFilter(e.target.value)}>
            <option value="">Filtrar por índice...</option>
            <optgroup label="ID">
              <option value="f_ID|lt|0.60">ID &lt; 0.60</option>
              <option value="f_ID|lt|0.85">ID &lt; 0.85</option>
              <option value="f_ID|gte|0.85">ID ≥ 0.85</option>
            </optgroup>
            <optgroup label="IDF">
              <option value="c_IDF|lt|0.95">IDF &lt; 0.95</option>
              <option value="c_IDF|lt|0.80">IDF &lt; 0.80</option>
            </optgroup>
            <optgroup label="IEF">
              <option value="c_IEF|lt|0.80">IEF &lt; 0.80</option>
              <option value="c_IEF|lt|0.50">IEF &lt; 0.50</option>
            </optgroup>
          </select>

          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
            title="Exportar ranking atual em PDF (paisagem)"
          >
            <FileDown className="w-4 h-4" />
            {exporting ? 'Gerando...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3>
              {viewMode === 'faixa'
                ? `${faixaCount} de ${totalFaixas} Faixas`
                : `${equipamentoCount} de ${totalEquipamentos} Equipamentos`}
            </h3>
            {hasFilters && (
              <p className="mt-1 text-xs text-muted-foreground">Há filtros ativos reduzindo a listagem exibida.</p>
            )}
          </div>
          <div className="flex gap-2">
            <span className="badge badge-red">ID &lt; 0.60</span>
            <span className="badge badge-amber">0.60–0.85</span>
            <span className="badge badge-green">≥ 0.85</span>
          </div>
        </div>

        {viewMode === 'faixa' ? (
          <FaixaTable sorted={sorted} onDetail={setDetail} obsMap={obsMap} />
        ) : (
          <EquipTable groups={equipGroups} records={filteredRecords} onDetail={setDetail} obsMap={obsMap} />
        )}
      </div>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-[860px] max-h-[90vh] overflow-y-auto">
          {detail && <DetailModal r={detail} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

function FaixaTable({ sorted, onDetail, obsMap }: { sorted: IDRecord[]; onDetail: (r: IDRecord) => void; obsMap: Record<string, string> }) {
  return (
    <div className="table-wrap overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>#</th><th>Série</th><th>Cód. DER</th><th>Equip</th><th>Tipo</th><th>Faixa</th><th>Rodovia</th><th>Km</th>
            <th>IDF</th><th>IEF</th><th>ICV</th>
            <th>ICId</th><th>ICIn</th><th>IEVri</th><th>IEVdt</th><th>ILPd</th><th>ILPn</th>
            <th>ID</th><th>ID Atual</th><th>Causa Principal</th><th>Ganho</th><th>Ação</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => {
            const gain = calcGainPotential(r);
            const recos = getRecommendations(r);
            const cl = r.c_ID === null ? '' : r.c_ID < 0.6 ? 'id-critical' : r.c_ID < 0.85 ? 'id-low' : 'id-ok';
            const main = recos[0];
            const userObs = obsMap[r.equipamento];
            const obsCls = userObs ? 'has-observacao' : '';
            return (
              <tr
                key={`${r.equipamento}-${r.faixa}-${i}`}
                className={`${cl} ${obsCls} cursor-pointer`}
                onClick={() => onDetail(r)}
                title={userObs ? `Observação: ${userObs}` : undefined}
                style={userObs ? { background: 'hsl(45 95% 92% / 0.45)', borderLeft: '3px solid hsl(38 92% 50%)' } : undefined}
              >
                <td className="text-muted-foreground">{i + 1}</td>
                <td className="font-mono text-primary font-bold">{displaySerie(r.equipamento, r.serie)}</td>
                <td className="font-mono text-[11px] text-muted-foreground">{displayCodMedicao(r.equipamento)}</td>
                <td className="text-muted-foreground text-[11px]">
                  <span className="inline-flex items-center gap-1">
                    {r.equipamento}
                    {userObs && (
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <MessageSquareText
                              className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0"
                              onClick={e => e.stopPropagation()}
                            />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs whitespace-pre-wrap">
                            <div className="font-semibold mb-1 text-amber-600 dark:text-amber-400">Observação</div>
                            {userObs}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </span>
                </td>
                <td><span className={`tag tag-${r.tipo.toLowerCase()}`}>{r.tipo}</span></td>
                <td className="font-mono">{r.faixa}</td>
                <td className="text-muted-foreground text-[11px]">{r.rodovia}</td>
                <td className="font-mono text-muted-foreground text-[11px]">{r.km ?? '—'}</td>
                <td>{idxCell(r.c_IDF)}</td>
                <td>{idxCell(r.c_IEF)}</td>
                <td>{idxCell(r.c_ICV)}</td>
                <td>{idxCell(r.c_ICId)}</td>
                <td>{idxCell(r.c_ICIn)}</td>
                <td>{idxCell(r.c_IEVri)}</td>
                <td>{idxCell(r.c_IEVdt)}</td>
                <td>{idxCell(r.c_ILPd)}</td>
                <td>{idxCell(r.c_ILPn)}</td>
                 <td><span className={`badge ${idBadge(getDisplayID(r))}`}>{fmt(getDisplayID(r))}</span></td>
                <td><span className={`badge ${idBadge(calcIDAtual(r))}`}>{fmt(calcIDAtual(r))}</span></td>
                <td className="text-[11px] max-w-[180px] truncate" style={{ color: main?.priority === 'high' ? '#dc2626' : main?.priority === 'medium' ? '#d97706' : undefined }}>
                  {main ? main.title.split(' — ')[0] : '✓ Bom'}
                </td>
                <td className="font-mono text-green-600 dark:text-emerald-400">+{fmt(gain.total_gap)}</td>
                <td>
                  <button className="btn btn-sm" onClick={e => { e.stopPropagation(); onDetail(r); }}>
                    Ver
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EquipTable({ groups, records, onDetail, obsMap }: { groups: EquipGroup[]; records: IDRecord[]; onDetail: (r: IDRecord) => void; obsMap: Record<string, string> }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="table-wrap overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>#</th><th>Série</th><th>Cód. DER</th><th>Equipamento</th><th>Tipo</th><th>Faixas</th><th>Rodovia</th><th>Km</th>
            <th>IDF</th><th>IEF</th><th>ICV</th>
            <th>ICId</th><th>ICIn</th><th>IEVri</th><th>IEVdt</th><th>ILPd</th><th>ILPn</th>
            <th>ID Médio</th><th>ID Atual</th><th>Alavanca</th><th>Desconto</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g, i) => {
            const cl = g.c_ID === null ? '' : g.c_ID < 0.6 ? 'id-critical' : g.c_ID < 0.85 ? 'id-low' : 'id-ok';
            const isExpanded = expanded === g.equipamento;
            const faixaRecords = records.filter(r => r.equipamento === g.equipamento);
            const userObs = obsMap[g.equipamento];

            return (
              <React.Fragment key={g.equipamento}>
                <tr
                  className={`${cl} cursor-pointer`}
                  onClick={() => setExpanded(isExpanded ? null : g.equipamento)}
                  title={userObs ? `Observação: ${userObs}` : undefined}
                  style={userObs ? { background: 'hsl(45 95% 92% / 0.45)', borderLeft: '3px solid hsl(38 92% 50%)' } : undefined}
                >
                  <td className="text-muted-foreground">{i + 1}</td>
                  <td className="font-mono text-primary font-bold">{displaySerie(g.equipamento, g.serie)}</td>
                  <td className="font-mono text-[11px] text-muted-foreground">{displayCodMedicao(g.equipamento)}</td>
                  <td className="text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                      <span className="font-semibold">{g.equipamento}</span>
                      {userObs && (
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <MessageSquareText
                                className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0"
                                onClick={e => e.stopPropagation()}
                              />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs whitespace-pre-wrap">
                              <div className="font-semibold mb-1 text-amber-600 dark:text-amber-400">Observação</div>
                              {userObs}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </td>
                  <td><span className={`tag tag-${g.tipo.toLowerCase()}`}>{g.tipo}</span></td>
                  <td className="font-mono text-center">{g.numFaixas}</td>
                  <td className="text-muted-foreground text-[11px]">{g.rodovia}</td>
                  <td className="font-mono text-muted-foreground text-[11px]">{g.km ?? '—'}</td>
                  <td>{idxCell(g.c_IDF)}</td>
                  <td>{idxCell(g.c_IEF)}</td>
                  <td>{idxCell(g.c_ICV)}</td>
                  <td>{idxCell(g.c_ICId)}</td>
                  <td>{idxCell(g.c_ICIn)}</td>
                  <td>{idxCell(g.c_IEVri)}</td>
                  <td>{idxCell(g.c_IEVdt)}</td>
                  <td>{idxCell(g.c_ILPd)}</td>
                  <td>{idxCell(g.c_ILPn)}</td>
                  <td><span className={`badge ${idBadge(g.c_ID)}`}>{fmt(g.c_ID)}</span></td>
                  <td>
                    {(() => {
                      const idAtuais = faixaRecords.map(r => calcIDAtual(r)).filter((v): v is number => v !== null);
                      const avgAtual = idAtuais.length ? idAtuais.reduce((s, v) => s + v, 0) / idAtuais.length : null;
                      return <span className={`badge ${idBadge(avgAtual)}`}>{fmt(avgAtual)}</span>;
                    })()}
                  </td>
                  <td className="text-[11px]">
                    <span className={`font-semibold ${g.melhorAlavanca.perda > 0 ? 'text-red-600 dark:text-destructive' : 'text-green-600 dark:text-emerald-400'}`}>
                      {g.melhorAlavanca.perda > 0 ? `${g.melhorAlavanca.nome} (${fmtCurrency(g.melhorAlavanca.perda)})` : '✓ Bom'}
                    </span>
                  </td>
                  <td className="font-mono text-red-600 dark:text-destructive font-semibold">
                    {g.descontoTotal > 0 ? fmtCurrency(g.descontoTotal) : '—'}
                  </td>
                </tr>
                {isExpanded && faixaRecords.map((r, fi) => {
                  const gain = calcGainPotential(r);
                  const recos = getRecommendations(r);
                  const main = recos[0];
                  return (
                    <tr key={`${r.equipamento}-${r.faixa}-${fi}`} className="bg-blue-50/60 dark:bg-blue-950/20 border-l-2 border-l-primary/40 cursor-pointer hover:bg-blue-100/60 dark:hover:bg-blue-900/20" onClick={() => onDetail(r)}>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td className="text-[11px] text-muted-foreground pl-8">↳ Faixa {r.faixa}</td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td>{idxCell(r.c_IDF)}</td>
                      <td>{idxCell(r.c_IEF)}</td>
                      <td>{idxCell(r.c_ICV)}</td>
                      <td>{idxCell(r.c_ICId)}</td>
                      <td>{idxCell(r.c_ICIn)}</td>
                      <td>{idxCell(r.c_IEVri)}</td>
                      <td>{idxCell(r.c_IEVdt)}</td>
                      <td>{idxCell(r.c_ILPd)}</td>
                      <td>{idxCell(r.c_ILPn)}</td>
                       <td><span className={`badge ${idBadge(getDisplayID(r))}`}>{fmt(getDisplayID(r))}</span></td>
                      <td><span className={`badge ${idBadge(calcIDAtual(r))}`}>{fmt(calcIDAtual(r))}</span></td>
                      <td className="text-[11px] max-w-[150px] truncate" style={{ color: main?.priority === 'high' ? '#dc2626' : main?.priority === 'medium' ? '#d97706' : undefined }}>
                        {main ? main.title.split(' — ')[0] : '✓ Bom'}
                      </td>
                      <td className="font-mono text-green-600 dark:text-emerald-400 text-[11px]">+{fmt(gain.total_gap)}</td>
                    </tr>
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default RankingPage;
