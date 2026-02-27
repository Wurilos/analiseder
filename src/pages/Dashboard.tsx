import React, { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { groupByEquipamento } from '@/lib/grouping';
import { EQUIP_CATALOG, equipLabel, equipLabelFull } from '@/lib/equip-catalog';
import { calcGainPotential, getRecommendations } from '@/lib/calc-engine';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as RechartsRadar, Legend } from 'recharts';

function fmt(v: number | null, d = 3) {
  if (v === null || v === undefined || isNaN(v as number)) return '—';
  return Number(v).toFixed(d);
}
function idBadge(v: number | null) {
  if (v === null || v === undefined) return 'badge-slate';
  return v < 0.6 ? 'badge-red' : v < 0.85 ? 'badge-amber' : 'badge-green';
}

const DashboardPage: React.FC = () => {
  const { getActiveRecords, activePeriod } = useData();
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
  const below6 = withID.filter(r => r.c_ID! < 0.6).length;
  const below85 = withID.filter(r => r.c_ID! < 0.85).length;

  // Distribution chart data
  const distData = useMemo(() => {
    const bins = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.01];
    const labels = bins.slice(0, -1).map((b, i) => `${b.toFixed(1)}–${bins[i + 1].toFixed(1)}`);
    const counts = new Array(10).fill(0);
    const items = dashView === 'equip' ? groups.filter(g => g.c_ID !== null) : withID;
    items.forEach(r => {
      const id = 'c_ID' in r ? (r as any).c_ID : 0;
      for (let i = 0; i < 10; i++) { if (id >= bins[i] && id < bins[i + 1]) { counts[i]++; break; } }
    });
    return labels.map((l, i) => ({ name: l, count: counts[i], fill: i < 6 ? '#ef4444b3' : i < 8 ? '#f59e0bb3' : '#10b981b3' }));
  }, [dashView, groups, withID]);

  // Radar chart data
  const radarData = useMemo(() => {
    const fields = ['c_IDF', 'c_IEF', 'c_ICV', 'c_ICId', 'c_ICIn', 'c_IEVri', 'c_IEVdt'] as const;
    const labels = ['IDF', 'IEF', 'ICV', 'ICId', 'ICIn', 'IEVri', 'IEVdt'];
    const tiposUniq = [...new Set(filtered.map(r => r.tipo))];
    return labels.map((l, i) => {
      const entry: any = { subject: l };
      tiposUniq.forEach(t => {
        const tr = filtered.filter(r => r.tipo === t);
        const vals = tr.map(r => r[fields[i]]).filter((v): v is number => v !== null);
        entry[t] = vals.length ? +(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(3) : 0;
      });
      return entry;
    });
  }, [filtered]);
  const radarTipos = useMemo(() => [...new Set(filtered.map(r => r.tipo))], [filtered]);
  const radarColors = ['#f59e0bcc', '#3b82f6cc', '#10b981cc', '#a855f7cc'];

  // Top 10 worst/best
  const worst10 = useMemo(() => [...groups].filter(g => g.c_ID !== null).sort((a, b) => (a.c_ID ?? 0) - (b.c_ID ?? 0)).slice(0, 10), [groups]);
  const best10 = useMemo(() => [...groups].filter(g => g.c_ID !== null).sort((a, b) => (b.c_ID ?? 0) - (a.c_ID ?? 0)).slice(0, 10), [groups]);

  // Equipment bar chart
  const equipBarData = useMemo(() => {
    const byEquip: Record<string, { sum: number; cnt: number }> = {};
    filtered.forEach(r => {
      if (!byEquip[r.equipamento]) byEquip[r.equipamento] = { sum: 0, cnt: 0 };
      if (r.c_ID !== null) { byEquip[r.equipamento].sum += r.c_ID; byEquip[r.equipamento].cnt++; }
    });
    return Object.entries(byEquip)
      .map(([k, v]) => ({ name: equipLabel(k), avg: v.cnt ? +(v.sum / v.cnt).toFixed(4) : 0 }))
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 20);
  }, [filtered]);

  if (!records.length) {
    return (
      <div className="empty-state">
        <h3 className="text-lg font-semibold">Sem dados</h3>
        <p>Importe uma planilha primeiro na tela de Upload.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <div className="page-title">Dashboard Geral</div>
          <div className="page-subtitle">Visão consolidada · Período: {activePeriod || '—'}</div>
        </div>
        <div className="filters flex gap-2 flex-wrap items-center">
          <div className="toggle-group">
            <button className={`toggle-btn ${dashView === 'faixa' ? 'active' : ''}`} onClick={() => setDashView('faixa')}>Por Faixa</button>
            <button className={`toggle-btn ${dashView === 'equip' ? 'active' : ''}`} onClick={() => setDashView('equip')}>Por Equipamento</button>
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
        <div className={`kpi ${avg < 0.6 ? 'danger' : avg < 0.85 ? 'warn' : 'good'}`}>
          <div className="kpi-label">ID Médio</div>
          <div className="kpi-val">{fmt(avg)}</div>
          <div className="kpi-sub">{dashView === 'equip' ? groups.length + ' equipamentos' : withID.length + ' faixas'}</div>
        </div>
        <div className="kpi"><div className="kpi-label">Mediana</div><div className="kpi-val">{fmt(med)}</div></div>
        <div className={`kpi ${below6 > 0 ? 'danger' : 'good'}`}>
          <div className="kpi-label">ID &lt; 0.60</div>
          <div className="kpi-val">{below6}</div>
          <div className="kpi-sub">críticos</div>
        </div>
        <div className={`kpi ${below85 > 0 ? 'warn' : 'good'}`}>
          <div className="kpi-label">ID &lt; 0.85</div>
          <div className="kpi-val">{below85}</div>
          <div className="kpi-sub">abaixo da meta</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <div className="card-header"><h3>Distribuição do ID</h3></div>
          <div className="card-body" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distData}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#7a8ba8' }} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10, fill: '#7a8ba8' }} />
                <Tooltip contentStyle={{ background: '#151b25', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, fontSize: 12, color: '#e8edf5' }} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={36}>
                  {distData.map((entry, i) => <rect key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>ID por Equipamento (Top 20)</h3></div>
          <div className="card-body" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={equipBarData} layout="vertical">
                <XAxis type="number" domain={[0, 1]} tick={{ fontSize: 10, fill: '#7a8ba8' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#7a8ba8' }} width={90} />
                <Tooltip contentStyle={{ background: '#151b25', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, fontSize: 12, color: '#e8edf5' }} />
                <Bar dataKey="avg" radius={[0, 3, 3, 0]} maxBarSize={16} fill="#f59e0bcc" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Subíndices — Média por Tipo</h3></div>
          <div className="card-body" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,.08)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#7a8ba8' }} />
                <PolarRadiusAxis domain={[0, 1]} tick={{ fontSize: 9, fill: '#4a5a72' }} />
                {radarTipos.map((t, i) => (
                  <RechartsRadar key={t} name={t} dataKey={t} stroke={radarColors[i % 4]} fill={radarColors[i % 4]} fillOpacity={0.15} />
                ))}
                <Legend wrapperStyle={{ fontSize: 11, color: '#7a8ba8' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top 10 */}
      <div className="card mb-4">
        <div className="card-header"><h3>🔴 Top 10 Piores Equipamentos</h3></div>
        <div className="table-wrap overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr>
              <th className="p-2 text-left text-[10.5px] font-semibold text-muted-foreground uppercase">Série</th>
              <th className="p-2 text-left">Equipamento</th><th className="p-2">Tipo</th><th className="p-2">Rodovia</th>
              <th className="p-2">Faixas</th><th className="p-2">IDF</th><th className="p-2">IEF</th><th className="p-2">ICV</th><th className="p-2">ID</th>
            </tr></thead>
            <tbody>{worst10.map(g => (
              <tr key={g.equipamento} className={g.c_ID !== null && g.c_ID < 0.6 ? 'id-critical' : g.c_ID !== null && g.c_ID < 0.85 ? 'id-low' : 'id-ok'}>
                <td className="p-2 font-mono text-primary font-bold">{g.serie ?? '—'}</td>
                <td className="p-2 text-muted-foreground text-[11px]">{g.equipamento}</td>
                <td className="p-2"><span className={`tag tag-${g.tipo.toLowerCase()}`}>{g.tipo}</span></td>
                <td className="p-2 text-muted-foreground text-[11px]">{g.rodovia}</td>
                <td className="p-2 font-mono">{g.numFaixas}</td>
                <td className="p-2 font-mono">{fmt(g.c_IDF)}</td>
                <td className="p-2 font-mono">{fmt(g.c_IEF)}</td>
                <td className="p-2 font-mono">{fmt(g.c_ICV)}</td>
                <td className="p-2"><span className={`badge ${idBadge(g.c_ID)}`}>{fmt(g.c_ID)}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>🟢 Top 10 Melhores Equipamentos</h3></div>
        <div className="table-wrap overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr>
              <th className="p-2 text-left text-[10.5px] font-semibold text-muted-foreground uppercase">Série</th>
              <th className="p-2 text-left">Equipamento</th><th className="p-2">Tipo</th><th className="p-2">Rodovia</th>
              <th className="p-2">Faixas</th><th className="p-2">IDF</th><th className="p-2">IEF</th><th className="p-2">ICV</th><th className="p-2">ID</th>
            </tr></thead>
            <tbody>{best10.map(g => (
              <tr key={g.equipamento} className="id-ok">
                <td className="p-2 font-mono text-primary font-bold">{g.serie ?? '—'}</td>
                <td className="p-2 text-muted-foreground text-[11px]">{g.equipamento}</td>
                <td className="p-2"><span className={`tag tag-${g.tipo.toLowerCase()}`}>{g.tipo}</span></td>
                <td className="p-2 text-muted-foreground text-[11px]">{g.rodovia}</td>
                <td className="p-2 font-mono">{g.numFaixas}</td>
                <td className="p-2 font-mono">{fmt(g.c_IDF)}</td>
                <td className="p-2 font-mono">{fmt(g.c_IEF)}</td>
                <td className="p-2 font-mono">{fmt(g.c_ICV)}</td>
                <td className="p-2"><span className={`badge ${idBadge(g.c_ID)}`}>{fmt(g.c_ID)}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
