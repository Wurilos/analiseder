import React, { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { groupByEquipamento } from '@/lib/grouping';
import { EQUIP_CATALOG, equipLabel, getValorEquip } from '@/lib/equip-catalog';
import { calcID, calcIEF } from '@/lib/calc-engine';
import { IDRecord, EquipGroup } from '@/types';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function fmt(v: number | null, d = 3) {
  if (v === null || v === undefined || isNaN(v as number)) return '—';
  return Number(v).toFixed(d);
}
function moeda(v: number | null) {
  if (v === null || v === undefined || isNaN(v as number)) return '—';
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function pct(v: number) { return (v * 100).toFixed(1) + '%'; }
function idBadge(v: number | null) { if (v === null) return 'badge-slate'; return v < 0.6 ? 'badge-red' : v < 0.85 ? 'badge-amber' : 'badge-green'; }

function calcFinanceiro(r: IDRecord, allRecs: IDRecord[]) {
  const faixasDoEquip = allRecs.filter(x => x.equipamento === r.equipamento).length || 1;
  const valorEquip = getValorEquip(r.equipamento, r.tipo);
  const valorBase = valorEquip / faixasDoEquip;
  const id = r.c_ID ?? 0;
  const idf = r.c_IDF ?? 0, ief = r.c_IEF ?? 0, icv = r.c_ICV ?? 0;
  const valorRecebido = valorBase * id;
  const descontoTotal = valorBase * (1 - id);
  const id_idf1 = calcID(r.tipo, 1.0, ief, icv) ?? 0;
  const id_ief1 = calcID(r.tipo, idf, 1.0, icv) ?? 0;
  const id_icv1 = calcID(r.tipo, idf, ief, 1.0) ?? 0;
  const perdaIDF = valorBase * Math.max(0, id_idf1 - id);
  const perdaIEF = valorBase * Math.max(0, id_ief1 - id);
  const perdaICV = valorBase * Math.max(0, id_icv1 - id);

  const levers = [
    { nome: 'IDF', perda: perdaIDF }, { nome: 'IEF', perda: perdaIEF }, { nome: 'ICV', perda: perdaICV },
  ].sort((a, b) => b.perda - a.perda);

  return { valorBase, valorRecebido, descontoTotal, perdaIDF, perdaIEF, perdaICV, melhorAlavanca: levers[0], levers };
}

const ValoresPage: React.FC = () => {
  const { getActiveRecords } = useData();
  const records = getActiveRecords();
  const [viewMode, setViewMode] = useState<'faixa' | 'equip'>('equip');
  const [fRodovia, setFRodovia] = useState('');
  const [fTipo, setFTipo] = useState('');
  const [detailEquip, setDetailEquip] = useState<string | null>(null);
  const [detailFaixa, setDetailFaixa] = useState<{ equip: string; faixa: string } | null>(null);

  const rodovias = useMemo(() => [...new Set(records.map(r => r.rodovia))].sort(), [records]);
  const tipos = useMemo(() => [...new Set(records.map(r => r.tipo))].sort(), [records]);

  const filtered = useMemo(() => records.filter(r =>
    (!fRodovia || r.rodovia === fRodovia) && (!fTipo || r.tipo === fTipo)
  ), [records, fRodovia, fTipo]);

  const groups = useMemo(() => groupByEquipamento(filtered), [filtered]);

  const totals = useMemo(() => {
    const valorTotal = groups.reduce((s, g) => s + g.valorTotal, 0);
    const valorRecebido = groups.reduce((s, g) => s + g.valorRecebidoTotal, 0);
    const desconto = valorTotal - valorRecebido;
    const perdaIDF = groups.reduce((s, g) => s + g.perdaIDF, 0);
    const perdaIEF = groups.reduce((s, g) => s + g.perdaIEF, 0);
    const perdaICV = groups.reduce((s, g) => s + g.perdaICV, 0);
    return { valorTotal, valorRecebido, desconto, perdaIDF, perdaIEF, perdaICV };
  }, [groups]);

  const chartData = useMemo(() =>
    [...groups].sort((a, b) => b.descontoTotal - a.descontoTotal).slice(0, 20).map(g => ({
      name: equipLabel(g.equipamento),
      recebido: +g.valorRecebidoTotal.toFixed(2),
      desconto: +g.descontoTotal.toFixed(2),
    }))
  , [groups]);

  if (!records.length) {
    return <div className="empty-state"><h3>Sem dados</h3><p>Importe uma planilha primeiro.</p></div>;
  }

  return (
    <div>
      <div className="page-header flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <div className="page-title">Análise Financeira</div>
          <div className="page-subtitle">Descontos por equipamento e impacto financeiro de cada subíndice</div>
        </div>
        <div className="filters flex gap-2 items-center">
          <div className="toggle-group">
            <button className={`toggle-btn ${viewMode === 'faixa' ? 'active' : ''}`} onClick={() => setViewMode('faixa')}>Por Faixa</button>
            <button className={`toggle-btn ${viewMode === 'equip' ? 'active' : ''}`} onClick={() => setViewMode('equip')}>Por Equipamento</button>
          </div>
          <select className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs" value={fRodovia} onChange={e => setFRodovia(e.target.value)}>
            <option value="">Todas rodovias</option>
            {rodovias.map(r => <option key={r}>{r}</option>)}
          </select>
          <select className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs" value={fTipo} onChange={e => setFTipo(e.target.value)}>
            <option value="">Todos tipos</option>
            {tipos.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpis grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3.5 mb-6">
        <div className="kpi"><div className="kpi-label">Valor Contratual Total</div><div className="kpi-val text-[20px]">{moeda(totals.valorTotal)}</div><div className="kpi-sub">{groups.length} equipamentos</div></div>
        <div className="kpi good"><div className="kpi-label">Valor Recebido</div><div className="kpi-val text-[20px]">{moeda(totals.valorRecebido)}</div><div className="kpi-sub">{totals.valorTotal > 0 ? pct(totals.valorRecebido / totals.valorTotal) : '—'}</div></div>
        <div className={`kpi ${totals.desconto > 0 ? 'danger' : 'good'}`}>
          <div className="kpi-label">Desconto Total</div>
          <div className="kpi-val text-[20px]">{moeda(totals.desconto)}</div>
          <div className="kpi-sub">{totals.valorTotal > 0 ? pct(totals.desconto / totals.valorTotal) : '—'}</div>
        </div>
      </div>

      {/* Losses by index */}
      <div className="card mb-4">
        <div className="card-header"><h3>💸 Perdas por Subíndice (consolidado)</h3></div>
        <div className="card-body">
          <div className="space-y-2">
            {[
              { nome: 'IDF', perda: totals.perdaIDF, color: '#3b82f6' },
              { nome: 'IEF', perda: totals.perdaIEF, color: '#f59e0b' },
              { nome: 'ICV', perda: totals.perdaICV, color: '#8b5cf6' },
            ].map(l => (
              <div key={l.nome} className="flex items-center gap-3">
                <div className="w-12 text-xs font-mono font-bold" style={{ color: l.color }}>{l.nome}</div>
                <div className="flex-1"><div className="idx-bar" style={{ height: 8 }}>
                  <div className="idx-bar-fill" style={{ width: `${totals.desconto > 0 ? Math.min(100, Math.round(l.perda / totals.desconto * 100)) : 0}%`, background: l.color }} />
                </div></div>
                <div className="font-mono text-xs font-bold min-w-[100px] text-right" style={{ color: l.color }}>{moeda(l.perda)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card mb-4">
        <div className="card-header"><h3>Desconto por Equipamento (Top 20)</h3></div>
        <div className="card-body" style={{ height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10, fill: '#7a8ba8' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#7a8ba8' }} width={90} />
              <Tooltip contentStyle={{ background: '#151b25', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, fontSize: 12, color: '#e8edf5' }} />
              <Bar dataKey="recebido" stackId="a" fill="#10b981cc" name="Recebido" />
              <Bar dataKey="desconto" stackId="a" fill="#ef4444aa" name="Desconto" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header"><h3>📋 Detalhamento {viewMode === 'equip' ? 'por Equipamento' : 'por Faixa'}</h3></div>
        <div className="table-wrap overflow-x-auto">
          {viewMode === 'equip' ? (
            <table className="w-full text-xs">
              <thead><tr>
                <th className="p-2 text-left">Série</th><th className="p-2">Equip</th><th className="p-2">Tipo</th><th className="p-2">Rodovia</th><th className="p-2">Faixas</th>
                <th className="p-2">ID</th><th className="p-2">Valor Equip</th><th className="p-2">Recebido</th><th className="p-2">Desconto</th><th className="p-2">Melhor Alavanca</th><th className="p-2">Ação</th>
              </tr></thead>
              <tbody>
                {[...groups].sort((a, b) => b.descontoTotal - a.descontoTotal).map(g => {
                  const descPct = g.valorTotal > 0 ? g.descontoTotal / g.valorTotal : 0;
                  const descColor = descPct > 0.2 ? 'var(--red)' : descPct > 0.05 ? 'var(--amber)' : 'var(--green)';
                  return (
                    <tr key={g.equipamento} className="cursor-pointer" onClick={() => setDetailEquip(g.equipamento)}>
                      <td className="p-2 font-mono text-primary font-bold">{g.serie ?? '—'}</td>
                      <td className="p-2 text-muted-foreground text-[11px]">{g.equipamento}</td>
                      <td className="p-2"><span className={`tag tag-${g.tipo.toLowerCase()}`}>{g.tipo}</span></td>
                      <td className="p-2 text-muted-foreground text-[11px]">{g.rodovia}</td>
                      <td className="p-2 font-mono">{g.numFaixas}</td>
                      <td className="p-2"><span className={`badge ${idBadge(g.c_ID)}`}>{fmt(g.c_ID)}</span></td>
                      <td className="p-2 font-mono text-muted-foreground">{moeda(g.valorTotal)}</td>
                      <td className="p-2 font-mono text-emerald-400">{moeda(g.valorRecebidoTotal)}</td>
                      <td className="p-2 font-mono font-bold" style={{ color: descColor }}>{moeda(g.descontoTotal)}</td>
                      <td className="p-2 text-[11px]">
                        {g.melhorAlavanca.perda > 0.5 ? (
                          <span className="font-mono text-emerald-400">{g.melhorAlavanca.nome} +{moeda(g.melhorAlavanca.perda)}</span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="p-2"><button className="btn btn-sm" onClick={e => { e.stopPropagation(); setDetailEquip(g.equipamento); }}>Ver</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-xs">
              <thead><tr>
                <th className="p-2 text-left">Série</th><th className="p-2">Equip</th><th className="p-2">Tipo</th><th className="p-2">Faixa</th>
                <th className="p-2">ID</th><th className="p-2">Valor Faixa</th><th className="p-2">Recebido</th><th className="p-2">Desconto</th><th className="p-2">Alavanca</th>
              </tr></thead>
              <tbody>
                {[...filtered].sort((a, b) => {
                  const fa = calcFinanceiro(a, records); const fb = calcFinanceiro(b, records);
                  return fb.descontoTotal - fa.descontoTotal;
                }).map((r, i) => {
                  const f = calcFinanceiro(r, records);
                  const descPct = f.valorBase > 0 ? f.descontoTotal / f.valorBase : 0;
                  const descColor = descPct > 0.2 ? 'var(--red)' : descPct > 0.05 ? 'var(--amber)' : 'var(--green)';
                  return (
                    <tr key={`${r.equipamento}-${r.faixa}-${i}`}>
                      <td className="p-2 font-mono text-primary font-bold">{r.serie ?? '—'}</td>
                      <td className="p-2 text-muted-foreground text-[11px]">{r.equipamento}</td>
                      <td className="p-2"><span className={`tag tag-${r.tipo.toLowerCase()}`}>{r.tipo}</span></td>
                      <td className="p-2 font-mono">{r.faixa}</td>
                      <td className="p-2"><span className={`badge ${idBadge(r.c_ID)}`}>{fmt(r.c_ID)}</span></td>
                      <td className="p-2 font-mono text-muted-foreground">{moeda(f.valorBase)}</td>
                      <td className="p-2 font-mono text-emerald-400">{moeda(f.valorRecebido)}</td>
                      <td className="p-2 font-mono font-bold" style={{ color: descColor }}>{moeda(f.descontoTotal)}</td>
                      <td className="p-2 text-[11px] font-mono text-emerald-400">
                        {f.melhorAlavanca.perda > 0.5 ? `${f.melhorAlavanca.nome} +${moeda(f.melhorAlavanca.perda)}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Equipment Detail Modal */}
      <Dialog open={!!detailEquip} onOpenChange={() => setDetailEquip(null)}>
        <DialogContent className="max-w-[860px] max-h-[90vh] overflow-y-auto bg-card border-border">
          {detailEquip && <EquipDetailModal equip={detailEquip} records={records} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

function EquipDetailModal({ equip, records }: { equip: string; records: IDRecord[] }) {
  const faixas = records.filter(r => r.equipamento === equip);
  const cat = EQUIP_CATALOG[equip];
  const n = faixas.length;
  const valorTotal = cat ? cat.valor : getValorEquip(equip, faixas[0]?.tipo) * n;
  const valorFaixa = valorTotal / n;
  const avgID = faixas.reduce((s, r) => s + (r.c_ID ?? 0), 0) / n;
  const valorRec = faixas.reduce((s, r) => s + valorFaixa * (r.c_ID ?? 0), 0);
  const desconto = valorTotal - valorRec;
  const groups = groupByEquipamento(faixas);
  const g = groups[0];

  return (
    <div>
      <h2 className="font-display text-base font-extrabold mb-1">{cat ? `Nº ${cat.serie} — ` : ''}{equip} — Visão Consolidada</h2>
      <p className="text-xs text-muted-foreground mb-4">{faixas[0]?.tipo} · {cat?.endereco || faixas[0]?.rodovia} · {n} faixas · {cat?.lote || ''}</p>

      <div className="grid grid-cols-4 gap-2.5 mb-4">
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <div className="text-[10px] text-muted-foreground uppercase">Valor Equipamento</div>
          <div className="font-mono text-lg font-bold text-muted-foreground">{moeda(valorTotal)}</div>
          <div className="text-[10px] text-muted-foreground/50">{n} faixas × {moeda(valorFaixa)}</div>
        </div>
        <div className="bg-emerald-500/5 border border-emerald-500/25 rounded-lg p-3 text-center">
          <div className="text-[10px] text-muted-foreground uppercase">Valor Recebido</div>
          <div className="font-mono text-lg font-bold text-emerald-400">{moeda(valorRec)}</div>
          <div className="text-[10px] text-muted-foreground/50">ID médio: {fmt(avgID)}</div>
        </div>
        <div className="bg-destructive/5 border border-destructive/25 rounded-lg p-3 text-center">
          <div className="text-[10px] text-muted-foreground uppercase">Desconto Total</div>
          <div className="font-mono text-lg font-bold text-destructive">{moeda(desconto)}</div>
          <div className="text-[10px] text-muted-foreground/50">{valorTotal > 0 ? pct(desconto / valorTotal) : '—'}</div>
        </div>
        <div className="bg-blue-500/5 border border-blue-500/25 rounded-lg p-3 text-center">
          <div className="text-[10px] text-muted-foreground uppercase">Valor por Faixa</div>
          <div className="font-mono text-lg font-bold text-blue-400">{moeda(valorFaixa)}</div>
        </div>
      </div>

      <div className="text-[13px] font-bold font-display mb-2">📊 Detalhamento por Faixa</div>
      <div className="border border-border rounded-lg overflow-hidden mb-3">
        <table className="w-full text-xs">
          <thead><tr className="bg-card">
            <th className="p-2 text-left">Faixa</th><th className="p-2">IDF</th><th className="p-2">IEF</th><th className="p-2">ICV</th><th className="p-2">ID</th><th className="p-2">Recebido</th><th className="p-2">Desconto</th>
          </tr></thead>
          <tbody>
            {faixas.map(r => {
              const fRec = valorFaixa * (r.c_ID ?? 0);
              const fDesc = valorFaixa - fRec;
              const fDescPct = valorFaixa > 0 ? fDesc / valorFaixa : 0;
              const fc = fDescPct > 0.2 ? 'var(--red)' : fDescPct > 0.05 ? 'var(--amber)' : 'var(--green)';
              return (
                <tr key={r.faixa} className="border-t border-border">
                  <td className="p-2 font-mono font-bold text-primary">{r.faixa}</td>
                  <td className="p-2"><span className={`badge ${idBadge(r.c_IDF)}`}>{fmt(r.c_IDF)}</span></td>
                  <td className="p-2"><span className={`badge ${idBadge(r.c_IEF)}`}>{fmt(r.c_IEF)}</span></td>
                  <td className="p-2"><span className={`badge ${idBadge(r.c_ICV)}`}>{fmt(r.c_ICV)}</span></td>
                  <td className="p-2"><span className={`badge ${idBadge(r.c_ID)}`}>{fmt(r.c_ID)}</span></td>
                  <td className="p-2 font-mono text-emerald-400">{moeda(fRec)}</td>
                  <td className="p-2 font-mono font-bold" style={{ color: fc }}>{moeda(fDesc)}<span className="text-[10px] ml-1 opacity-70">({pct(fDescPct)})</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {g && g.levers.filter(l => l.perda > 1).length > 0 && (
        <>
          <div className="text-[13px] font-bold font-display mb-2">🎯 Alavancas de Recuperação</div>
          <div className="space-y-1.5">
            {g.levers.filter(l => l.perda > 0.5).slice(0, 3).map((l, i) => (
              <div key={l.nome} className="flex items-center gap-3 p-2 rounded-lg" style={{
                background: `rgba(${i === 0 ? '239,68,68' : '245,158,11'},.07)`,
                border: `1px solid rgba(${i === 0 ? '239,68,68' : '245,158,11'},.2)`
              }}>
                <div className="font-mono text-[13px] font-bold min-w-[50px]">{i === 0 ? '🥇' : '🔹'} {l.nome}</div>
                <div className="flex-1 text-xs text-muted-foreground">Impacto consolidado em {n} faixas</div>
                <div className="font-mono text-[13px] font-bold text-emerald-400">+{moeda(l.perda)}/mês</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default ValoresPage;
