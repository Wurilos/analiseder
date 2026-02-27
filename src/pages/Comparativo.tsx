import React, { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { EQUIP_CATALOG } from '@/lib/equip-catalog';
import KPICard from '@/components/KPICard';
import { BarChart3, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';

function fmt(v: number | null, d = 3) {
  if (v === null || v === undefined || isNaN(v as number)) return '—';
  return Number(v).toFixed(d);
}
function deltaStr(d: number) {
  if (Math.abs(d) < 0.001) return '=';
  return (d > 0 ? '+' : '') + d.toFixed(3);
}

const ComparativoPage: React.FC = () => {
  const { periods } = useData();
  const keys = Object.keys(periods);
  const [periodA, setPeriodA] = useState(keys[0] || '');
  const [periodB, setPeriodB] = useState(keys[1] || '');

  const comparison = useMemo(() => {
    if (!periodA || !periodB || !periods[periodA] || !periods[periodB]) return null;
    const recsA = periods[periodA];
    const recsB = periods[periodB];

    const mapA: Record<string, any> = {};
    const mapB: Record<string, any> = {};
    const avg = (recs: any[], field: string) => {
      const vals = recs.map(r => r[field]).filter((v: any) => v !== null);
      return vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null;
    };

    const equipSet = new Set<string>();
    recsA.forEach(r => { equipSet.add(r.equipamento); if (!mapA[r.equipamento]) mapA[r.equipamento] = []; mapA[r.equipamento].push(r); });
    recsB.forEach(r => { equipSet.add(r.equipamento); if (!mapB[r.equipamento]) mapB[r.equipamento] = []; mapB[r.equipamento].push(r); });

    const rows = [...equipSet].map(equip => {
      const a = mapA[equip]; const b = mapB[equip];
      const idA = a ? avg(a, 'c_ID') : null;
      const idB = b ? avg(b, 'c_ID') : null;
      const delta = (idA !== null && idB !== null) ? idB - idA : null;
      return { equip, serie: EQUIP_CATALOG[equip]?.serie ?? null, tipo: (a?.[0] || b?.[0])?.tipo ?? '', rodovia: (a?.[0] || b?.[0])?.rodovia ?? '', idA, idB, delta };
    }).sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0));

    const avgA = recsA.filter(r => r.c_ID !== null).reduce((s, r) => s + (r.c_ID ?? 0), 0) / Math.max(1, recsA.filter(r => r.c_ID !== null).length);
    const avgB = recsB.filter(r => r.c_ID !== null).reduce((s, r) => s + (r.c_ID ?? 0), 0) / Math.max(1, recsB.filter(r => r.c_ID !== null).length);
    const improved = rows.filter(r => r.delta !== null && r.delta > 0.001).length;
    const regressed = rows.filter(r => r.delta !== null && r.delta < -0.001).length;

    return { rows, avgA, avgB, improved, regressed, deltaAvg: avgB - avgA };
  }, [periods, periodA, periodB]);

  if (keys.length < 2) {
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
        <div className="filters">
          <select value={periodA} onChange={e => setPeriodA(e.target.value)}>
            <option value="">Período A</option>
            {keys.map(k => <option key={k}>{k}</option>)}
          </select>
          <select value={periodB} onChange={e => setPeriodB(e.target.value)}>
            <option value="">Período B</option>
            {keys.map(k => <option key={k}>{k}</option>)}
          </select>
        </div>
      </div>

      {comparison ? (
        <>
          <div className="kpis">
            <KPICard label={`ID Médio — ${periodA}`} value={fmt(comparison.avgA)} icon={<BarChart3 size={22} />} iconColor="blue" />
            <KPICard label={`ID Médio — ${periodB}`} value={fmt(comparison.avgB)} icon={<BarChart3 size={22} />} iconColor="indigo" />
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
                  <th>ID {periodA}</th><th>ID {periodB}</th><th>Δ</th><th>Status</th>
                </tr></thead>
                <tbody>
                  {comparison.rows.map(r => (
                    <tr key={r.equip}>
                      <td className="font-mono text-primary font-bold">{r.serie ?? '—'}</td>
                      <td className="text-muted-foreground text-[11px]">{r.equip}</td>
                      <td><span className={`tag tag-${r.tipo.toLowerCase()}`}>{r.tipo}</span></td>
                      <td className="text-muted-foreground text-[11px]">{r.rodovia}</td>
                      <td className="font-mono">{r.idA !== null ? fmt(r.idA) : '—'}</td>
                      <td className="font-mono">{r.idB !== null ? fmt(r.idB) : '—'}</td>
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
          <p>Selecione dois períodos para comparar.</p>
        </div>
      )}
    </div>
  );
};

export default ComparativoPage;
