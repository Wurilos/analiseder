import React, { useMemo } from 'react';
import { useData } from '@/context/DataContext';
import KPICard from '@/components/KPICard';
import { CheckCircle, Check, AlertTriangle, XCircle } from 'lucide-react';

function fmt(v: number | null, d = 3) {
  if (v === null || v === undefined || isNaN(v as number)) return '—';
  return Number(v).toFixed(d);
}

interface Divergence {
  equip: string; faixa: string; indice: string;
  sistema: number | null; planilha: number | null; delta: number;
}

const ValidacaoPage: React.FC = () => {
  const { getActiveRecords } = useData();
  const records = getActiveRecords();

  const indices = ['ICId', 'ICIn', 'IEVri', 'IEVdt', 'ILPd', 'ILPn', 'IEF', 'IDF', 'ICV', 'ID'] as const;

  const { divergences, total, matches, warnings, errors } = useMemo(() => {
    const divs: Divergence[] = [];
    let total = 0, matches = 0, warnings = 0, errors = 0;

    records.forEach(r => {
      indices.forEach(idx => {
        const calc = (r as any)[`c_${idx}`] as number | null;
        const file = (r as any)[`f_${idx}`] as number | null;
        if (calc === null || file === null) return;
        total++;
        const delta = Math.abs(calc - file);
        if (delta < 0.001) { matches++; return; }
        if (delta < 0.01) { warnings++; } else { errors++; }
        divs.push({ equip: r.equipamento, faixa: r.faixa, indice: idx, sistema: calc, planilha: file, delta });
      });
    });

    return { divergences: divs.sort((a, b) => b.delta - a.delta), total, matches, warnings, errors };
  }, [records]);

  if (!records.length) {
    return <div className="empty-state"><h3>Sem dados</h3><p>Importe uma planilha primeiro.</p></div>;
  }

  const matchPct = total > 0 ? ((matches / total) * 100).toFixed(1) : '0';

  return (
    <div>
      <div className="page-header mb-6">
        <div>
          <div className="page-title">Validação de Cálculos</div>
          <div className="page-subtitle">Comparação entre valores calculados pelo sistema e valores da planilha</div>
        </div>
      </div>

      <div className="kpis">
        <KPICard label="Verificações" value={total} sub="índices verificados" icon={<CheckCircle size={22} />} iconColor="blue" severity="good" />
        <KPICard label="Coincidentes" value={matches} sub={`${matchPct}% do total`} icon={<Check size={22} />} iconColor="green" severity="good" />
        <KPICard label="Desvios Leves" value={warnings} sub="Δ < 0.01" icon={<AlertTriangle size={22} />} iconColor="amber" severity={warnings > 0 ? 'warn' : 'good'} />
        <KPICard label="Divergências" value={errors} sub="Δ ≥ 0.01" icon={<XCircle size={22} />} iconColor="red" severity={errors > 0 ? 'danger' : 'good'} />
      </div>

      <div className="card mb-4">
        <div className="card-header"><h3>🔍 Divergências Detectadas</h3></div>
        <div className="table-wrap overflow-x-auto">
          <table>
            <thead><tr>
              <th>Equipamento</th><th>Faixa</th><th>Índice</th>
              <th>Sistema</th><th>Planilha</th><th>Δ</th><th>Status</th>
            </tr></thead>
            <tbody>
              {divergences.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">✓ Nenhuma divergência encontrada</td></tr>
              ) : divergences.map((d, i) => (
                <tr key={i}>
                  <td className="font-mono text-[11px]">{d.equip}</td>
                  <td className="font-mono">{d.faixa}</td>
                  <td className="font-mono font-bold text-primary">{d.indice}</td>
                  <td className="font-mono">{fmt(d.sistema)}</td>
                  <td className="font-mono">{fmt(d.planilha)}</td>
                  <td className={`font-mono font-bold ${d.delta >= 0.01 ? 'text-destructive' : 'text-primary'}`}>{fmt(d.delta, 4)}</td>
                  <td>
                    <span className={`badge ${d.delta >= 0.01 ? 'badge-red' : 'badge-amber'}`}>
                      {d.delta >= 0.01 ? 'Erro' : 'Aviso'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>📊 Auditoria Completa por Equipamento</h3></div>
        <div className="table-wrap overflow-x-auto">
          <table>
            <thead><tr>
              <th>Equipamento</th><th>Faixa</th><th>Tipo</th>
              <th>ICId</th><th>ICIn</th><th>IEVri</th><th>IEVdt</th>
              <th>ILPd</th><th>ILPn</th><th>IEF</th><th>IDF</th>
              <th>ICV</th><th>ID calc.</th><th>ID plan.</th><th>Δ ID</th>
            </tr></thead>
            <tbody>
              {records.map((r, i) => {
                const delta = (r.c_ID !== null && r.f_ID !== null) ? Math.abs(r.c_ID - r.f_ID) : null;
                return (
                  <tr key={i} className={delta !== null && delta >= 0.01 ? 'id-critical' : ''}>
                    <td className="font-mono text-[11px]">{r.equipamento}</td>
                    <td className="font-mono">{r.faixa}</td>
                    <td><span className={`tag tag-${r.tipo.toLowerCase()}`}>{r.tipo}</span></td>
                    <td className="font-mono">{fmt(r.c_ICId)}</td>
                    <td className="font-mono">{fmt(r.c_ICIn)}</td>
                    <td className="font-mono">{fmt(r.c_IEVri)}</td>
                    <td className="font-mono">{fmt(r.c_IEVdt)}</td>
                    <td className="font-mono">{fmt(r.c_ILPd)}</td>
                    <td className="font-mono">{fmt(r.c_ILPn)}</td>
                    <td className="font-mono">{fmt(r.c_IEF)}</td>
                    <td className="font-mono">{fmt(r.c_IDF)}</td>
                    <td className="font-mono">{fmt(r.c_ICV)}</td>
                    <td className="font-mono font-bold">{fmt(r.c_ID)}</td>
                    <td className="font-mono text-primary">{fmt(r.f_ID)}</td>
                    <td className={`font-mono font-bold ${delta !== null && delta >= 0.01 ? 'text-destructive' : delta !== null && delta >= 0.001 ? 'text-primary' : 'text-green-600'}`}>
                      {delta !== null ? fmt(delta, 4) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ValidacaoPage;
