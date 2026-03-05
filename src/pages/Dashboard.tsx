import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '@/context/DataContext';
import { groupByEquipamento } from '@/lib/grouping';
import { EQUIP_CATALOG, equipLabel, equipLabelFull } from '@/lib/equip-catalog';
import { useTheme } from '@/hooks/use-theme';
import KPICard from '@/components/KPICard';
import { BarChart3, Target, AlertTriangle, TrendingDown, Monitor, Layers } from 'lucide-react';
import * as echarts from 'echarts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EquipGroup } from '@/types';

function fmt(v: number | null, d = 3) {
  if (v === null || v === undefined || isNaN(v as number)) return '—';
  return Number(v).toFixed(d);
}
function idBadge(v: number | null) {
  if (v === null || v === undefined) return 'badge-slate';
  return v < 0.6 ? 'badge-red' : v < 0.85 ? 'badge-amber' : 'badge-green';
}

function indexTooltipText(index: 'IDF' | 'IEF' | 'ICV' | 'ID', g: EquipGroup): string {
  const f = (v: number | null) => v !== null && v !== undefined ? Number(v).toFixed(3) : '—';
  switch (index) {
    case 'IDF':
      return `IDF = NHo / NHt\n≥ 0.95 → 1.000\nMédia das faixas: ${f(g.c_IDF)}`;
    case 'IEF':
      return `IEF = 0.8 × (ICId+ICIn)/2 × (IEVri+IEVdt)/2 + 0.2 × (ILPd+ILPn)/2\nICId=${f(g.c_ICId)}  ICIn=${f(g.c_ICIn)}\nIEVri=${f(g.c_IEVri)}  IEVdt=${f(g.c_IEVdt)}\nILPd=${f(g.c_ILPd)}  ILPn=${f(g.c_ILPn)}\nResultado: ${f(g.c_IEF)}`;
    case 'ICV':
      return `ICV = QVc / QVt\nClassificação por faixas:\n≥ 0.80 → 1.000 | ≥ 0.70 → 0.750\n≥ 0.60 → 0.250 | < 0.60 → 0.000\nMédia: ${f(g.c_ICV)}`;
    case 'ID':
      return `ID = IDF × (0.9 × IEF + 0.1 × ICV)\nIDF=${f(g.c_IDF)}  IEF=${f(g.c_IEF)}  ICV=${f(g.c_ICV)}\nResultado: ${f(g.c_ID)}`;
  }
}

function IndexCell({ index, g, badge }: { index: 'IDF' | 'IEF' | 'ICV' | 'ID'; g: EquipGroup; badge?: boolean }) {
  const val = g[`c_${index}` as keyof EquipGroup] as number | null;
  const tip = indexTooltipText(index, g);
  const content = badge
    ? <span className={`badge ${idBadge(val)}`}>{fmt(val)}</span>
    : <span>{fmt(val)}</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <td className="font-mono cursor-help">{content}</td>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs whitespace-pre-wrap font-mono text-[11px]">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}

function getChartTheme(isDark: boolean) {
  return {
    backgroundColor: 'transparent',
    textStyle: { color: isDark ? '#7a8ba8' : '#6b7280', fontFamily: 'JetBrains Mono,monospace', fontSize: 11 },
  };
}

function getGridColor(isDark: boolean) {
  return isDark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.06)';
}
function getLabelColor(isDark: boolean) {
  return isDark ? '#e8edf5' : '#1f2937';
}

/* ─── Distribution Chart ─── */
const ChartDist: React.FC<{ data: any[]; equipView: boolean; isDark: boolean }> = ({ data, equipView, isDark }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(containerRef.current, undefined, { renderer: 'canvas' });
    }
    const bins = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.01];
    const labels = ['0-0.1', '0.1-0.2', '0.2-0.3', '0.3-0.4', '0.4-0.5', '0.5-0.6', '0.6-0.7', '0.7-0.8', '0.8-0.9', '0.9-1.0'];
    const counts = new Array(10).fill(0);
    data.forEach(r => {
      const id = r.c_ID;
      if (id === null || id === undefined) return;
      for (let i = 0; i < 10; i++) { if (id >= bins[i] && id < bins[i + 1]) { counts[i]++; break; } }
    });
    const unitLabel = equipView ? 'equipamentos' : 'faixas';

    chartRef.current.setOption({
      ...getChartTheme(isDark),
      grid: { top: 10, bottom: 40, left: 36, right: 10 },
      xAxis: { type: 'category', data: labels, axisLabel: { rotate: 30, fontSize: 10 } },
      yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: getGridColor(isDark) } } },
      series: [{
        type: 'bar',
        data: counts.map((v, i) => ({
          value: v,
          itemStyle: { color: i < 6 ? 'rgba(239,68,68,.7)' : i < 8 ? 'rgba(245,158,11,.7)' : 'rgba(16,185,129,.7)' }
        })),
        label: { show: true, position: 'top', fontSize: 10, color: getLabelColor(isDark) },
        barMaxWidth: 36,
      }],
      tooltip: { trigger: 'item', formatter: (p: any) => `${p.name}: <b>${p.value}</b> ${unitLabel}` }
    });
  }, [data, equipView, isDark]);

  useEffect(() => {
    const handleResize = () => chartRef.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

/* ─── Equipment Bar Chart ─── */
const ChartEquipment: React.FC<{ records: any[]; isDark: boolean }> = ({ records, isDark }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(containerRef.current, undefined, { renderer: 'canvas' });
    }
    const byEquip: Record<string, { sum: number; cnt: number }> = {};
    records.forEach(r => {
      const k = r.equipamento;
      if (!byEquip[k]) byEquip[k] = { sum: 0, cnt: 0 };
      if (r.c_ID !== null) { byEquip[k].sum += r.c_ID; byEquip[k].cnt++; }
    });
    const sorted = Object.entries(byEquip)
      .map(([k, v]) => ({ name: k, label: equipLabel(k), labelFull: equipLabelFull(k), avg: v.cnt ? v.sum / v.cnt : 0 }))
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 20);

    chartRef.current.setOption({
      ...getChartTheme(isDark),
      grid: { top: 10, bottom: 40, left: 100, right: 50 },
      xAxis: { type: 'value', max: 1, axisLabel: { formatter: (v: number) => v.toFixed(2) }, splitLine: { lineStyle: { color: getGridColor(isDark) } } },
      yAxis: { type: 'category', data: sorted.map(x => x.label), axisLabel: { fontSize: 9 } },
      series: [{
        type: 'bar',
        data: sorted.map(x => ({
          value: +x.avg.toFixed(4),
          itemStyle: { color: x.avg < 0.6 ? 'rgba(239,68,68,.8)' : x.avg < 0.85 ? 'rgba(245,158,11,.8)' : 'rgba(16,185,129,.8)' }
        })),
        barMaxWidth: 16,
        label: { show: true, position: 'right', fontSize: 10, color: getLabelColor(isDark), formatter: (p: any) => fmt(p.value) }
      }],
      tooltip: { formatter: (p: any) => { const d = sorted[p.dataIndex]; return `<b>${d.labelFull}</b>: ID=${fmt(p.value)}`; } }
    });
  }, [records, isDark]);

  useEffect(() => {
    const handleResize = () => chartRef.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

/* ─── Radar Chart ─── */
const ChartRadar: React.FC<{ records: any[]; isDark: boolean }> = ({ records, isDark }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(containerRef.current, undefined, { renderer: 'canvas' });
    }
    const tipos = [...new Set(records.map((r: any) => r.tipo))] as string[];
    const fields = ['c_IDF', 'c_IEF', 'c_ICV', 'c_ICId', 'c_ICIn', 'c_IEVri', 'c_IEVdt'] as const;
    const labels = ['IDF', 'IEF', 'ICV', 'ICId', 'ICIn', 'IEVri', 'IEVdt'];
    const colors = ['rgba(245,158,11,.8)', 'rgba(59,130,246,.8)', 'rgba(16,185,129,.8)', 'rgba(168,85,247,.8)'];

    const avgField = (recs: any[], f: string) => {
      const vals = recs.map(r => r[f]).filter((v: any) => v !== null && v !== undefined);
      return vals.length ? vals.reduce((s: number, v: number) => s + v, 0) / vals.length : 0;
    };

    const series = tipos.map((t, i) => {
      const tr = records.filter((r: any) => r.tipo === t);
      const vals = fields.map(f => +avgField(tr, f).toFixed(3));
      return {
        name: t, type: 'radar' as const,
        data: [{ value: vals, name: t }],
        lineStyle: { color: colors[i % 4] },
        areaStyle: { color: colors[i % 4].replace('.8', '.15') },
        itemStyle: { color: colors[i % 4] }
      };
    });

    chartRef.current.setOption({
      ...getChartTheme(isDark),
      legend: { data: tipos, bottom: 0, textStyle: { color: isDark ? '#7a8ba8' : '#6b7280', fontSize: 11 } },
      radar: {
        indicator: labels.map(n => ({ name: n, max: 1 })),
        center: ['50%', '45%'], radius: '60%',
        axisLine: { lineStyle: { color: getGridColor(isDark) } },
        splitLine: { lineStyle: { color: getGridColor(isDark) } },
        axisName: { color: isDark ? '#7a8ba8' : '#6b7280', fontSize: 11 },
      },
      series,
      tooltip: { trigger: 'item' }
    });
  }, [records, isDark]);

  useEffect(() => {
    const handleResize = () => chartRef.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

/* ─── Images Stacked Bar Chart ─── */
const ChartImages: React.FC<{ records: any[]; isDark: boolean }> = ({ records, isDark }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(containerRef.current, undefined, { renderer: 'canvas' });
    }
    const byEquip: Record<string, { validas: number; invalidas: number; infracoes: number }> = {};
    records.forEach((r: any) => {
      const k = r.equipamento;
      if (!byEquip[k]) byEquip[k] = { validas: 0, invalidas: 0, infracoes: 0 };
      byEquip[k].validas += (r.validas || 0);
      byEquip[k].invalidas += (r.invalidas || 0);
      byEquip[k].infracoes += (r.infracoes || 0);
    });
    const sorted = Object.entries(byEquip)
      .map(([k, v]) => ({ name: k, label: equipLabel(k), labelFull: equipLabelFull(k), ...v, total: v.validas + v.invalidas }))
      .filter(x => x.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 16);

    if (!sorted.length) {
      chartRef.current.setOption({ ...getChartTheme(isDark), title: { text: 'Sem dados de imagens', left: 'center', top: 'center', textStyle: { color: isDark ? '#7a8ba8' : '#9ca3af', fontSize: 13 } } });
      return;
    }

    chartRef.current.setOption({
      ...getChartTheme(isDark),
      grid: { top: 14, bottom: 44, left: 108, right: 16 },
      xAxis: { type: 'value', axisLabel: { formatter: (v: number) => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : String(v), fontSize: 10 }, splitLine: { lineStyle: { color: getGridColor(isDark) } } },
      yAxis: { type: 'category', data: sorted.map(x => x.label).reverse(), axisLabel: { fontSize: 9, width: 100, overflow: 'truncate' } },
      legend: { data: ['Válidas', 'Inválidas'], bottom: 4, textStyle: { color: isDark ? '#7a8ba8' : '#6b7280', fontSize: 11 }, itemWidth: 12, itemHeight: 8 },
      series: [
        {
          name: 'Válidas', type: 'bar', stack: 'imgs',
          data: sorted.map(x => x.validas).reverse(),
          itemStyle: { color: 'rgba(16,185,129,.75)' },
        },
        {
          name: 'Inválidas', type: 'bar', stack: 'imgs',
          data: sorted.map(x => x.invalidas).reverse(),
          itemStyle: { color: 'rgba(239,68,68,.65)', borderRadius: [0, 3, 3, 0] },
          label: {
            show: true, position: 'right', fontSize: 9, color: isDark ? '#7a8ba8' : '#6b7280',
            formatter: (p: any) => {
              const d = sorted[sorted.length - 1 - p.dataIndex];
              const tot = d.validas + d.invalidas;
              if (!tot) return '';
              return tot >= 1000 ? (tot / 1000).toFixed(1) + 'k' : String(tot);
            }
          },
        },
      ],
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const idx = params[0].dataIndex;
          const d = sorted[sorted.length - 1 - idx];
          const tot = d.validas + d.invalidas;
          const pctV = tot ? ((d.validas / tot) * 100).toFixed(1) : '0';
          return `<b>${d.labelFull}</b><br>✅ Válidas: <b>${d.validas.toLocaleString('pt-BR')}</b><br>❌ Inválidas: <b>${d.invalidas.toLocaleString('pt-BR')}</b><br>📦 Infrações: <b>${d.infracoes.toLocaleString('pt-BR')}</b><br>Taxa válidas: <b>${pctV}%</b>`;
        }
      }
    });
  }, [records, isDark]);

  useEffect(() => {
    const handleResize = () => chartRef.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD PAGE
   ═══════════════════════════════════════════════════════════════ */
const DashboardPage: React.FC = () => {
  const { getActiveRecords, activePeriod } = useData();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const records = getActiveRecords();
  const [dashView, setDashView] = useState<'faixa' | 'equip'>('faixa');
  const [fRodovia, setFRodovia] = useState('');
  const [fTipo, setFTipo] = useState('');
  const [fMunicipio, setFMunicipio] = useState('');
  const [fEquip, setFEquip] = useState('');

  const rodovias = useMemo(() => [...new Set(records.map(r => r.rodovia))].sort(), [records]);
  const tipos = useMemo(() => [...new Set(records.map(r => r.tipo))].sort(), [records]);
  const municipios = useMemo(() => [...new Set(records.map(r => r.municipio))].sort(), [records]);
  const equips = useMemo(() => [...new Set(records.map(r => r.equipamento))].sort((a, b) => (EQUIP_CATALOG[a]?.serie ?? 9999) - (EQUIP_CATALOG[b]?.serie ?? 9999)), [records]);

  const filtered = useMemo(() => records.filter(r =>
    (!fRodovia || r.rodovia === fRodovia) &&
    (!fTipo || r.tipo === fTipo) &&
    (!fMunicipio || r.municipio === fMunicipio) &&
    (!fEquip || r.equipamento === fEquip)
  ), [records, fRodovia, fTipo, fMunicipio, fEquip]);

  const groups = useMemo(() => groupByEquipamento(filtered), [filtered]);
  const withID = useMemo(() => filtered.filter(r => r.c_ID !== null), [filtered]);
  const ids = useMemo(() => withID.map(r => r.c_ID!).sort((a, b) => a - b), [withID]);
  const avg = ids.length ? ids.reduce((s, v) => s + v, 0) / ids.length : 0;
  const med = ids.length ? ids[Math.floor(ids.length / 2)] : 0;
  const groupsWithID = useMemo(() => groups.filter(g => g.c_ID !== null), [groups]);
  const below6 = useMemo(() => dashView === 'equip'
    ? groupsWithID.filter(g => g.c_ID! < 0.6).length
    : withID.filter(r => r.c_ID! < 0.6).length
  , [dashView, groupsWithID, withID]);
  const below85 = useMemo(() => dashView === 'equip'
    ? groupsWithID.filter(g => g.c_ID! < 0.85).length
    : withID.filter(r => r.c_ID! < 0.85).length
  , [dashView, groupsWithID, withID]);

  const chartData = useMemo(() =>
    dashView === 'equip' ? groups.filter(g => g.c_ID !== null) : withID
  , [dashView, groups, withID]);

  const worst10 = useMemo(() => [...groups].filter(g => g.c_ID !== null).sort((a, b) => (a.c_ID ?? 0) - (b.c_ID ?? 0)).slice(0, 10), [groups]);
  const best10 = useMemo(() => [...groups].filter(g => g.c_ID !== null).sort((a, b) => (b.c_ID ?? 0) - (a.c_ID ?? 0)).slice(0, 10), [groups]);

  if (!records.length) {
    return (
      <div className="empty-state">
        <div className="text-5xl mb-4">📊</div>
        <h3 className="text-lg font-semibold mb-1">Sem dados</h3>
        <p>Importe uma planilha primeiro na tela de Upload.</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Visão geral do sistema · Período: {activePeriod || '—'}</div>
        </div>
        <div className="filters">
          <div className="toggle-group">
            <button className={`toggle-btn ${dashView === 'faixa' ? 'active' : ''}`} onClick={() => setDashView('faixa')}>Por Faixa</button>
            <button className={`toggle-btn ${dashView === 'equip' ? 'active' : ''}`} onClick={() => setDashView('equip')}>Por Equipamento</button>
          </div>
          <select value={fRodovia} onChange={e => setFRodovia(e.target.value)}>
            <option value="">Todas rodovias</option>
            {rodovias.map(r => <option key={r}>{r}</option>)}
          </select>
          <select value={fTipo} onChange={e => setFTipo(e.target.value)}>
            <option value="">Todos tipos</option>
            {tipos.map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={fMunicipio} onChange={e => setFMunicipio(e.target.value)}>
            <option value="">Todos municípios</option>
            {municipios.map(m => <option key={m}>{m}</option>)}
          </select>
          <select value={fEquip} onChange={e => setFEquip(e.target.value)}>
            <option value="">Todos equipamentos</option>
            {equips.map(e => <option key={e} value={e}>{equipLabel(e)}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpis">
        <KPICard
          label="Total Equipamentos"
          value={String(groups.length)}
          icon={<Monitor size={22} />}
          iconColor="blue"
        />
        <KPICard
          label="Total Faixas"
          value={String(filtered.length)}
          icon={<Layers size={22} />}
          iconColor="purple"
        />
        <KPICard
          label="ID Médio"
          value={(avg * 100).toFixed(1) + '%'}
          sub={dashView === 'equip' ? groups.length + ' equipamentos' : withID.length + ' faixas'}
          icon={<BarChart3 size={22} />}
          iconColor={avg < 0.6 ? 'red' : avg < 0.85 ? 'amber' : 'green'}
          severity={avg < 0.6 ? 'danger' : avg < 0.85 ? 'warn' : 'good'}
        />
        <KPICard
          label="Mediana"
          value={(med * 100).toFixed(1) + '%'}
          icon={<Target size={22} />}
          iconColor="blue"
        />
        <KPICard
          label="ID < 0.60"
          value={String(below6)}
          sub={dashView === 'equip' ? 'equipamentos críticos' : 'faixas críticas'}
          icon={<AlertTriangle size={22} />}
          iconColor="red"
          severity={below6 > 0 ? 'danger' : 'good'}
        />
        <KPICard
          label="ID < 0.85"
          value={String(below85)}
          sub={dashView === 'equip' ? 'equipamentos abaixo' : 'faixas abaixo'}
          icon={<TrendingDown size={22} />}
          iconColor="amber"
          severity={below85 > 0 ? 'warn' : 'good'}
        />
      </div>

      {/* ECharts Grid */}
      <div className="charts-grid">
        <div className="chart-box">
          <div className="chart-title">Distribuição do Índice de Desempenho (ID)</div>
          <div className="chart-area">
            <ChartDist data={chartData} equipView={dashView === 'equip'} isDark={isDark} />
          </div>
        </div>
        <div className="chart-box">
          <div className="chart-title">ID por Equipamento (Top 20)</div>
          <div className="chart-area">
            <ChartEquipment records={filtered} isDark={isDark} />
          </div>
        </div>
        <div className="chart-box">
          <div className="chart-title">Subíndices — Média por Tipo</div>
          <div className="chart-area">
            <ChartRadar records={filtered} isDark={isDark} />
          </div>
        </div>
        <div className="chart-box">
          <div className="chart-title">Imagens por Equipamento — Válidas vs Inválidas</div>
          <div className="chart-area">
            <ChartImages records={filtered} isDark={isDark} />
          </div>
        </div>
      </div>

      {/* Top 10 Worst */}
      <div className="card mb-4">
        <div className="card-header"><h3>🔴 Top 10 Piores Equipamentos</h3></div>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Série</th><th>Equipamento</th><th>Tipo</th><th>Rodovia</th>
              <th>Km</th><th>Faixa</th>
              <th>Faixas</th><th>IDF</th><th>IEF</th><th>ICV</th><th>ID</th>
            </tr></thead>
            <tbody>{worst10.map(g => (
              <tr key={g.equipamento} className={g.c_ID !== null && g.c_ID < 0.6 ? 'id-critical' : g.c_ID !== null && g.c_ID < 0.85 ? 'id-low' : 'id-ok'}>
                <td className="font-mono font-bold text-primary">{g.serie ?? '—'}</td>
                <td className="text-muted-foreground text-[11px]">{g.equipamento}</td>
                <td><span className={`tag tag-${g.tipo.toLowerCase()}`}>{g.tipo}</span></td>
                <td className="text-muted-foreground text-[11px]">{g.rodovia}</td>
                <td className="font-mono text-[11px]">{g.km ?? '—'}</td>
                <td className="text-[11px]">{g.faixas.join(', ')}</td>
                <td className="font-mono">{g.numFaixas}</td>
                <IndexCell index="IDF" g={g} />
                <IndexCell index="IEF" g={g} />
                <IndexCell index="ICV" g={g} />
                <IndexCell index="ID" g={g} badge />
              </tr>
            ))}</tbody>
          </table>
    </TooltipProvider>
      </div>

      {/* Top 10 Best */}
      <div className="card">
        <div className="card-header"><h3>🟢 Top 10 Melhores Equipamentos</h3></div>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Série</th><th>Equipamento</th><th>Tipo</th><th>Rodovia</th>
              <th>Km</th><th>Faixa</th>
              <th>Faixas</th><th>IDF</th><th>IEF</th><th>ICV</th><th>ID</th>
            </tr></thead>
            <tbody>{best10.map(g => (
              <tr key={g.equipamento} className="id-ok">
                <td className="font-mono font-bold text-primary">{g.serie ?? '—'}</td>
                <td className="text-muted-foreground text-[11px]">{g.equipamento}</td>
                <td><span className={`tag tag-${g.tipo.toLowerCase()}`}>{g.tipo}</span></td>
                <td className="text-muted-foreground text-[11px]">{g.rodovia}</td>
                <td className="font-mono text-[11px]">{g.km ?? '—'}</td>
                <td className="text-[11px]">{g.faixas.join(', ')}</td>
                <td className="font-mono">{g.numFaixas}</td>
                <IndexCell index="IDF" g={g} />
                <IndexCell index="IEF" g={g} />
                <IndexCell index="ICV" g={g} />
                <IndexCell index="ID" g={g} badge />
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default DashboardPage;
