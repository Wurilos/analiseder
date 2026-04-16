import React, { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { EQUIP_CATALOG } from '@/lib/equip-catalog';
import KPICard from '@/components/KPICard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, ReferenceLine, CartesianGrid } from 'recharts';
import { BarChart3, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';

function fmt(v: number | null, d = 3) {
  if (v === null || v === undefined || isNaN(v as number)) return '—';
  return Number(v).toFixed(d);
}
function deltaStr(d: number) {
  if (Math.abs(d) < 0.001) return '=';
  return (d > 0 ? '+' : '') + d.toFixed(3);
}

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

const ComparativoPage: React.FC = () => {
  const { periods } = useData();
  const allKeys = Object.keys(periods).sort();
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>(allKeys.slice(0, 2));
  const [selectedEquips, setSelectedEquips] = useState<string[]>([]);
  const [equipSearch, setEquipSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');

  const togglePeriod = (k: string) => {
    setSelectedPeriods(prev => prev.includes(k) ? prev.filter(p => p !== k) : [...prev, k]);
  };

  // === Aba Comparativo — dados da tabela multi-período ===
  const comparison = useMemo(() => {
    if (selectedPeriods.length < 2) return null;
    const sorted = [...selectedPeriods].sort();

    const equipSet = new Set<string>();
    const maps: Record<string, Record<string, any[]>> = {};
    sorted.forEach(p => {
      maps[p] = {};
      (periods[p] || []).forEach(r => {
        equipSet.add(r.equipamento);
        if (!maps[p][r.equipamento]) maps[p][r.equipamento] = [];
        maps[p][r.equipamento].push(r);
      });
    });

    const avg = (recs: any[]) => {
      const vals = recs.map(r => r.c_ID).filter((v: any) => v !== null && !isNaN(v));
      return vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null;
    };

    const rows = [...equipSet].map(equip => {
      const info = EQUIP_CATALOG[equip];
      const first = sorted.find(p => maps[p][equip]?.length);
      const sample = first ? maps[first][equip][0] : null;
      const ids: Record<string, number | null> = {};
      sorted.forEach(p => { ids[p] = maps[p][equip] ? avg(maps[p][equip]) : null; });
      const firstVal = ids[sorted[0]];
      const lastVal = ids[sorted[sorted.length - 1]];
      const delta = (firstVal !== null && lastVal !== null) ? lastVal - firstVal : null;
      return {
        equip,
        serie: info?.serie ?? null,
        tipo: sample?.tipo ?? '',
        rodovia: sample?.rodovia ?? '',
        ids,
        delta,
      };
    }).sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0));

    // KPIs por período
    const avgPerPeriod: Record<string, number> = {};
    sorted.forEach(p => {
      const recs = periods[p].filter(r => r.c_ID !== null);
      avgPerPeriod[p] = recs.length ? recs.reduce((s, r) => s + (r.c_ID ?? 0), 0) / recs.length : 0;
    });

    const firstP = sorted[0];
    const lastP = sorted[sorted.length - 1];
    const deltaAvg = avgPerPeriod[lastP] - avgPerPeriod[firstP];
    const improved = rows.filter(r => r.delta !== null && r.delta > 0.001).length;
    const regressed = rows.filter(r => r.delta !== null && r.delta < -0.001).length;

    return { rows, sorted, avgPerPeriod, deltaAvg, improved, regressed, firstP, lastP };
  }, [periods, selectedPeriods]);

  // === Aba Evolução — equipamentos disponíveis ===
  const allEquips = useMemo(() => {
    const set = new Set<string>();
    Object.values(periods).forEach(recs => recs.forEach(r => set.add(r.equipamento)));
    return [...set].sort();
  }, [periods]);

  const filteredEquipOptions = useMemo(() => {
    let list = allEquips;
    if (tipoFilter) {
      const tipoMap: Record<string, string> = {};
      Object.values(periods).forEach(recs => recs.forEach(r => { tipoMap[r.equipamento] = r.tipo; }));
      list = list.filter(e => tipoMap[e] === tipoFilter);
    }
    if (equipSearch) {
      const q = equipSearch.toLowerCase();
      list = list.filter(e => {
        const info = EQUIP_CATALOG[e];
        return e.toLowerCase().includes(q) || (info?.serie?.toString() ?? '').includes(q);
      });
    }
    return list;
  }, [allEquips, tipoFilter, equipSearch, periods]);

  const toggleEquip = (e: string) => {
    setSelectedEquips(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);
  };

  // === Dados do gráfico de evolução ===
  const chartData = useMemo(() => {
    if (!selectedEquips.length || selectedPeriods.length < 2) return [];
    const sorted = [...selectedPeriods].sort();
    return sorted.map(p => {
      const point: Record<string, any> = { periodo: p };
      selectedEquips.forEach(eq => {
        const recs = (periods[p] || []).filter(r => r.equipamento === eq);
        const vals = recs.map(r => r.c_ID).filter((v): v is number => v !== null && !isNaN(v));
        point[eq] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      });
      return point;
    });
  }, [periods, selectedPeriods, selectedEquips]);

  const chartConfig = useMemo(() => {
    const cfg: Record<string, { label: string; color: string }> = {};
    selectedEquips.forEach((eq, i) => {
      const info = EQUIP_CATALOG[eq];
      cfg[eq] = { label: info ? `Série ${info.serie}` : eq, color: COLORS[i % COLORS.length] };
    });
    return cfg;
  }, [selectedEquips]);

  // Resumo evolução
  const evolutionSummary = useMemo(() => {
    if (!chartData.length || !selectedEquips.length) return [];
    return selectedEquips.map(eq => {
      const vals = chartData.map(d => d[eq]).filter((v): v is number => v !== null);
      const min = vals.length ? Math.min(...vals) : null;
      const max = vals.length ? Math.max(...vals) : null;
      const media = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      const trend = vals.length >= 2 ? vals[vals.length - 1] - vals[0] : null;
      const info = EQUIP_CATALOG[eq];
      return { equip: eq, serie: info?.serie ?? null, min, max, media, trend };
    });
  }, [chartData, selectedEquips]);

  if (allKeys.length < 2) {
    return (
      <div className="empty-state">
        <div className="text-5xl mb-4">📊</div>
        <h3 className="text-lg font-semibold mb-1">Importe pelo menos 2 períodos</h3>
        <p>Faça upload de planilhas de meses diferentes para habilitar a comparação.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Comparativo entre Períodos</div>
          <div className="page-subtitle">Evolução, regressões e melhorias ao longo do tempo</div>
        </div>
      </div>

      {/* Seleção de períodos */}
      <div className="card mb-4">
        <div className="card-header"><h3>Períodos</h3></div>
        <div className="p-4 flex flex-wrap gap-4">
          {allKeys.map(k => (
            <label key={k} className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox checked={selectedPeriods.includes(k)} onCheckedChange={() => togglePeriod(k)} />
              <span>{k}</span>
            </label>
          ))}
        </div>
      </div>

      <Tabs defaultValue="comparativo">
        <TabsList>
          <TabsTrigger value="comparativo">Tabela Comparativa</TabsTrigger>
          <TabsTrigger value="evolucao">Evolução</TabsTrigger>
        </TabsList>

        {/* ──── ABA COMPARATIVO ──── */}
        <TabsContent value="comparativo">
          {comparison ? (
            <>
              <div className="kpis">
                <KPICard label={`ID Médio — ${comparison.firstP}`} value={fmt(comparison.avgPerPeriod[comparison.firstP])} icon={<BarChart3 size={22} />} iconColor="blue" />
                <KPICard label={`ID Médio — ${comparison.lastP}`} value={fmt(comparison.avgPerPeriod[comparison.lastP])} icon={<BarChart3 size={22} />} iconColor="indigo" />
                <KPICard label="Variação Média" value={deltaStr(comparison.deltaAvg)} icon={<ArrowUpDown size={22} />} iconColor={comparison.deltaAvg > 0 ? 'green' : 'red'} severity={comparison.deltaAvg > 0 ? 'good' : comparison.deltaAvg < 0 ? 'danger' : ''} />
                <KPICard label="Melhoraram" value={String(comparison.improved)} icon={<TrendingUp size={22} />} iconColor="green" severity="good" />
                <KPICard label="Regrediram" value={String(comparison.regressed)} icon={<TrendingDown size={22} />} iconColor="red" severity={comparison.regressed > 0 ? 'danger' : 'good'} />
              </div>

              <div className="card">
                <div className="card-header"><h3>Comparativo por Equipamento</h3></div>
                <div className="table-wrap overflow-x-auto">
                  <table>
                    <thead><tr>
                      <th>Série</th><th>Equipamento</th><th>Tipo</th><th>Rodovia</th>
                      {comparison.sorted.map(p => <th key={p}>ID {p}</th>)}
                      <th>Δ Total</th><th>Status</th>
                    </tr></thead>
                    <tbody>
                      {comparison.rows.map(r => (
                        <tr key={r.equip}>
                          <td className="font-mono text-primary font-bold">{r.serie ?? '—'}</td>
                          <td className="text-muted-foreground text-[11px]">{r.equip}</td>
                          <td><span className={`tag tag-${r.tipo.toLowerCase()}`}>{r.tipo}</span></td>
                          <td className="text-muted-foreground text-[11px]">{r.rodovia}</td>
                          {comparison.sorted.map(p => (
                            <td key={p} className="font-mono">{r.ids[p] !== null ? fmt(r.ids[p]) : '—'}</td>
                          ))}
                          <td className={`font-mono font-bold ${r.delta !== null && r.delta > 0.001 ? 'delta-pos' : r.delta !== null && r.delta < -0.001 ? 'delta-neg' : 'delta-zero'}`}>
                            {r.delta !== null ? deltaStr(r.delta) : '—'}
                          </td>
                          <td>
                            {r.delta !== null ? (
                              <span className={`badge ${r.delta > 0.001 ? 'badge-green' : r.delta < -0.001 ? 'badge-red' : 'badge-slate'}`}>
                                {r.delta > 0.001 ? '↑ Melhoria' : r.delta < -0.001 ? '↓ Regressão' : '= Estável'}
                              </span>
                            ) : <span className="badge badge-slate">Novo</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>Selecione pelo menos 2 períodos para comparar.</p>
            </div>
          )}
        </TabsContent>

        {/* ──── ABA EVOLUÇÃO ──── */}
        <TabsContent value="evolucao">
          <div className="card mb-4">
            <div className="card-header"><h3>Filtros</h3></div>
            <div className="p-4 space-y-3">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Buscar Equipamento</label>
                  <input
                    className="w-full border rounded px-3 py-1.5 text-sm bg-background text-foreground border-border"
                    placeholder="Série ou código..."
                    value={equipSearch}
                    onChange={e => setEquipSearch(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo</label>
                  <select className="border rounded px-3 py-1.5 text-sm bg-background text-foreground border-border" value={tipoFilter} onChange={e => setTipoFilter(e.target.value)}>
                    <option value="">Todos</option>
                    <option>Fixo</option>
                    <option>Estático</option>
                    <option>Móvel</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 max-h-[160px] overflow-y-auto">
                {filteredEquipOptions.map(eq => {
                  const info = EQUIP_CATALOG[eq];
                  return (
                    <label key={eq} className="flex items-center gap-1.5 cursor-pointer text-xs">
                      <Checkbox checked={selectedEquips.includes(eq)} onCheckedChange={() => toggleEquip(eq)} />
                      <span className="font-mono">{info ? `${info.serie}` : eq}</span>
                      <span className="text-muted-foreground">({eq})</span>
                    </label>
                  );
                })}
              </div>
              {selectedEquips.length > 0 && (
                <button className="text-xs text-primary underline" onClick={() => setSelectedEquips([])}>Limpar seleção</button>
              )}
            </div>
          </div>

          {selectedEquips.length > 0 && selectedPeriods.length >= 2 && chartData.length > 0 ? (
            <>
              <div className="card mb-4">
                <div className="card-header"><h3>Evolução do ID</h3></div>
                <div className="p-4">
                  <ChartContainer config={chartConfig} className="h-[400px] w-full">
                    <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis dataKey="periodo" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis domain={[0, 1.1]} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <ReferenceLine y={1} stroke="hsl(var(--primary))" strokeDasharray="6 3" label={{ value: 'ID = 1.0', position: 'right', fontSize: 10 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      {selectedEquips.map((eq, i) => (
                        <Line
                          key={eq}
                          type="monotone"
                          dataKey={eq}
                          name={chartConfig[eq]?.label || eq}
                          stroke={COLORS[i % COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ChartContainer>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><h3>Resumo por Equipamento</h3></div>
                <div className="table-wrap overflow-x-auto">
                  <table>
                    <thead><tr>
                      <th>Série</th><th>Equipamento</th><th>Mínimo</th><th>Máximo</th><th>Média</th><th>Tendência</th>
                    </tr></thead>
                    <tbody>
                      {evolutionSummary.map(r => (
                        <tr key={r.equip}>
                          <td className="font-mono text-primary font-bold">{r.serie ?? '—'}</td>
                          <td className="text-muted-foreground text-[11px]">{r.equip}</td>
                          <td className="font-mono">{fmt(r.min)}</td>
                          <td className="font-mono">{fmt(r.max)}</td>
                          <td className="font-mono">{fmt(r.media)}</td>
                          <td className={`font-mono font-bold ${r.trend !== null && r.trend > 0.001 ? 'delta-pos' : r.trend !== null && r.trend < -0.001 ? 'delta-neg' : 'delta-zero'}`}>
                            {r.trend !== null ? deltaStr(r.trend) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>{selectedEquips.length === 0 ? 'Selecione equipamentos acima para visualizar a evolução.' : 'Selecione pelo menos 2 períodos.'}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ComparativoPage;
