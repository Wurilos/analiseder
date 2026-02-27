import React, { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { groupByEquipamento } from '@/lib/grouping';
import { EQUIP_CATALOG, equipLabel, getValorEquip } from '@/lib/equip-catalog';
import { calcID, calcIEF } from '@/lib/calc-engine';
import { IDRecord, EquipGroup } from '@/types';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useTheme } from '@/hooks/use-theme';
import KPICard from '@/components/KPICard';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import * as echarts from 'echarts';
import { useRef, useEffect } from 'react';

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

/* ─── EChart for desconto por equipamento ─── */
const ChartDesconto: React.FC<{ data: { name: string; recebido: number; desconto: number }[]; isDark: boolean }> = ({ data, isDark }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(containerRef.current, undefined, { renderer: 'canvas' });
    }
    chartRef.current.setOption({
      backgroundColor: 'transparent',
      textStyle: { color: isDark ? '#7a8ba8' : '#6b7280', fontFamily: 'JetBrains Mono,monospace', fontSize: 11 },
      grid: { top: 14, bottom: 40, left: 100, right: 16 },
      xAxis: { type: 'value', axisLabel: { formatter: (v: number) => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : String(v), fontSize: 10 }, splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.06)' } } },
      yAxis: { type: 'category', data: data.map(d => d.name).reverse(), axisLabel: { fontSize: 9 } },
      legend: { data: ['Recebido', 'Desconto'], bottom: 4, textStyle: { color: isDark ? '#7a8ba8' : '#6b7280', fontSize: 11 }, itemWidth: 12, itemHeight: 8 },
      series: [
        { name: 'Recebido', type: 'bar', stack: 'val', data: data.map(d => d.recebido).reverse(), itemStyle: { color: 'rgba(16,185,129,.75)' } },
        { name: 'Desconto', type: 'bar', stack: 'val', data: data.map(d => d.desconto).reverse(), itemStyle: { color: 'rgba(239,68,68,.65)', borderRadius: [0, 3, 3, 0] } },
      ],
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }
    });
  }, [data, isDark]);

  useEffect(() => {
    const handleResize = () => chartRef.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chartRef.current?.dispose(); chartRef.current = null; };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

const ValoresPage: React.FC = () => {
  const { getActiveRecords } = useData();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const records = getActiveRecords();
  const [viewMode, setViewMode] = useState<'faixa' | 'equip'>('equip');
  const [fRodovia, setFRodovia] = useState('');
  const [fTipo, setFTipo] = useState('');
  const [detailEquip, setDetailEquip] = useState<string | null>(null);

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
    return <div className="empty-state"><div className="text-5xl mb-4">💰</div><h3 className="text-lg font-semibold mb-1">Sem dados</h3><p>Importe uma planilha primeiro.</p></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Análise Financeira</div>
          <div className="page-subtitle">Descontos por equipamento e impacto financeiro de cada subíndice</div>
        </div>
        <div className="filters">
          <div className="toggle-group">
            <button className={`toggle-btn ${viewMode === 'faixa' ? 'active' : ''}`} onClick={() => setViewMode('faixa')}>Por Faixa</button>
            <button className={`toggle-btn ${viewMode === 'equip' ? 'active' : ''}`} onClick={() => setViewMode('equip')}>Por Equipamento</button>
          </div>
          <select value={fRodovia} onChange={e => setFRodovia(e.target.value)}>
            <option value="">Todas rodovias</option>
            {rodovias.map(r => <option key={r}>{r}</option>)}
          </select>
          <select value={fTipo} onChange={e => setFTipo(e.target.value)}>
            <option value="">Todos tipos</option>
            {tipos.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="kpis">
        <KPICard label="Valor Contratual Total" value={moeda(totals.valorTotal)} sub={`${groups.length} equipamentos`} icon={<DollarSign size={22} />} iconColor="blue" />
        <KPICard label="Valor Recebido" value={moeda(totals.valorRecebido)} sub={totals.valorTotal > 0 ? pct(totals.valorRecebido / totals.valorTotal) : '—'} icon={<TrendingUp size={22} />} iconColor="green" severity="good" />
        <KPICard label="Desconto Total" value={moeda(totals.desconto)} sub={totals.valorTotal > 0 ? pct(totals.desconto / totals.valorTotal) : '—'} icon={<TrendingDown size={22} />} iconColor="red" severity={totals.desconto > 0 ? 'danger' : 'good'} />
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
          <ChartDesconto data={chartData} isDark={isDark} />
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header"><h3>📋 Detalhamento {viewMode === 'equip' ? 'por Equipamento' : 'por Faixa'}</h3></div>
        <div className="table-wrap overflow-x-auto">
          {viewMode === 'equip' ? (
            <table>
              <thead><tr>
                <th>Série</th><th>Equip</th><th>Tipo</th><th>Rodovia</th><th>Faixas</th>
                <th>ID</th><th>Valor Equip</th><th>Recebido</th><th>Desconto</th><th>Melhor Alavanca</th><th>Ação</th>
              </tr></thead>
              <tbody>
                {[...groups].sort((a, b) => b.descontoTotal - a.descontoTotal).map(g => {
                  const descPct = g.valorTotal > 0 ? g.descontoTotal / g.valorTotal : 0;
                  const descColor = descPct > 0.2 ? '#dc2626' : descPct > 0.05 ? '#d97706' : '#059669';
                  return (
                    <tr key={g.equipamento} className="cursor-pointer" onClick={() => setDetailEquip(g.equipamento)}>
                      <td className="font-mono text-primary font-bold">{g.serie ?? '—'}</td>
                      <td className="text-muted-foreground text-[11px]">{g.equipamento}</td>
                      <td><span className={`tag tag-${g.tipo.toLowerCase()}`}>{g.tipo}</span></td>
                      <td className="text-muted-foreground text-[11px]">{g.rodovia}</td>
                      <td className="font-mono">{g.numFaixas}</td>
                      <td><span className={`badge ${idBadge(g.c_ID)}`}>{fmt(g.c_ID)}</span></td>
                      <td className="font-mono text-muted-foreground">{moeda(g.valorTotal)}</td>
                      <td className="font-mono text-green-600">{moeda(g.valorRecebidoTotal)}</td>
                      <td className="font-mono font-bold" style={{ color: descColor }}>{moeda(g.descontoTotal)}</td>
                      <td className="text-[11px]">
                        {g.melhorAlavanca.perda > 0.5 ? (
                          <span className="font-mono text-green-600">{g.melhorAlavanca.nome} +{moeda(g.melhorAlavanca.perda)}</span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td><button className="btn btn-sm" onClick={e => { e.stopPropagation(); setDetailEquip(g.equipamento); }}>Ver</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table>
              <thead><tr>
                <th>Série</th><th>Equip</th><th>Tipo</th><th>Faixa</th>
                <th>ID</th><th>Valor Faixa</th><th>Recebido</th><th>Desconto</th><th>Alavanca</th>
              </tr></thead>
              <tbody>
                {[...filtered].sort((a, b) => {
                  const fa = calcFinanceiro(a, records); const fb = calcFinanceiro(b, records);
                  return fb.descontoTotal - fa.descontoTotal;
                }).map((r, i) => {
                  const f = calcFinanceiro(r, records);
                  const descPct = f.valorBase > 0 ? f.descontoTotal / f.valorBase : 0;
                  const descColor = descPct > 0.2 ? '#dc2626' : descPct > 0.05 ? '#d97706' : '#059669';
                  return (
                    <tr key={`${r.equipamento}-${r.faixa}-${i}`}>
                      <td className="font-mono text-primary font-bold">{r.serie ?? '—'}</td>
                      <td className="text-muted-foreground text-[11px]">{r.equipamento}</td>
                      <td><span className={`tag tag-${r.tipo.toLowerCase()}`}>{r.tipo}</span></td>
                      <td className="font-mono">{r.faixa}</td>
                      <td><span className={`badge ${idBadge(r.c_ID)}`}>{fmt(r.c_ID)}</span></td>
                      <td className="font-mono text-muted-foreground">{moeda(f.valorBase)}</td>
                      <td className="font-mono text-green-600">{moeda(f.valorRecebido)}</td>
                      <td className="font-mono font-bold" style={{ color: descColor }}>{moeda(f.descontoTotal)}</td>
                      <td className="text-[11px] font-mono text-green-600">
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
        <DialogContent className="max-w-[860px] max-h-[90vh] overflow-y-auto">
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
      <h2 className="text-base font-bold mb-1">{cat ? `Nº ${cat.serie} — ` : ''}{equip} — Visão Consolidada</h2>
      <p className="text-xs text-muted-foreground mb-4">{faixas[0]?.tipo} · {cat?.endereco || faixas[0]?.rodovia} · {n} faixas · {cat?.lote || ''}</p>

      <div className="grid grid-cols-4 gap-2.5 mb-4">
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <div className="text-[10px] text-muted-foreground uppercase">Valor Equipamento</div>
          <div className="font-mono text-lg font-bold">{moeda(valorTotal)}</div>
          <div className="text-[10px] text-muted-foreground">{n} faixas × {moeda(valorFaixa)}</div>
        </div>
        <div className="bg-green-50 dark:bg-emerald-500/5 border border-green-200 dark:border-emerald-500/25 rounded-lg p-3 text-center">
          <div className="text-[10px] text-muted-foreground uppercase">Valor Recebido</div>
          <div className="font-mono text-lg font-bold text-green-600 dark:text-emerald-400">{moeda(valorRec)}</div>
          <div className="text-[10px] text-muted-foreground">ID médio: {fmt(avgID)}</div>
        </div>
        <div className="bg-red-50 dark:bg-destructive/5 border border-red-200 dark:border-destructive/25 rounded-lg p-3 text-center">
          <div className="text-[10px] text-muted-foreground uppercase">Desconto Total</div>
          <div className="font-mono text-lg font-bold text-red-600 dark:text-destructive">{moeda(desconto)}</div>
          <div className="text-[10px] text-muted-foreground">{valorTotal > 0 ? pct(desconto / valorTotal) : '—'}</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/25 rounded-lg p-3 text-center">
          <div className="text-[10px] text-muted-foreground uppercase">Valor por Faixa</div>
          <div className="font-mono text-lg font-bold text-blue-600 dark:text-blue-400">{moeda(valorFaixa)}</div>
        </div>
      </div>

      <div className="text-sm font-bold mb-2">📊 Detalhamento por Faixa</div>
      <div className="border border-border rounded-lg overflow-hidden mb-3">
        <table>
          <thead><tr>
            <th>Faixa</th><th>IDF</th><th>IEF</th><th>ICV</th><th>ID</th><th>Recebido</th><th>Desconto</th>
          </tr></thead>
          <tbody>
            {faixas.map(r => {
              const fRec = valorFaixa * (r.c_ID ?? 0);
              const fDesc = valorFaixa - fRec;
              const fDescPct = valorFaixa > 0 ? fDesc / valorFaixa : 0;
              const fc = fDescPct > 0.2 ? '#dc2626' : fDescPct > 0.05 ? '#d97706' : '#059669';
              return (
                <tr key={r.faixa} className="border-t border-border">
                  <td className="font-mono font-bold text-primary">{r.faixa}</td>
                  <td><span className={`badge ${idBadge(r.c_IDF)}`}>{fmt(r.c_IDF)}</span></td>
                  <td><span className={`badge ${idBadge(r.c_IEF)}`}>{fmt(r.c_IEF)}</span></td>
                  <td><span className={`badge ${idBadge(r.c_ICV)}`}>{fmt(r.c_ICV)}</span></td>
                  <td><span className={`badge ${idBadge(r.c_ID)}`}>{fmt(r.c_ID)}</span></td>
                  <td className="font-mono text-green-600">{moeda(fRec)}</td>
                  <td className="font-mono font-bold" style={{ color: fc }}>{moeda(fDesc)}<span className="text-[10px] ml-1 opacity-70">({pct(fDescPct)})</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {g && g.levers.filter(l => l.perda > 1).length > 0 && (
        <>
          <div className="text-sm font-bold mb-2">🎯 Alavancas de Recuperação</div>
          <div className="space-y-1.5">
            {g.levers.filter(l => l.perda > 0.5).slice(0, 3).map((l, i) => (
              <div key={l.nome} className="flex items-center gap-3 p-2 rounded-lg border border-border">
                <div className="font-mono font-bold text-sm w-10" style={{ color: ['#3b82f6', '#f59e0b', '#8b5cf6'][i] }}>{l.nome}</div>
                <div className="flex-1"><div className="idx-bar" style={{ height: 6 }}>
                  <div className="idx-bar-fill" style={{ width: `${g.descontoTotal > 0 ? Math.min(100, Math.round(l.perda / g.descontoTotal * 100)) : 0}%`, background: ['#3b82f6', '#f59e0b', '#8b5cf6'][i] }} />
                </div></div>
                <div className="font-mono text-sm font-bold text-green-600">+{moeda(l.perda)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default ValoresPage;
