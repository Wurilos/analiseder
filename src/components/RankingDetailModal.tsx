import React from 'react';
import { IDRecord } from '@/types';
import { EQUIP_CATALOG, getValorEquip } from '@/lib/equip-catalog';
import { calcID, calcGainPotential, getRecommendations } from '@/lib/calc-engine';
import { formatMoeda } from '@/lib/format';
import { useData } from '@/context/DataContext';

function fmt(v: number | null, d = 3) {
  if (v === null || v === undefined || isNaN(v as number)) return '—';
  return Number(v).toFixed(d);
}

export function DetailModal({ r }: { r: IDRecord }) {
  const gain = calcGainPotential(r);
  const recos = getRecommendations(r);
  const cat = EQUIP_CATALOG[r.equipamento];
  const idColor = (r.c_ID ?? 0) < 0.6 ? 'text-red-600 dark:text-destructive' : (r.c_ID ?? 0) < 0.85 ? 'text-amber-600 dark:text-primary' : 'text-green-600 dark:text-emerald-400';
  const idfColor = r.c_IDF !== null && r.c_IDF < 0.95 ? 'text-amber-600 dark:text-primary' : 'text-green-600 dark:text-emerald-400';

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-bold">{cat ? `Nº ${cat.serie} — ` : ''}{r.equipamento} · Faixa {r.faixa}</h2>
        <p className="text-xs text-muted-foreground mt-1">{r.tipo} · {r.rodovia} km {r.km} · {r.municipio}{cat ? ` · ${cat.lote}` : ''} · Período: {r.periodo}</p>
      </div>

      <div className="tree-node">
        <div className="flex items-center gap-3">
          <div className={`font-mono text-xl font-bold ${idColor}`}>{fmt(r.c_ID)}</div>
          <div>
            <div className="text-sm font-bold">ID — Índice de Desempenho</div>
            <div className="text-[11px] text-muted-foreground">{r.tipo} → IDF × (0.9×IEF + 0.1×ICV){r.f_ID !== null ? ` · planilha: ${fmt(r.f_ID)}` : ''}</div>
          </div>
        </div>
        <div className="tree-children">
          <div className="tree-child">
            <div className="flex items-center gap-3">
              <div className={`font-mono font-bold ${idfColor}`}>{fmt(r.c_IDF)}</div>
              <div>
                <div className="text-xs font-bold">IDF — Disponibilidade</div>
                <div className="text-[11px] text-muted-foreground">NHo/NHt = {r.NHo}/{r.NHt} = {r.NHt ? fmt(((r.NHo ?? 0) / r.NHt)) : '—'} {r.c_IDF !== null && r.c_IDF >= 0.95 ? '→ arred. 1.00' : ''}</div>
              </div>
              <div className="ml-auto text-[11px] text-green-600 dark:text-emerald-400 font-mono">+{fmt(gain.idf_gain)} se IDF=1</div>
            </div>
          </div>
          <div className="tree-child">
            <div className="flex items-center gap-3">
              <div className="font-mono font-bold">{fmt(r.c_IEF)}</div>
              <div>
                <div className="text-xs font-bold">IEF — Eficiência</div>
                <div className="text-[11px] text-muted-foreground">0.8×(ICId+ICIn)/2×(IEVri+IEVdt)/2 + 0.2×(ILPd+ILPn)/2</div>
              </div>
              <div className="ml-auto text-[11px] text-green-600 dark:text-emerald-400 font-mono">+{fmt(gain.ief_gain)} se IEF=1</div>
            </div>
            <div className="mt-2 space-y-1">
              <LeafRow name="ICId" label="Captura Diurna" calc={r.c_ICId} file={r.f_ICId} formula={`(${r.IVd}+${r.INd})/${r.TId} = ${fmt(r.ICId_raw, 3)}`} />
              <LeafRow name="ICIn" label="Captura Noturna" calc={r.c_ICIn} file={r.f_ICIn} formula={`(${r.IVn}+${r.INn})/${r.TIn} = ${fmt(r.ICIn_raw, 3)}`} />
              <LeafRow name="IEVri" label="Envio Imagens" calc={r.c_IEVri} file={r.f_IEVri} formula={`[${r.rfri1},${r.rfri2},${r.rfri3},${r.rfri4},${r.rfri5}] / ${r.pktsInf}`} />
              <LeafRow name="IEVdt" label="Envio Tráfego" calc={r.c_IEVdt} file={r.f_IEVdt} formula={`[${r.rfdt1},${r.rfdt2},${r.rfdt3},${r.rfdt4},${r.rfdt5},${r.rfdt6}] / ${r.pktsTraf}`} />
              <LeafRow name="ILPd" label="Leitura Placas Diurna" calc={r.c_ILPd} file={r.f_ILPd} formula={`${r.LPd}/${r.IVd_ocr} = ${fmt(r.ILPd_raw, 3)}`} />
              <LeafRow name="ILPn" label="Leitura Placas Noturna" calc={r.c_ILPn} file={r.f_ILPn} formula={`${r.LPn}/${r.IVn_ocr} = ${fmt(r.ILPn_raw, 3)}`} />
            </div>
          </div>
          <div className="tree-child">
            <div className="flex items-center gap-3">
              <div className="font-mono font-bold">{fmt(r.c_ICV)}</div>
              <div>
                <div className="text-xs font-bold">ICV — Classificação de Veículos</div>
                <div className="text-[11px] text-muted-foreground">QVc/QVt = {r.QVc}/{r.QVt}</div>
              </div>
              <div className="ml-auto text-[11px] text-green-600 dark:text-emerald-400 font-mono">+{fmt(gain.icv_gain)} se ICV=1</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 border border-border rounded-lg p-4">
        <div className="text-xs font-bold text-primary mb-2">💡 Potencial de Melhoria</div>
        <div className="grid grid-cols-3 gap-2">
          <GainCard label="IDF=1.0" gain={gain.idf_gain} desc="Disponibilidade 100%" />
          <GainCard label="IEF=1.0" gain={gain.ief_gain} desc="Eficiência 100%" />
          <GainCard label="Todos=1.0" gain={gain.total_gap} desc="ID máximo possível" />
        </div>
      </div>

      <div className="mt-4">
        <div className="text-sm font-bold mb-2">🎯 Recomendações</div>
        <div className="space-y-2">
          {recos.length ? recos.map((re, i) => (
            <div key={i} className={`border rounded-lg p-3 ${re.priority === 'high' ? 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/5' : re.priority === 'medium' ? 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/5' : 'border-blue-200 bg-blue-50 dark:border-blue-500/25 dark:bg-blue-500/5'}`}>
              <div className="flex items-start gap-2">
                <span>{re.priority === 'high' ? '🔴' : re.priority === 'medium' ? '🟡' : '🔵'}</span>
                <div>
                  <div className="text-xs font-bold">{re.title}</div>
                  <div className="text-[11px] text-muted-foreground">{re.desc}</div>
                  {re.gain && <div className="text-[11px] text-green-600 dark:text-emerald-400 font-mono mt-1">Potencial: {re.gain}</div>}
                </div>
              </div>
            </div>
          )) : (
            <div className="border border-green-200 bg-green-50 dark:border-green-500/25 dark:bg-green-500/5 rounded-lg p-3 flex items-center gap-2">
              <span>✅</span><span className="text-xs font-bold">Equipamento com bom desempenho</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Dados Brutos</div>
        <div className="grid grid-cols-3 gap-1.5 text-[11.5px]">
          <RawRow label="Pacotes Inf." value={r.pktsInf} />
          <RawRow label="Infrações" value={r.infracoes} />
          <RawRow label="Válidas" value={r.validas} />
          <RawRow label="Contagem Veíc." value={r.contagemVeic} />
          <RawRow label="NHt" value={r.NHt} />
          <RawRow label="NHo" value={r.NHo} />
          <RawRow label="Período" value={r.periodo} />
          <RawRow label="Dias" value={r.dias} />
        </div>
      </div>
    </div>
  );
}

function LeafRow({ name, label, calc, file, formula }: { name: string; label: string; calc: number | null; file: number | null; formula: string }) {
  const cv = calc ?? 0;
  const color = cv < 0.5 ? 'text-red-600 dark:text-destructive' : cv < 0.8 ? 'text-amber-600 dark:text-primary' : 'text-green-600 dark:text-emerald-400';
  const diff = (file !== null && calc !== null) ? Math.abs(cv - file) : null;
  const match = diff !== null ? diff < 0.001 : null;
  return (
    <div className="tree-leaf">
      <span className="font-mono font-bold text-xs w-10">{name}</span>
      <span className={`font-mono font-bold ${color}`}>{fmt(calc)}</span>
      {file !== null && (
        <>
          <span className="text-muted-foreground text-[10px]">plan:{fmt(file)}</span>
          <span className={`text-[10px] ${match ? 'text-green-600 dark:text-emerald-400' : 'text-red-600 dark:text-destructive'}`}>{match ? '✓' : `Δ${fmt(diff, 3)}`}</span>
        </>
      )}
      <span className="text-[10px] text-muted-foreground ml-auto font-mono">{formula}</span>
    </div>
  );
}

function GainCard({ label, gain, desc }: { label: string; gain: number; desc: string }) {
  return (
    <div className="bg-green-50 dark:bg-emerald-500/5 border border-green-200 dark:border-emerald-500/25 rounded-lg p-3 text-center">
      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
      <div className="font-mono text-lg font-bold text-green-600 dark:text-emerald-400">+{fmt(gain)}</div>
      <div className="text-[10px] text-muted-foreground">{desc}</div>
    </div>
  );
}

function RawRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex gap-2 items-center">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-mono">{value ?? '—'}</span>
    </div>
  );
}
