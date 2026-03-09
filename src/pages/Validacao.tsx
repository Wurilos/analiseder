import React, { useMemo } from 'react';
import { useData } from '@/context/DataContext';
import KPICard from '@/components/KPICard';
import { CheckCircle, Check, AlertTriangle, XCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { IDRecord } from '@/types';

function fmt(v: number | null, d = 3) {
  if (v === null || v === undefined || isNaN(v as number)) return '—';
  return Number(v).toFixed(d);
}

type IndexKey = 'ICId' | 'ICIn' | 'IEVri' | 'IEVdt' | 'ILPd' | 'ILPn' | 'IEF' | 'IDF' | 'ICV' | 'ID';

function indexTooltip(idx: IndexKey, r: IDRecord): string {
  const f = (v: number | null) => v !== null && v !== undefined ? Number(v).toFixed(3) : '—';
  switch (idx) {
    case 'ICId':
      return `ICId = (IVd + INd) / TId\n= (${f(r.IVd)} + ${f(r.INd)}) / ${f(r.TId)}\nRatio: ${f(r.ICId_raw)} → ${f(r.c_ICId)}`;
    case 'ICIn':
      return `ICIn = (IVn + INn) / TIn\n= (${f(r.IVn)} + ${f(r.INn)}) / ${f(r.TIn)}\nRatio: ${f(r.ICIn_raw)} → ${f(r.c_ICIn)}`;
    case 'IEVri':
      return `IEVri = (1×R1 + 0.8×R2 + 0.6×R3 + 0.4×R4 + 0.2×R5) / Total\nR1=${f(r.rfri1)} R2=${f(r.rfri2)} R3=${f(r.rfri3)}\nR4=${f(r.rfri4)} R5=${f(r.rfri5)}\nResultado: ${f(r.c_IEVri)}`;
    case 'IEVdt':
      return `IEVdt = (1×R1 + 0.9×R2 + 0.8×R3 + 0.7×R4 + 0.4×R5 + 0.2×R6) / Total\nR1=${f(r.rfdt1)} R2=${f(r.rfdt2)} R3=${f(r.rfdt3)}\nR4=${f(r.rfdt4)} R5=${f(r.rfdt5)} R6=${f(r.rfdt6)}\nResultado: ${f(r.c_IEVdt)}`;
    case 'ILPd':
      return `ILPd = LPd / IVd\n= ${f(r.LPd)} / ${f(r.IVd_ocr)}\nRatio: ${f(r.ILPd_raw)} → ${f(r.c_ILPd)}`;
    case 'ILPn':
      return `ILPn = LPn / IVn\n= ${f(r.LPn)} / ${f(r.IVn_ocr)}\nRatio: ${f(r.ILPn_raw)} → ${f(r.c_ILPn)}`;
    case 'IEF':
      return `IEF = 0.8 × (ICId+ICIn)/2 × (IEVri+IEVdt)/2 + 0.2 × (ILPd+ILPn)/2\nICId=${f(r.c_ICId)}  ICIn=${f(r.c_ICIn)}\nIEVri=${f(r.c_IEVri)}  IEVdt=${f(r.c_IEVdt)}\nILPd=${f(r.c_ILPd)}  ILPn=${f(r.c_ILPn)}\nResultado: ${f(r.c_IEF)}`;
    case 'IDF':
      return `IDF = NHo / NHt\n= ${f(r.NHo)} / ${f(r.NHt)}\n≥ 0.95 → 1.000\nResultado: ${f(r.c_IDF)}`;
    case 'ICV':
      return `ICV = QVc / QVt\n= ${f(r.QVc)} / ${f(r.QVt)}\n≥ 0.80→1 | ≥0.70→0.75 | ≥0.60→0.25 | <0.60→0\nResultado: ${f(r.c_ICV)}`;
    case 'ID':
      return `ID = IDF × (0.9 × IEF + 0.1 × ICV)\nIDF=${f(r.c_IDF)}  IEF=${f(r.c_IEF)}  ICV=${f(r.c_ICV)}\nResultado: ${f(r.c_ID)}`;
  }
}

function IdxCell({ idx, r }: { idx: IndexKey; r: IDRecord }) {
  const val = r[`c_${idx}` as keyof IDRecord] as number | null;
  return (
    <td className="font-mono">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help">{fmt(val)}</span>
        </TooltipTrigger>
        <TooltipContent side="top" align="center" className="max-w-xs whitespace-pre-wrap font-mono text-[11px] pointer-events-none">
          {indexTooltip(idx, r)}
        </TooltipContent>
      </Tooltip>
    </td>
  );
}

interface Divergence {
  equip: string; faixa: string; indice: string;
  sistema: number | null; planilha: number | null; delta: number;
}

const ValidacaoPage: React.FC = () => {
  const { getActiveRecords } = useData();
  const { isParalisado } = useParalisacao();
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
    <TooltipProvider delayDuration={200}>
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
              ) : divergences.map((d, i) => {
                const salmonClass = isParalisado(d.equip) ? 'bg-salmon/20' : '';
                return (
                 <tr key={i} className={salmonClass}>
                   <td className="font-mono text-[11px]">{d.equip}</td>
                   <td className="font-mono">{d.faixa}</td>
                   <td className="font-mono font-bold text-primary">
                     <Tooltip>
                       <TooltipTrigger asChild>
                         <span className="cursor-help">{d.indice}</span>
                       </TooltipTrigger>
                       <TooltipContent side="top" align="center" className="max-w-xs whitespace-pre-wrap font-mono text-[11px] pointer-events-none">
                         {indexTooltip(d.indice as IndexKey, records.find(r => r.equipamento === d.equip && r.faixa === d.faixa)!)}
                       </TooltipContent>
                     </Tooltip>
                   </td>
                  <td className="font-mono">{fmt(d.sistema)}</td>
                  <td className="font-mono">{fmt(d.planilha)}</td>
                  <td className={`font-mono font-bold ${d.delta >= 0.01 ? 'text-destructive' : 'text-primary'}`}>{fmt(d.delta, 4)}</td>
                  <td>
                    <span className={`badge ${d.delta >= 0.01 ? 'badge-red' : 'badge-amber'}`}>
                      {d.delta >= 0.01 ? 'Erro' : 'Aviso'}
                    </span>
                  </td>
                </tr>
              );
              })}
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
                  <tr key={i} className={`${delta !== null && delta >= 0.01 ? 'id-critical' : ''} ${isParalisado(r.equipamento) ? 'bg-salmon/20' : ''}`}>
                    <td className="font-mono text-[11px]">{r.equipamento}</td>
                    <td className="font-mono">{r.faixa}</td>
                    <td><span className={`tag tag-${r.tipo.toLowerCase()}`}>{r.tipo}</span></td>
                    <IdxCell idx="ICId" r={r} />
                    <IdxCell idx="ICIn" r={r} />
                    <IdxCell idx="IEVri" r={r} />
                    <IdxCell idx="IEVdt" r={r} />
                    <IdxCell idx="ILPd" r={r} />
                    <IdxCell idx="ILPn" r={r} />
                    <IdxCell idx="IEF" r={r} />
                    <IdxCell idx="IDF" r={r} />
                    <IdxCell idx="ICV" r={r} />
                    <td className="font-mono font-bold">
                      <Tooltip>
                        <TooltipTrigger asChild><span className="cursor-help">{fmt(r.c_ID)}</span></TooltipTrigger>
                        <TooltipContent side="top" align="center" className="max-w-xs whitespace-pre-wrap font-mono text-[11px] pointer-events-none">{indexTooltip('ID', r)}</TooltipContent>
                      </Tooltip>
                    </td>
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
    </TooltipProvider>
  );
};

export default ValidacaoPage;
