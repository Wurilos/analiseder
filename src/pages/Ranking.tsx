import React, { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { groupByEquipamento } from '@/lib/grouping';
import { EQUIP_CATALOG } from '@/lib/equip-catalog';
import { calcGainPotential, getRecommendations, calcIDAtual } from '@/lib/calc-engine';
import { IDRecord, EquipGroup, ViewMode } from '@/types';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DetailModal } from '@/components/RankingDetailModal';
import { Layers, Server } from 'lucide-react';

function fmt(v: number | null, d = 3) {
  if (v === null || v === undefined || isNaN(v as number)) return '—';
  return Number(v).toFixed(d);
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
function fmtCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const RankingPage: React.FC = () => {
  const { getActiveRecords } = useData();
  const records = getActiveRecords();
  const [search, setSearch] = useState('');
  const [fTipo, setFTipo] = useState('');
  const [fRodovia, setFRodovia] = useState('');
  const [sortBy, setSortBy] = useState('id_asc');
  const [idxFilter, setIdxFilter] = useState('');
  const [detail, setDetail] = useState<IDRecord | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('faixa');

  const tipos = useMemo(() => [...new Set(records.map(r => r.tipo))].sort(), [records]);
  const rodovias = useMemo(() => [...new Set(records.map(r => r.rodovia))].sort(), [records]);

  // Filter logic shared by both views
  const filteredRecords = useMemo(() => {
    let recs = records.filter(r => r.c_ID !== null);
    if (search) {
      const s = search.toLowerCase();
      recs = recs.filter(r => r.equipamento.toLowerCase().includes(s) || r.municipio.toLowerCase().includes(s) || String(r.serie ?? '').includes(s));
    }
    if (fTipo) recs = recs.filter(r => r.tipo === fTipo);
    if (fRodovia) recs = recs.filter(r => r.rodovia === fRodovia);
    if (idxFilter) {
      const [field, op, valStr] = idxFilter.split('|');
      const val = parseFloat(valStr);
      recs = recs.filter(r => {
        const v = (r as any)[field];
        if (v === null || v === undefined) return false;
        if (op === 'lt') return v < val;
        if (op === 'gte') return v >= val;
        if (op === 'eq') return Math.abs(v - val) < 0.001;
        return true;
      });
    }
    return recs;
  }, [records, search, fTipo, fRodovia, idxFilter]);

  // Sorted faixa view
  const sorted = useMemo(() => {
    const SORT_FIELDS: Record<string, string> = {
      id_asc: 'c_ID', id_desc: 'c_ID', idf_asc: 'c_IDF', idf_desc: 'c_IDF',
      ief_asc: 'c_IEF', ief_desc: 'c_IEF', icv_asc: 'c_ICV', icv_desc: 'c_ICV',
      icid_asc: 'c_ICId', icin_asc: 'c_ICIn', ievri_asc: 'c_IEVri', ievdt_asc: 'c_IEVdt',
      ilpd_asc: 'c_ILPd', ilpn_asc: 'c_ILPn',
    };
    return [...filteredRecords].sort((a, b) => {
      if (sortBy === 'gain_desc') {
        return (calcGainPotential(a).total_gap) - (calcGainPotential(b).total_gap);
      }
      const fld = SORT_FIELDS[sortBy] || 'c_ID';
      const av = (a as any)[fld] ?? -1, bv = (b as any)[fld] ?? -1;
      return sortBy.endsWith('desc') ? bv - av : av - bv;
    });
  }, [filteredRecords, sortBy]);

  // Grouped equipment view
  const equipGroups = useMemo(() => {
    const groups = groupByEquipamento(filteredRecords);
    return [...groups].sort((a, b) => {
      if (sortBy === 'gain_desc') return (b.descontoTotal) - (a.descontoTotal);
      const fld = sortBy.replace('_asc', '').replace('_desc', '');
      const key = `c_${fld.toUpperCase()}` as string;
      const av = (a as any)[key] ?? (a as any)[`c_${fld}`] ?? -1;
      const bv = (b as any)[key] ?? (b as any)[`c_${fld}`] ?? -1;
      return sortBy.endsWith('desc') ? bv - av : av - bv;
    });
  }, [filteredRecords, sortBy]);

  if (!records.length) {
    return <div className="empty-state"><div className="text-5xl mb-4">📋</div><h3 className="text-lg font-semibold mb-1">Sem dados</h3><p>Importe uma planilha primeiro.</p></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Ranking & Diagnóstico</div>
          <div className="page-subtitle">Todos os equipamentos com análise de causa e potencial de melhoria</div>
        </div>
        <div className="filters">
          {/* View mode toggle */}
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
          <input type="text" placeholder="Buscar série/equip..." value={search} onChange={e => setSearch(e.target.value)} className="w-44" />
          <select value={fTipo} onChange={e => setFTipo(e.target.value)}>
            <option value="">Todos tipos</option>
            {tipos.map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={fRodovia} onChange={e => setFRodovia(e.target.value)}>
            <option value="">Todas rodovias</option>
            {rodovias.map(r => <option key={r}>{r}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <optgroup label="Índice de Desempenho">
              <option value="id_asc">ID ↑ (pior primeiro)</option>
              <option value="id_desc">ID ↓ (melhor primeiro)</option>
            </optgroup>
            <optgroup label="Subíndices">
              <option value="idf_asc">IDF ↑</option><option value="ief_asc">IEF ↑</option><option value="icv_asc">ICV ↑</option>
              <option value="icid_asc">ICId ↑</option><option value="icin_asc">ICIn ↑</option>
              <option value="ievri_asc">IEVri ↑</option><option value="ievdt_asc">IEVdt ↑</option>
            </optgroup>
            <optgroup label="Análise"><option value="gain_desc">{viewMode === 'faixa' ? 'Maior Ganho Potencial' : 'Maior Desconto'}</option></optgroup>
          </select>
          <select className="min-w-[140px]" value={idxFilter} onChange={e => setIdxFilter(e.target.value)}>
            <option value="">Filtrar por índice...</option>
            <optgroup label="ID"><option value="c_ID|lt|0.60">ID &lt; 0.60</option><option value="c_ID|lt|0.85">ID &lt; 0.85</option><option value="c_ID|gte|0.85">ID ≥ 0.85</option></optgroup>
            <optgroup label="IDF"><option value="c_IDF|lt|0.95">IDF &lt; 0.95</option><option value="c_IDF|lt|0.80">IDF &lt; 0.80</option></optgroup>
            <optgroup label="IEF"><option value="c_IEF|lt|0.80">IEF &lt; 0.80</option><option value="c_IEF|lt|0.50">IEF &lt; 0.50</option></optgroup>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{viewMode === 'faixa' ? `${sorted.length} Faixas` : `${equipGroups.length} Equipamentos`}</h3>
          <div className="flex gap-2">
            <span className="badge badge-red">ID &lt; 0.60</span>
            <span className="badge badge-amber">0.60–0.85</span>
            <span className="badge badge-green">≥ 0.85</span>
          </div>
        </div>

        {viewMode === 'faixa' ? (
          <FaixaTable sorted={sorted} onDetail={setDetail} />
        ) : (
          <EquipTable groups={equipGroups} records={filteredRecords} onDetail={setDetail} />
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

/* ============ FAIXA TABLE ============ */
function FaixaTable({ sorted, onDetail }: { sorted: IDRecord[]; onDetail: (r: IDRecord) => void }) {
  return (
    <div className="table-wrap overflow-x-auto">
      <table>
        <thead><tr>
          <th>#</th><th>Série</th><th>Equip</th><th>Tipo</th><th>Faixa</th><th>Rodovia</th><th>Km</th>
          <th>IDF</th><th>IEF</th><th>ICV</th>
          <th>ICId</th><th>ICIn</th><th>IEVri</th><th>IEVdt</th><th>ILPd</th><th>ILPn</th>
          <th>ID</th><th>ID Atual</th><th>Causa Principal</th><th>Ganho</th><th>Ação</th>
        </tr></thead>
        <tbody>
          {sorted.map((r, i) => {
            const gain = calcGainPotential(r);
            const recos = getRecommendations(r);
            const cl = r.c_ID! < 0.6 ? 'id-critical' : r.c_ID! < 0.85 ? 'id-low' : 'id-ok';
            const main = recos[0];
            return (
              <tr key={`${r.equipamento}-${r.faixa}-${i}`} className={`${cl} cursor-pointer`} onClick={() => onDetail(r)}>
                <td className="text-muted-foreground">{i + 1}</td>
                <td className="font-mono text-primary font-bold">{r.serie ?? '—'}</td>
                <td className="text-muted-foreground text-[11px]">{r.equipamento}</td>
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
                <td><span className={`badge ${idBadge(r.c_ID)}`}>{fmt(r.c_ID)}</span></td>
                <td><span className={`badge ${idBadge(calcIDAtual(r))}`}>{fmt(calcIDAtual(r))}</span></td>
                <td className="text-[11px] max-w-[180px] truncate" style={{ color: main?.priority === 'high' ? '#dc2626' : main?.priority === 'medium' ? '#d97706' : undefined }}>
                  {main ? main.title.split(' — ')[0] : '✓ Bom'}
                </td>
                <td className="font-mono text-green-600 dark:text-emerald-400">+{fmt(gain.total_gap)}</td>
                <td><button className="btn btn-sm" onClick={e => { e.stopPropagation(); onDetail(r); }}>Ver</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ============ EQUIPAMENTO TABLE ============ */
function EquipTable({ groups, records, onDetail }: { groups: EquipGroup[]; records: IDRecord[]; onDetail: (r: IDRecord) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="table-wrap overflow-x-auto">
      <table>
        <thead><tr>
          <th>#</th><th>Série</th><th>Equipamento</th><th>Tipo</th><th>Faixas</th><th>Rodovia</th><th>Km</th>
          <th>IDF</th><th>IEF</th><th>ICV</th>
          <th>ICId</th><th>ICIn</th><th>IEVri</th><th>IEVdt</th><th>ILPd</th><th>ILPn</th>
          <th>ID Médio</th><th>ID Atual</th><th>Alavanca</th><th>Desconto</th>
        </tr></thead>
        <tbody>
          {groups.map((g, i) => {
            const cl = (g.c_ID ?? 0) < 0.6 ? 'id-critical' : (g.c_ID ?? 0) < 0.85 ? 'id-low' : 'id-ok';
            const isExpanded = expanded === g.equipamento;
            const faixaRecords = records.filter(r => r.equipamento === g.equipamento);
            const salmonClass = isParalisado(g.equipamento) ? 'bg-salmon/20 hover:bg-salmon/30' : '';

            return (
              <React.Fragment key={g.equipamento}>
                <tr className={`${cl} ${salmonClass} cursor-pointer`} onClick={() => setExpanded(isExpanded ? null : g.equipamento)}>
                  <td className="text-muted-foreground">{i + 1}</td>
                  <td className="font-mono text-primary font-bold">{g.serie ?? '—'}</td>
                  <td className="text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                      <span className="font-semibold">{g.equipamento}</span>
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
                      const faixaRecs = records.filter(r => r.equipamento === g.equipamento);
                      const idAtuais = faixaRecs.map(r => calcIDAtual(r)).filter((v): v is number => v !== null);
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
                {/* Expanded faixas */}
                {isExpanded && faixaRecords.map((r, fi) => {
                  const gain = calcGainPotential(r);
                  const recos = getRecommendations(r);
                  const main = recos[0];
                  return (
                    <tr key={`${r.equipamento}-${r.faixa}-${fi}`} className="bg-blue-50/60 dark:bg-blue-950/20 border-l-2 border-l-primary/40 cursor-pointer hover:bg-blue-100/60 dark:hover:bg-blue-900/20" onClick={() => onDetail(r)}>
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
                      <td><span className={`badge ${idBadge(r.c_ID)}`}>{fmt(r.c_ID)}</span></td>
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
