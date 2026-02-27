import React, { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { EQUIP_CATALOG } from '@/lib/equip-catalog';

function fmt(v: number | null, d = 3) {
  if (v === null || v === undefined || isNaN(v as number)) return '—';
  return Number(v).toFixed(d);
}
function deltaClass(d: number) {
  if (d > 0.001) return 'delta-pos';
  if (d < -0.001) return 'delta-neg';
  return 'delta-zero';
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

    // Group by equipment
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
        <h3>Importe pelo menos 2 períodos</h3>
        <p>Faça upload de planilhas de meses diferentes para habilitar a comparação.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <div className="page-title">Comparativo entre Períodos</div>
          <div className="page-subtitle">Evolução, regressões e melhorias ao longo do tempo</div>
        </div>
        <div className="filters flex gap-2">
          <select className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs" value={periodA} onChange={e => setPeriodA(e.target.value)}>
            <option value="">Período A</option>
            {keys.map(k => <option key={k}>{k}</option>)}
          </select>
          <select className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs" value={periodB} onChange={e => setPeriodB(e.target.value)}>
            <option value="">Período B</option>
            {keys.map(k => <option key={k}>{k}</option>)}
          </select>
        </div>
      </div>

      {comparison ? (
        <>
          <div className="kpis grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3.5 mb-6">
            <div className="kpi"><div className="kpi-label">ID Médio — {periodA}</div><div className="kpi-val">{fmt(comparison.avgA)}</div></div>
            <div className="kpi"><div className="kpi-label">ID Médio — {periodB}</div><div className="kpi-val">{fmt(comparison.avgB)}</div></div>
            <div className={`kpi ${comparison.deltaAvg > 0 ? 'good' : comparison.deltaAvg < 0 ? 'danger' : ''}`}>
              <div className="kpi-label">Variação Média</div>
              <div className="kpi-val">{deltaStr(comparison.deltaAvg)}</div>
            </div>
            <div className="kpi good"><div className="kpi-label">Melhoraram</div><div className="kpi-val">{comparison.improved}</div></div>
            <div className={`kpi ${comparison.regressed > 0 ? 'danger' : 'good'}`}><div className="kpi-label">Regrediram</div><div className="kpi-val">{comparison.regressed}</div></div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Comparativo por Equipamento</h3></div>
            <div className="table-wrap overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr>
                  <th className="p-2 text-left">Série</th><th className="p-2">Equipamento</th><th className="p-2">Tipo</th><th className="p-2">Rodovia</th>
                  <th className="p-2">ID {periodA}</th><th className="p-2">ID {periodB}</th><th className="p-2">Δ</th><th className="p-2">Status</th>
                </tr></thead>
                <tbody>
                  {comparison.rows.map(r => (
                    <tr key={r.equip}>
                      <td className="p-2 font-mono text-primary font-bold">{r.serie ?? '—'}</td>
                      <td className="p-2 text-muted-foreground text-[11px]">{r.equip}</td>
                      <td className="p-2"><span className={`tag tag-${r.tipo.toLowerCase()}`}>{r.tipo}</span></td>
                      <td className="p-2 text-muted-foreground text-[11px]">{r.rodovia}</td>
                      <td className="p-2 font-mono">{r.idA !== null ? fmt(r.idA) : '—'}</td>
                      <td className="p-2 font-mono">{r.idB !== null ? fmt(r.idB) : '—'}</td>
                      <td className={`p-2 font-mono font-bold ${r.delta !== null ? deltaClass(r.delta) : ''}`}>
                        {r.delta !== null ? deltaStr(r.delta) : '—'}
                      </td>
                      <td className="p-2">
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
