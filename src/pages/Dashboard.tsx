import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '@/context/DataContext';
import { groupByEquipamento } from '@/lib/grouping';
import { EQUIP_CATALOG, equipLabel, equipLabelFull, getFabricanteByCodigo } from '@/lib/equip-catalog';
import { useTheme } from '@/hooks/use-theme';
import KPICard from '@/components/KPICard';
import { BarChart3, Target, AlertTriangle, TrendingDown, Monitor, Layers, Activity, ShieldCheck, Tags, DollarSign, Camera, Moon, Sun, Send, FileText, ScanLine, FileBarChart2, Plus, Minus, Sigma, Calculator, GitCompare, CheckCircle2, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import LoteAnaliseModal from '@/components/LoteAnaliseModal';
import * as echarts from 'echarts';
import { EquipGroup } from '@/types';
import { calcID, calcIEF } from '@/lib/calc-engine';

function fmt(v: number | null, d = 3) {
  if (v === null || v === undefined || isNaN(v as number)) return '—';
  return Number(v).toFixed(d);
}
function getDisplayID<T extends { f_ID?: number | null; c_ID?: number | null }>(item: T) {
  return item.f_ID ?? item.c_ID ?? null;
}
function idBadge(v: number | null) {
  if (v === null || v === undefined) return 'badge-slate';
  return v < 0.6 ? 'badge-red' : v < 0.85 ? 'badge-amber' : 'badge-green';
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
      const id = getDisplayID(r);
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
      const id = getDisplayID(r);
      if (id !== null) { byEquip[k].sum += id; byEquip[k].cnt++; }
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
  const [fFabricante, setFFabricante] = useState<'' | 'Splice' | 'Focalle'>('');
  const [showLoteModal, setShowLoteModal] = useState(false);

  // Regra oficial: padrão Splice; Focalle só em equipamentos DR-05/DR-10
  // marcados na planilha (obs = OBS_FOCALLE_LOTES_05_10). Fonte canônica
  // é sempre o EQUIP_CATALOG (lookup pelo código), não o lote do registro.
  const fabricanteOf = (equip: string): 'Splice' | 'Focalle' => getFabricanteByCodigo(equip);

  const rodovias = useMemo(() => [...new Set(records.map(r => r.rodovia))].sort(), [records]);
  const tipos = useMemo(() => [...new Set(records.map(r => r.tipo))].sort(), [records]);
  const municipios = useMemo(() => [...new Set(records.map(r => r.municipio))].sort(), [records]);
  const equips = useMemo(() => [...new Set(records.map(r => r.equipamento))].sort((a, b) => (EQUIP_CATALOG[a]?.serie ?? 9999) - (EQUIP_CATALOG[b]?.serie ?? 9999)), [records]);

  const filtered = useMemo(() => records.filter(r =>
    (!fRodovia || r.rodovia === fRodovia) &&
    (!fTipo || r.tipo === fTipo) &&
    (!fMunicipio || r.municipio === fMunicipio) &&
    (!fEquip || r.equipamento === fEquip) &&
    (!fFabricante || fabricanteOf(r.equipamento) === fFabricante)
  ), [records, fRodovia, fTipo, fMunicipio, fEquip, fFabricante]);

  // Base afetada apenas pelo filtro de Fabricante (independente dos demais filtros)
  const recordsByFab = useMemo(
    () => records.filter(r => !fFabricante || fabricanteOf(r.equipamento) === fFabricante),
    [records, fFabricante]
  );
  const totalFaixas = recordsByFab.length;
  const totalEquipamentos = useMemo(() => groupByEquipamento(recordsByFab).length, [recordsByFab]);
  const filteredFaixas = filtered.length;
  const groups = useMemo(() => groupByEquipamento(filtered), [filtered]);
  const filteredEquipamentos = groups.length;
  const withID = useMemo(() => filtered.filter(r => getDisplayID(r) !== null), [filtered]);
  const ids = useMemo(() => withID.map(r => getDisplayID(r)!).sort((a, b) => a - b), [withID]);
  const avg = ids.length ? ids.reduce((s, v) => s + v, 0) / ids.length : 0;
  const med = ids.length ? ids[Math.floor(ids.length / 2)] : 0;
  const allIDs = useMemo(() => recordsByFab.map(r => getDisplayID(r)).filter((id): id is number => id !== null), [recordsByFab]);
  const sumAllIDs = allIDs.reduce((s, v) => s + v, 0);
  const avgAllIDs = allIDs.length ? sumAllIDs / allIDs.length : 0;
  const groupsWithID = useMemo(() => groups.filter(g => g.c_ID !== null), [groups]);
  const below6 = useMemo(() => dashView === 'equip'
    ? groupsWithID.filter(g => g.c_ID! < 0.6).length
    : withID.filter(r => getDisplayID(r)! < 0.6).length
  , [dashView, groupsWithID, withID]);
  const below85 = useMemo(() => dashView === 'equip'
    ? groupsWithID.filter(g => g.c_ID! < 0.85).length
    : withID.filter(r => getDisplayID(r)! < 0.85).length
  , [dashView, groupsWithID, withID]);
  // Contagens auxiliares para sub-rótulos (sempre disponíveis nos dois recortes)
  const equipBelow6 = useMemo(() => groupsWithID.filter(g => g.c_ID! < 0.6).length, [groupsWithID]);
  const equipBetween = useMemo(() => groupsWithID.filter(g => g.c_ID! >= 0.6 && g.c_ID! < 0.85).length, [groupsWithID]);
  const faixasBelow6 = useMemo(() => withID.filter(r => getDisplayID(r)! < 0.6).length, [withID]);
  const faixasBetween = useMemo(() => withID.filter(r => { const v = getDisplayID(r)!; return v >= 0.6 && v < 0.85; }).length, [withID]);

  const chartData = useMemo(() =>
    dashView === 'equip' ? groups.filter(g => g.c_ID !== null) : withID
  , [dashView, groups, withID]);

  const worst10 = useMemo(() => [...groups].filter(g => g.c_ID !== null).sort((a, b) => (a.c_ID ?? 0) - (b.c_ID ?? 0)).slice(0, 10), [groups]);
  const best10 = useMemo(() => [...groups].filter(g => g.c_ID !== null).sort((a, b) => (b.c_ID ?? 0) - (a.c_ID ?? 0)).slice(0, 10), [groups]);

  // Perdas financeiras agregadas (principais + subíndices do IEF)
  const perdas = useMemo(() => {
    const main = { total: 0, IDF: 0, IEF: 0, ICV: 0 };
    const sub = { ICId: 0, ICIn: 0, IEVri: 0, IEVdt: 0, ILPd: 0, ILPn: 0 };

    groups.forEach(g => {
      main.total += g.descontoTotal || 0;
      main.IDF += g.perdaIDF || 0;
      main.IEF += g.perdaIEF || 0;
      main.ICV += g.perdaICV || 0;

      // Para subíndices do IEF: simular cada um = 1.0 mantendo os demais,
      // recalcular IEF -> ID e usar o ganho (cap. ao perdaIEF para não estourar).
      const icid = g.c_ICId, icin = g.c_ICIn, ievri = g.c_IEVri, ievdt = g.c_IEVdt, ilpd = g.c_ILPd, ilpn = g.c_ILPn;
      const idf = g.c_IDF ?? 0, icv = g.c_ICV ?? 0, id = g.c_ID ?? 0;
      if ([icid, icin, ievri, ievdt, ilpd, ilpn].some(v => v === null)) return;

      const simulate = (k: 'ICId' | 'ICIn' | 'IEVri' | 'IEVdt' | 'ILPd' | 'ILPn') => {
        const vals = {
          ICId: icid!, ICIn: icin!, IEVri: ievri!, IEVdt: ievdt!, ILPd: ilpd!, ILPn: ilpn!,
        };
        vals[k] = 1.0;
        const newIEF = calcIEF(vals.ICId, vals.ICIn, vals.IEVri, vals.IEVdt, vals.ILPd, vals.ILPn) ?? 0;
        const newID = calcID(g.tipo, idf, newIEF, icv) ?? 0;
        const ganho = Math.max(0, newID - id);
        return ganho * (g.valorTotal || 0);
      };

      sub.ICId += simulate('ICId');
      sub.ICIn += simulate('ICIn');
      sub.IEVri += simulate('IEVri');
      sub.IEVdt += simulate('IEVdt');
      sub.ILPd += simulate('ILPd');
      sub.ILPn += simulate('ILPn');
    });

    // Normaliza os subíndices proporcionalmente para que a soma bata
    // exatamente com a Perda por IEF do card superior.
    const sumSub = sub.ICId + sub.ICIn + sub.IEVri + sub.IEVdt + sub.ILPd + sub.ILPn;
    if (sumSub > 0 && main.IEF > 0) {
      const k = main.IEF / sumSub;
      sub.ICId *= k;
      sub.ICIn *= k;
      sub.IEVri *= k;
      sub.IEVdt *= k;
      sub.ILPd *= k;
      sub.ILPn *= k;
    }

    return { main, sub };
  }, [groups]);

  const fmtBRL = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
    <div>
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
          <select value={fFabricante} onChange={e => setFFabricante(e.target.value as '' | 'Splice' | 'Focalle')}>
            <option value="">Todos fabricantes</option>
            <option value="Splice">Splice</option>
            <option value="Focalle">Focalle</option>
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpis">
        <KPICard
          label="Total Equipamentos"
          value={String(filteredEquipamentos)}
          sub={filteredEquipamentos === totalEquipamentos ? undefined : `${filteredEquipamentos} de ${totalEquipamentos} equipamentos exibidos`}
          icon={<Monitor size={22} />}
          iconColor="blue"
        />
        <KPICard
          label="Total Faixas"
          value={String(filteredFaixas)}
          sub={filteredFaixas === totalFaixas ? undefined : `${filteredFaixas} de ${totalFaixas} faixas exibidas`}
          icon={<Layers size={22} />}
          iconColor="purple"
        />
        <KPICard
          label="ID Médio"
          value={(avg * 100).toFixed(1) + '%'}
          sub={dashView === 'equip'
            ? `${groupsWithID.length} de ${filteredEquipamentos} equipamentos com ID calculado`
            : `${withID.length} de ${filteredFaixas} faixas com ID calculado`}
          icon={<BarChart3 size={22} />}
          iconColor={avg < 0.6 ? 'red' : avg < 0.85 ? 'amber' : 'green'}
          severity={avg < 0.6 ? 'danger' : avg < 0.85 ? 'warn' : 'good'}
        />
        <KPICard
          label="ID Médio (Todos Importados)"
          value={(avgAllIDs * 100).toFixed(1) + '%'}
          sub={`${allIDs.length} de ${totalFaixas} faixas com ID calculado`}
          icon={<Activity size={22} />}
          iconColor="teal"
          severity={avgAllIDs < 0.6 ? 'danger' : avgAllIDs < 0.85 ? 'warn' : 'good'}
        />
        <KPICard
          label="ID < 0.60"
          value={
            <div className="flex items-stretch gap-2 mt-1">
              <div className="flex flex-col items-center px-2 py-0.5 rounded-md bg-foreground/5 border border-foreground/10">
                <span className="text-[8px] font-bold uppercase tracking-wider text-foreground/70 leading-none">Equip.</span>
                <span className="text-xl font-extrabold leading-none mt-1 text-foreground">{equipBelow6}</span>
              </div>
              <div className="flex flex-col items-center px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/30">
                <span className="text-[8px] font-bold uppercase tracking-wider text-rose-500 leading-none">Faixas</span>
                <span className="text-xl font-extrabold leading-none mt-1 text-rose-500">{faixasBelow6}</span>
              </div>
            </div>
          }
          sub={<span className="block mt-1.5">críticos</span>}
          icon={<AlertTriangle size={22} />}
          iconColor="red"
          severity={below6 > 0 ? 'danger' : 'good'}
        />
        <KPICard
          label="ID ≥ 0.60 e < 0.85"
          value={
            <div className="flex items-stretch gap-2 mt-1">
              <div className="flex flex-col items-center px-2 py-0.5 rounded-md bg-foreground/5 border border-foreground/10">
                <span className="text-[8px] font-bold uppercase tracking-wider text-foreground/70 leading-none">Equip.</span>
                <span className="text-xl font-extrabold leading-none mt-1 text-foreground">{equipBetween}</span>
              </div>
              <div className="flex flex-col items-center px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30">
                <span className="text-[8px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 leading-none">Faixas</span>
                <span className="text-xl font-extrabold leading-none mt-1 text-amber-600 dark:text-amber-400">{faixasBetween}</span>
              </div>
            </div>
          }
          sub={<span className="block mt-1.5">em alerta</span>}
          icon={<TrendingDown size={22} />}
          iconColor="amber"
          severity={(below85 - below6) > 0 ? 'warn' : 'good'}
        />
        <button
          onClick={() => setShowLoteModal(true)}
          className="kpi group cursor-pointer text-left transition-all duration-200 md:col-span-2 md:ml-4 border border-primary/30 ring-1 ring-primary/20 shadow-[0_6px_18px_-6px_hsl(var(--primary)/0.45)] hover:shadow-[0_10px_24px_-6px_hsl(var(--primary)/0.6)] hover:-translate-y-0.5 hover:border-primary/60"
          style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.18) 0%, hsl(var(--primary) / 0.08) 60%, hsl(var(--card)) 100%)' }}
        >
          <div className="flex items-center gap-3 w-full px-1">
            <div className="rounded-lg p-2.5 bg-primary/20 ring-1 ring-primary/30 group-hover:bg-primary/30 transition-colors shrink-0">
              <FileBarChart2 className="w-5 h-5 text-primary" strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary/80">Análise por Lote</div>
              <div className="text-sm font-extrabold text-foreground leading-tight">Resumo do Contrato</div>
              <div className="text-[10px] text-muted-foreground font-medium truncate">Splice · Focalle</div>
            </div>
            <div className="text-primary/70 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          </div>
        </button>
      </div>

      {/* Perdas Financeiras — Principais (com subíndices expansíveis) */}
      <div className="mt-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground/90 uppercase tracking-wide">Perdas Financeiras</h3>
          <span className="text-[11px] text-muted-foreground">{filteredEquipamentos} equipamento(s) · clique no <Plus className="inline w-3 h-3" /> para detalhar</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <PerdaCard
            label="Perda Total"
            value={fmtBRL(perdas.main.total)}
            sub="Desconto contratual no período"
            icon={<DollarSign className="w-5 h-5" />}
            tone="red"
            expandable
            expandedContent={
              <div className="grid grid-cols-3 gap-2">
                <SubMini label="IDF" value={fmtBRL(perdas.main.IDF)} sub="Disponibilidade" icon={<ShieldCheck className="w-3 h-3" />} tone="amber" />
                <SubMini
                  label="IEF" value={fmtBRL(perdas.main.IEF)} sub="Eficiência funcional" icon={<Activity className="w-3 h-3" />} tone="orange"
                  expandedContent={
                    <div className="grid grid-cols-2 gap-1.5">
                      <SubMini label="ICId" value={fmtBRL(perdas.sub.ICId)} sub="Captura diurna" icon={<Sun className="w-3 h-3" />} tone="amber" />
                      <SubMini label="ICIn" value={fmtBRL(perdas.sub.ICIn)} sub="Captura noturna" icon={<Moon className="w-3 h-3" />} tone="indigo" />
                      <SubMini label="IEVri" value={fmtBRL(perdas.sub.IEVri)} sub="Envio de imagens" icon={<Camera className="w-3 h-3" />} tone="orange" />
                      <SubMini label="IEVdt" value={fmtBRL(perdas.sub.IEVdt)} sub="Envio de dados" icon={<Send className="w-3 h-3" />} tone="purple" />
                      <SubMini label="ILPd" value={fmtBRL(perdas.sub.ILPd)} sub="OCR diurno" icon={<ScanLine className="w-3 h-3" />} tone="red" />
                      <SubMini label="ILPn" value={fmtBRL(perdas.sub.ILPn)} sub="OCR noturno" icon={<FileText className="w-3 h-3" />} tone="teal" />
                    </div>
                  }
                />
                <SubMini label="ICV" value={fmtBRL(perdas.main.ICV)} sub="Classificação veicular" icon={<Tags className="w-3 h-3" />} tone="purple" />
              </div>
            }
          />
          <PerdaCard label="Perda por IDF" value={fmtBRL(perdas.main.IDF)} sub="Disponibilidade" icon={<ShieldCheck className="w-5 h-5" />} tone="amber" />
          <PerdaCard
            label="Perda por IEF"
            value={fmtBRL(perdas.main.IEF)}
            sub="Eficiência funcional"
            icon={<Activity className="w-5 h-5" />}
            tone="orange"
            expandable
            expandedContent={
              <div className="grid grid-cols-2 gap-2">
                <SubMini label="ICId" value={fmtBRL(perdas.sub.ICId)} sub="Captura diurna" icon={<Sun className="w-3 h-3" />} tone="amber" />
                <SubMini label="ICIn" value={fmtBRL(perdas.sub.ICIn)} sub="Captura noturna" icon={<Moon className="w-3 h-3" />} tone="indigo" />
                <SubMini label="IEVri" value={fmtBRL(perdas.sub.IEVri)} sub="Envio de imagens" icon={<Camera className="w-3 h-3" />} tone="orange" />
                <SubMini label="IEVdt" value={fmtBRL(perdas.sub.IEVdt)} sub="Envio de dados" icon={<Send className="w-3 h-3" />} tone="purple" />
                <SubMini label="ILPd" value={fmtBRL(perdas.sub.ILPd)} sub="OCR diurno" icon={<ScanLine className="w-3 h-3" />} tone="red" />
                <SubMini label="ILPn" value={fmtBRL(perdas.sub.ILPn)} sub="OCR noturno" icon={<FileText className="w-3 h-3" />} tone="teal" />
              </div>
            }
          />
          <PerdaCard label="Perda por ICV" value={fmtBRL(perdas.main.ICV)} sub="Classificação veicular" icon={<Tags className="w-5 h-5" />} tone="purple" />
        </div>

        {/* Auditoria matemática */}
        {(() => {
          const somaPerdas = perdas.main.IDF + perdas.main.IEF + perdas.main.ICV;
          const delta = somaPerdas - perdas.main.total;
          const sobrepPct = perdas.main.total > 0 ? (delta / perdas.main.total) * 100 : 0;
          return (
            <div className="mt-3 rounded-lg border border-dashed border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Sigma size={11} /> Auditoria matemática
                </div>
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="opacity-60 hover:opacity-100 text-muted-foreground">
                        <Info size={12} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs text-xs">
                      Cada perda mostra "quanto ganharíamos se <em>apenas este índice</em> fosse 1.0". Como o ID é multiplicativo (ID = IDF × (0,9·IEF + 0,1·ICV)), esses ganhos se sobrepõem — a soma é maior que o desconto real. As barras mostram <strong>potencial isolado de recuperação</strong>; o desconto real é o efeito <strong>combinado</strong> da fórmula do edital.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="rounded-md border border-dashed border-border bg-background/60 p-2">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1"><Sigma size={10} /> Σ Perdas isoladas</div>
                  <div className="font-mono text-sm font-bold mt-0.5">{fmtBRL(somaPerdas)}</div>
                  <div className="text-[10px] text-muted-foreground">IDF + IEF + ICV</div>
                </div>
                <div className="rounded-md border border-dashed border-border bg-background/60 p-2">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1"><Calculator size={10} /> Desconto real</div>
                  <div className="font-mono text-sm font-bold mt-0.5">{fmtBRL(perdas.main.total)}</div>
                  <div className="text-[10px] text-muted-foreground">V. Total − V. Recebido</div>
                </div>
                <div className="rounded-md border border-dashed border-border bg-background/60 p-2">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1"><GitCompare size={10} /> Δ Sobreposição</div>
                  <div className="font-mono text-sm font-bold mt-0.5" style={{ color: delta >= 0 ? '#d97706' : '#059669' }}>{delta >= 0 ? '+' : ''}{fmtBRL(delta)}</div>
                  <div className="text-[10px] text-muted-foreground">{sobrepPct >= 0 ? '+' : ''}{sobrepPct.toFixed(1)}% sobrepostos</div>
                </div>
                <div className="rounded-md border border-dashed border-border bg-background/60 p-2">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1"><CheckCircle2 size={10} className="text-green-600" /> Conferência</div>
                  <div className="font-mono text-sm font-bold mt-0.5 text-green-600">{fmtBRL(perdas.main.total)} ✓</div>
                  <div className="text-[10px] text-muted-foreground font-mono truncate">Bate com card "Perda Total"</div>
                </div>
              </div>
            </div>
          );
        })()}
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
                <td className="font-mono">{fmt(g.c_IDF)}</td>
                <td className="font-mono">{fmt(g.c_IEF)}</td>
                <td className="font-mono">{fmt(g.c_ICV)}</td>
                <td className="font-mono"><span className={`badge ${idBadge(g.c_ID)}`}>{fmt(g.c_ID)}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
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
                <td className="font-mono">{fmt(g.c_IDF)}</td>
                <td className="font-mono">{fmt(g.c_IEF)}</td>
                <td className="font-mono">{fmt(g.c_ICV)}</td>
                <td className="font-mono"><span className={`badge ${idBadge(g.c_ID)}`}>{fmt(g.c_ID)}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <LoteAnaliseModal
        open={showLoteModal}
        onOpenChange={setShowLoteModal}
        groups={groups}
        records={filtered}
        periodo={activePeriod || ''}
      />
    </div>
  );
};

type PerdaTone = 'red' | 'amber' | 'orange' | 'purple' | 'indigo' | 'teal';
const TONE_MAP: Record<PerdaTone, { border: string; bg: string; text: string }> = {
  red: { border: 'border-l-red-500', bg: 'bg-red-50/40 dark:bg-red-950/10', text: 'text-red-600 dark:text-red-400' },
  amber: { border: 'border-l-amber-500', bg: 'bg-amber-50/40 dark:bg-amber-950/10', text: 'text-amber-600 dark:text-amber-400' },
  orange: { border: 'border-l-orange-500', bg: 'bg-orange-50/40 dark:bg-orange-950/10', text: 'text-orange-600 dark:text-orange-400' },
  purple: { border: 'border-l-purple-500', bg: 'bg-purple-50/40 dark:bg-purple-950/10', text: 'text-purple-600 dark:text-purple-400' },
  indigo: { border: 'border-l-indigo-500', bg: 'bg-indigo-50/40 dark:bg-indigo-950/10', text: 'text-indigo-600 dark:text-indigo-400' },
  teal: { border: 'border-l-teal-500', bg: 'bg-teal-50/40 dark:bg-teal-950/10', text: 'text-teal-600 dark:text-teal-400' },
};

function PerdaCard({
  label, value, sub, icon, tone, compact = false, expandable = false, expandedContent, formula,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  tone: PerdaTone;
  compact?: boolean;
  expandable?: boolean;
  expandedContent?: React.ReactNode;
  formula?: { title: string; expr: string; desc?: string };
}) {
  const t = TONE_MAP[tone];
  const [open, setOpen] = useState(false);
  const labelEl = (
    <span className={`${compact ? 'text-[10px]' : 'text-xs'} font-semibold text-muted-foreground uppercase tracking-wide ${formula ? 'cursor-help underline decoration-dotted decoration-muted-foreground/40 underline-offset-2' : ''}`}>{label}</span>
  );
  return (
    <div className={`rounded-lg border border-border border-l-4 ${t.border} ${t.bg} ${compact ? 'p-2.5' : 'p-3'}`}>
      <div className="flex items-center justify-between gap-2">
        {formula ? (
          <TooltipProvider delayDuration={120}>
            <Tooltip>
              <TooltipTrigger asChild>{labelEl}</TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                <div className="font-semibold mb-1">{formula.title}</div>
                <div className="font-mono text-[11px] bg-muted/50 rounded px-2 py-1 mb-1 whitespace-pre-wrap break-words">{formula.expr}</div>
                {formula.desc && <div className="text-[10px] text-muted-foreground">{formula.desc}</div>}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : labelEl}
        <div className="flex items-center gap-1.5">
          <span className={t.text}>{icon}</span>
          {expandable && (
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              className={`p-0.5 rounded hover:bg-foreground/10 transition-colors ${t.text}`}
              aria-label={open ? 'Recolher detalhes' : 'Expandir detalhes'}
              title={open ? 'Recolher' : 'Expandir'}
            >
              {open ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
      <div className={`font-mono font-bold mt-1 text-foreground ${compact ? 'text-base' : 'text-xl'}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
      {expandable && open && expandedContent && (
        <div className="mt-3 pt-3 border-t border-dashed border-border/70">
          {expandedContent}
        </div>
      )}
    </div>
  );
}

function SubMini({ label, value, sub, icon, tone, expandedContent, formula }: { label: string; value: string; sub?: string; icon?: React.ReactNode; tone: PerdaTone; expandedContent?: React.ReactNode; formula?: { title: string; expr: string; desc?: string } }) {
  const t = TONE_MAP[tone];
  const [open, setOpen] = useState(false);
  const expandable = !!expandedContent;
  const labelEl = (
    <span className={`text-[9px] font-bold uppercase tracking-wide text-muted-foreground ${formula ? 'cursor-help underline decoration-dotted decoration-muted-foreground/40 underline-offset-2' : ''}`}>{label}</span>
  );
  return (
    <div className={`rounded-md border border-border/70 border-l-2 ${t.border} bg-background/60 px-2 py-1.5`}>
      <div className="flex items-center justify-between gap-1">
        {formula ? (
          <TooltipProvider delayDuration={120}>
            <Tooltip>
              <TooltipTrigger asChild>{labelEl}</TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                <div className="font-semibold mb-1">{formula.title}</div>
                <div className="font-mono text-[11px] bg-muted/50 rounded px-2 py-1 mb-1 whitespace-pre-wrap break-words">{formula.expr}</div>
                {formula.desc && <div className="text-[10px] text-muted-foreground">{formula.desc}</div>}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : labelEl}
        <div className="flex items-center gap-1">
          {icon && <span className={t.text}>{icon}</span>}
          {expandable && (
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              className={`p-0.5 rounded hover:bg-foreground/10 transition-colors ${t.text}`}
              aria-label={open ? 'Recolher' : 'Expandir'}
              title={open ? 'Recolher' : 'Expandir'}
            >
              {open ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>
      <div className="font-mono text-[11px] font-bold text-foreground leading-tight mt-0.5">{value}</div>
      {sub && <div className="text-[9px] text-muted-foreground/80 leading-tight">{sub}</div>}
      {expandable && open && (
        <div className="mt-1.5 pt-1.5 border-t border-dashed border-border/60">{expandedContent}</div>
      )}
    </div>
  );
}


export default DashboardPage;
