import React, { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { groupByEquipamento } from '@/lib/grouping';
import { EQUIP_CATALOG, equipLabel, equipLabelFull } from '@/lib/equip-catalog';
import { calcGainPotential, getRecommendations } from '@/lib/calc-engine';
import { IDRecord } from '@/types';
import { Dialog, DialogContent } from '@/components/ui/dialog';

function fmt(v: number | null, d = 3) {
  if (v === null || v === undefined || isNaN(v as number)) return '—';
  return Number(v).toFixed(d);
}
function pct(v: number | null) {
  if (v === null || v === undefined || isNaN(v as number)) return '—';
  return (Number(v) * 100).toFixed(1) + '%';
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

const RankingPage: React.FC = () => {
  const { getActiveRecords } = useData();
  const records = getActiveRecords();
  const [search, setSearch] = useState('');
  const [fTipo, setFTipo] = useState('');
  const [fRodovia, setFRodovia] = useState('');
  const [sortBy, setSortBy] = useState('id_asc');
  const [idxFilter, setIdxFilter] = useState('');
  const [detail, setDetail] = useState<IDRecord | null>(null);

  const tipos = useMemo(() => [...new Set(records.map(r => r.tipo))].sort(), [records]);
  const rodovias = useMemo(() => [...new Set(records.map(r => r.rodovia))].sort(), [records]);

  const sorted = useMemo(() => {
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

    const SORT_FIELDS: Record<string, string> = {
      id_asc: 'c_ID', id_desc: 'c_ID', idf_asc: 'c_IDF', idf_desc: 'c_IDF',
      ief_asc: 'c_IEF', ief_desc: 'c_IEF', icv_asc: 'c_ICV', icv_desc: 'c_ICV',
      icid_asc: 'c_ICId', icin_asc: 'c_ICIn', ievri_asc: 'c_IEVri', ievdt_asc: 'c_IEVdt',
      ilpd_asc: 'c_ILPd', ilpn_asc: 'c_ILPn',
    };

    return [...recs].sort((a, b) => {
      if (sortBy === 'gain_desc') {
        return (calcGainPotential(a).total_gap) - (calcGainPotential(b).total_gap);
      }
      const fld = SORT_FIELDS[sortBy] || 'c_ID';
      const av = (a as any)[fld] ?? -1, bv = (b as any)[fld] ?? -1;
      return sortBy.endsWith('desc') ? bv - av : av - bv;
    });
  }, [records, search, fTipo, fRodovia, sortBy, idxFilter]);

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
            <optgroup label="Análise"><option value="gain_desc">Maior Ganho Potencial</option></optgroup>
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
          <h3>{sorted.length} Equipamentos/Faixas</h3>
          <div className="flex gap-2">
            <span className="badge badge-red">ID &lt; 0.60</span>
            <span className="badge badge-amber">0.60–0.85</span>
            <span className="badge badge-green">≥ 0.85</span>
          </div>
        </div>
        <div className="table-wrap overflow-x-auto">
          <table>
            <thead><tr>
              <th>#</th><th>Série</th><th>Equip</th><th>Tipo</th><th>Faixa</th><th>Rodovia</th><th>Km</th>
              <th>IDF</th><th>IEF</th><th>ICV</th>
              <th>ICId</th><th>ICIn</th><th>IEVri</th><th>IEVdt</th><th>ILPd</th><th>ILPn</th>
              <th>ID</th><th>Causa Principal</th><th>Ganho</th><th>Ação</th>
            </tr></thead>
            <tbody>
              {sorted.map((r, i) => {
                const gain = calcGainPotential(r);
                const recos = getRecommendations(r);
                const cl = r.c_ID! < 0.6 ? 'id-critical' : r.c_ID! < 0.85 ? 'id-low' : 'id-ok';
                const main = recos[0];
                return (
                  <tr key={`${r.equipamento}-${r.faixa}-${i}`} className={`${cl} cursor-pointer`} onClick={() => setDetail(r)}>
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
                    <td className="text-[11px] max-w-[180px] truncate" style={{ color: main?.priority === 'high' ? '#dc2626' : main?.priority === 'medium' ? '#d97706' : undefined }}>
                      {main ? main.title.split(' — ')[0] : '✓ Bom'}
                    </td>
                    <td className="font-mono text-green-600 dark:text-emerald-400">+{fmt(gain.total_gap)}</td>
                    <td><button className="btn btn-sm" onClick={e => { e.stopPropagation(); setDetail(r); }}>Ver</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-[860px] max-h-[90vh] overflow-y-auto">
          {detail && <DetailModal r={detail} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

function DetailModal({ r }: { r: IDRecord }) {
  const gain = calcGainPotential(r);
  const recos = getRecommendations(r);
  const cat = EQUIP_CATALOG[r.equipamento];
  const idColor = (r.c_ID ?? 0) < 0.6 ? 'text-red-600 dark:text-destructive' : (r.c_ID ?? 0) < 0.85 ? 'text-amber-600 dark:text-primary' : 'text-green-600 dark:text-emerald-400';
  const idfColor = r.c_IDF !== null && r.c_IDF < 0.95 ? 'text-amber-600 dark:text-primary' : 'text-green-600 dark:text-emerald-400';

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-bold">{cat ? `Nº ${cat.serie} — ` : ''}{r.equipamento} · Faixa {r.faixa}</h2>
        <p className="text-xs text-muted-foreground mt-1">{r.tipo} · {r.rodovia} km {r.km} · {r.municipio}{cat ? ` · ${cat.lote}` : ''} · Período: {r.periodo}</p>
      </div>

      {/* Tree decomposition */}
      <div className="tree-node">
        <div className="flex items-center gap-3">
          <div className={`font-mono text-xl font-bold ${idColor}`}>{fmt(r.c_ID)}</div>
          <div>
            <div className="text-sm font-bold">ID — Índice de Desempenho</div>
            <div className="text-[11px] text-muted-foreground">{r.tipo} → IDF × (0.9×IEF + 0.1×ICV){r.f_ID !== null ? ` · planilha: ${fmt(r.f_ID)}` : ''}</div>
          </div>
        </div>
        <div className="tree-children">
          <div className="tree-child">
            <div className="flex items-center gap-3">
              <div className={`font-mono font-bold ${idfColor}`}>{fmt(r.c_IDF)}</div>
              <div>
                <div className="text-xs font-bold">IDF — Disponibilidade</div>
                <div className="text-[11px] text-muted-foreground">NHo/NHt = {r.NHo}/{r.NHt} = {r.NHt ? fmt(((r.NHo ?? 0) / r.NHt)) : '—'} {r.c_IDF !== null && r.c_IDF >= 0.95 ? '→ arred. 1.00' : ''}</div>
              </div>
              <div className="ml-auto text-[11px] text-green-600 dark:text-emerald-400 font-mono">+{fmt(gain.idf_gain)} se IDF=1</div>
            </div>
          </div>
          <div className="tree-child">
            <div className="flex items-center gap-3">
              <div className="font-mono font-bold">{fmt(r.c_IEF)}</div>
              <div>
                <div className="text-xs font-bold">IEF — Eficiência</div>
                <div className="text-[11px] text-muted-foreground">0.8×(ICId+ICIn)/2×(IEVri+IEVdt)/2 + 0.2×(ILPd+ILPn)/2</div>
              </div>
              <div className="ml-auto text-[11px] text-green-600 dark:text-emerald-400 font-mono">+{fmt(gain.ief_gain)} se IEF=1</div>
            </div>
            <div className="mt-2 space-y-1">
              <LeafRow name="ICId" label="Captura Diurna" calc={r.c_ICId} file={r.f_ICId} formula={`(${r.IVd}+${r.INd})/${r.TId} = ${fmt(r.ICId_raw, 3)}`} />
              <LeafRow name="ICIn" label="Captura Noturna" calc={r.c_ICIn} file={r.f_ICIn} formula={`(${r.IVn}+${r.INn})/${r.TIn} = ${fmt(r.ICIn_raw, 3)}`} />
              <LeafRow name="IEVri" label="Envio Imagens" calc={r.c_IEVri} file={r.f_IEVri} formula={`[${r.rfri1},${r.rfri2},${r.rfri3},${r.rfri4},${r.rfri5}] / ${r.pktsInf}`} />
              <LeafRow name="IEVdt" label="Envio Tráfego" calc={r.c_IEVdt} file={r.f_IEVdt} formula={`[${r.rfdt1},${r.rfdt2},${r.rfdt3},${r.rfdt4},${r.rfdt5},${r.rfdt6}] / ${r.pktsTraf}`} />
              <LeafRow name="ILPd" label="Leitura Placas Diurna" calc={r.c_ILPd} file={r.f_ILPd} formula={`${r.LPd}/${r.IVd_ocr} = ${fmt(r.ILPd_raw, 3)}`} />
              <LeafRow name="ILPn" label="Leitura Placas Noturna" calc={r.c_ILPn} file={r.f_ILPn} formula={`${r.LPn}/${r.IVn_ocr} = ${fmt(r.ILPn_raw, 3)}`} />
            </div>
          </div>
          <div className="tree-child">
            <div className="flex items-center gap-3">
              <div className="font-mono font-bold">{fmt(r.c_ICV)}</div>
              <div>
                <div className="text-xs font-bold">ICV — Classificação de Veículos</div>
                <div className="text-[11px] text-muted-foreground">QVc/QVt = {r.QVc}/{r.QVt}</div>
              </div>
              <div className="ml-auto text-[11px] text-green-600 dark:text-emerald-400 font-mono">+{fmt(gain.icv_gain)} se ICV=1</div>
            </div>
          </div>
        </div>
      </div>

      {/* Gain potential */}
      <div className="mt-4 border border-border rounded-lg p-4">
        <div className="text-xs font-bold text-primary mb-2">💡 Potencial de Melhoria</div>
        <div className="grid grid-cols-3 gap-2">
          <GainCard label="IDF=1.0" gain={gain.idf_gain} desc="Disponibilidade 100%" />
          <GainCard label="IEF=1.0" gain={gain.ief_gain} desc="Eficiência 100%" />
          <GainCard label="Todos=1.0" gain={gain.total_gap} desc="ID máximo possível" />
        </div>
      </div>

      {/* Recommendations */}
      <div className="mt-4">
        <div className="text-sm font-bold mb-2">🎯 Recomendações</div>
        <div className="space-y-2">
          {recos.length ? recos.map((re, i) => (
            <div key={i} className={`border rounded-lg p-3 ${re.priority === 'high' ? 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/5' : re.priority === 'medium' ? 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/5' : 'border-blue-200 bg-blue-50 dark:border-blue-500/25 dark:bg-blue-500/5'}`}>
              <div className="flex items-start gap-2">
                <span>{re.priority === 'high' ? '🔴' : re.priority === 'medium' ? '🟡' : '🔵'}</span>
                <div>
                  <div className="text-xs font-bold">{re.title}</div>
                  <div className="text-[11px] text-muted-foreground">{re.desc}</div>
                  {re.gain && <div className="text-[11px] text-green-600 dark:text-emerald-400 font-mono mt-1">Potencial: {re.gain}</div>}
                </div>
              </div>
            </div>
          )) : (
            <div className="border border-green-200 bg-green-50 dark:border-green-500/25 dark:bg-green-500/5 rounded-lg p-3 flex items-center gap-2">
              <span>✅</span><span className="text-xs font-bold">Equipamento com bom desempenho</span>
            </div>
          )}
        </div>
      </div>

      {/* Raw data */}
      <div className="mt-4">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Dados Brutos</div>
        <div className="grid grid-cols-3 gap-1.5 text-[11.5px]">
          <RawRow label="Pacotes Inf." value={r.pktsInf} />
          <RawRow label="Infrações" value={r.infracoes} />
          <RawRow label="Válidas" value={r.validas} />
          <RawRow label="Contagem Veíc." value={r.contagemVeic} />
          <RawRow label="NHt" value={r.NHt} />
          <RawRow label="NHo" value={r.NHo} />
          <RawRow label="Período" value={r.periodo} />
          <RawRow label="Dias" value={r.dias} />
        </div>
      </div>
    </div>
  );
}

function LeafRow({ name, label, calc, file, formula }: { name: string; label: string; calc: number | null; file: number | null; formula: string }) {
  const cv = calc ?? 0;
  const color = cv < 0.5 ? 'text-red-600 dark:text-destructive' : cv < 0.8 ? 'text-amber-600 dark:text-primary' : 'text-green-600 dark:text-emerald-400';
  const diff = (file !== null && calc !== null) ? Math.abs(cv - file) : null;
  const match = diff !== null ? diff < 0.001 : null;
  return (
    <div className="tree-leaf">
      <span className="font-mono font-bold text-xs w-10">{name}</span>
      <span className={`font-mono font-bold ${color}`}>{fmt(calc)}</span>
      {file !== null && (
        <>
          <span className="text-muted-foreground text-[10px]">plan:{fmt(file)}</span>
          <span className={`text-[10px] ${match ? 'text-green-600 dark:text-emerald-400' : 'text-red-600 dark:text-destructive'}`}>{match ? '✓' : `Δ${fmt(diff, 3)}`}</span>
        </>
      )}
      <span className="text-[10px] text-muted-foreground ml-auto font-mono">{formula}</span>
    </div>
  );
}

function GainCard({ label, gain, desc }: { label: string; gain: number; desc: string }) {
  return (
    <div className="bg-green-50 dark:bg-emerald-500/5 border border-green-200 dark:border-emerald-500/25 rounded-lg p-3 text-center">
      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
      <div className="font-mono text-lg font-bold text-green-600 dark:text-emerald-400">+{fmt(gain)}</div>
      <div className="text-[10px] text-muted-foreground">{desc}</div>
    </div>
  );
}

function RawRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex gap-2 items-center">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-mono">{value ?? '—'}</span>
    </div>
  );
}

export default RankingPage;
