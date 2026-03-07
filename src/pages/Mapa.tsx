import React, { useMemo, useState } from 'react';
import { useData } from '@/context/DataContext';
import { groupByEquipamento } from '@/lib/grouping';
import { EquipGroup } from '@/types';
import { pct, formatMoeda } from '@/lib/format';
import { motion } from 'framer-motion';
import { MapPin, Filter, ChevronRight, AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

function sevColor(id: number | null): string {
  if (id === null) return 'bg-muted text-muted-foreground';
  if (id < 0.60) return 'bg-red-500 text-white';
  if (id < 0.85) return 'bg-amber-500 text-white';
  return 'bg-emerald-500 text-white';
}
function sevBorder(id: number | null): string {
  if (id === null) return 'border-muted';
  if (id < 0.60) return 'border-red-500';
  if (id < 0.85) return 'border-amber-500';
  return 'border-emerald-500';
}
function sevIcon(id: number | null) {
  if (id === null) return <Info className="w-3.5 h-3.5" />;
  if (id < 0.60) return <AlertCircle className="w-3.5 h-3.5" />;
  if (id < 0.85) return <AlertTriangle className="w-3.5 h-3.5" />;
  return <CheckCircle2 className="w-3.5 h-3.5" />;
}

interface RoadGroup {
  rodovia: string;
  equips: EquipGroup[];
  avgID: number;
  minKm: number;
  maxKm: number;
}

export default function MapaPage() {
  const { getActiveRecords, activePeriod } = useData();
  const records = getActiveRecords();
  const [selectedRodovia, setSelectedRodovia] = useState<string>('');
  const [detailEquip, setDetailEquip] = useState<EquipGroup | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('');

  const groups = useMemo(() => groupByEquipamento(records), [records]);

  const roadGroups = useMemo(() => {
    const byRoad: Record<string, EquipGroup[]> = {};
    groups.forEach(g => {
      const r = g.rodovia || 'Sem Rodovia';
      if (!byRoad[r]) byRoad[r] = [];
      byRoad[r].push(g);
    });

    return Object.entries(byRoad).map(([rodovia, equips]): RoadGroup => {
      const sorted = [...equips].sort((a, b) => (a.km ?? 0) - (b.km ?? 0));
      const kms = sorted.map(e => e.km ?? 0);
      const ids = sorted.map(e => e.c_ID ?? 0);
      return {
        rodovia,
        equips: sorted,
        avgID: ids.length ? ids.reduce((s, v) => s + v, 0) / ids.length : 0,
        minKm: Math.min(...kms),
        maxKm: Math.max(...kms),
      };
    }).sort((a, b) => a.avgID - b.avgID);
  }, [groups]);

  const filteredRoads = useMemo(() => {
    let roads = roadGroups;
    if (selectedRodovia) roads = roads.filter(r => r.rodovia === selectedRodovia);
    if (severityFilter === 'critico') roads = roads.map(r => ({ ...r, equips: r.equips.filter(e => (e.c_ID ?? 0) < 0.60) })).filter(r => r.equips.length > 0);
    if (severityFilter === 'alerta') roads = roads.map(r => ({ ...r, equips: r.equips.filter(e => (e.c_ID ?? 0) >= 0.60 && (e.c_ID ?? 0) < 0.85) })).filter(r => r.equips.length > 0);
    if (severityFilter === 'ok') roads = roads.map(r => ({ ...r, equips: r.equips.filter(e => (e.c_ID ?? 0) >= 0.85) })).filter(r => r.equips.length > 0);
    return roads;
  }, [roadGroups, selectedRodovia, severityFilter]);

  const stats = useMemo(() => {
    const total = groups.length;
    const criticos = groups.filter(g => (g.c_ID ?? 0) < 0.60).length;
    const alertas = groups.filter(g => (g.c_ID ?? 0) >= 0.60 && (g.c_ID ?? 0) < 0.85).length;
    const ok = groups.filter(g => (g.c_ID ?? 0) >= 0.85).length;
    return { total, criticos, alertas, ok, rodovias: roadGroups.length };
  }, [groups, roadGroups]);

  if (!records.length) {
    return (
      <div className="empty-state">
        <div className="text-5xl mb-4">🗺️</div>
        <h3 className="text-lg font-semibold mb-1">Sem dados</h3>
        <p>Importe uma planilha primeiro.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <div className="page-title flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            Mapa por Rodovia
          </div>
          <div className="page-subtitle">
            Visualização geográfica dos equipamentos por rodovia e km — Período: {activePeriod || '—'}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Rodovias', value: stats.rodovias, color: 'text-foreground' },
          { label: 'Equipamentos', value: stats.total, color: 'text-foreground' },
          { label: 'Críticos', value: stats.criticos, color: 'text-red-600 dark:text-red-400', filter: 'critico' },
          { label: 'Alerta', value: stats.alertas, color: 'text-amber-600 dark:text-amber-400', filter: 'alerta' },
          { label: 'OK', value: stats.ok, color: 'text-emerald-600 dark:text-emerald-400', filter: 'ok' },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => setSeverityFilter(prev => prev === (s as any).filter ? '' : ((s as any).filter || ''))}
            className={`card p-3 text-center transition-all hover:ring-2 hover:ring-primary/30 ${severityFilter === (s as any).filter ? 'ring-2 ring-primary' : ''}`}
          >
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
            <div className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <select
          className="text-sm"
          value={selectedRodovia}
          onChange={e => setSelectedRodovia(e.target.value)}
        >
          <option value="">Todas as rodovias</option>
          {roadGroups.map(r => (
            <option key={r.rodovia} value={r.rodovia}>{r.rodovia} ({r.equips.length} equip.)</option>
          ))}
        </select>
        <div className="flex gap-2 ml-auto">
          <span className="flex items-center gap-1.5 text-[11px]"><span className="w-3 h-3 rounded-full bg-red-500" /> ID &lt; 0.60</span>
          <span className="flex items-center gap-1.5 text-[11px]"><span className="w-3 h-3 rounded-full bg-amber-500" /> 0.60–0.85</span>
          <span className="flex items-center gap-1.5 text-[11px]"><span className="w-3 h-3 rounded-full bg-emerald-500" /> ≥ 0.85</span>
        </div>
      </div>

      {/* Road visualizations */}
      <div className="space-y-4">
        {filteredRoads.map((road, ri) => (
          <motion.div
            key={road.rodovia}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(ri * 0.03, 0.3) }}
            className="card"
          >
            <div className="card-header">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-8 rounded-full ${sevColor({ 0: null, 1: road.avgID }[1])}`} />
                <div>
                  <h3 className="font-bold text-sm">{road.rodovia}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {road.equips.length} equipamento(s) · km {road.minKm.toFixed(1)} a {road.maxKm.toFixed(1)} · ID médio: <span className="font-mono font-semibold">{pct(road.avgID)}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Road strip */}
            <div className="px-4 pb-4">
              <div className="relative">
                {/* Road line */}
                <div className="h-2 bg-muted rounded-full relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 opacity-20 rounded-full"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Equipment markers */}
                <div className="relative mt-1" style={{ minHeight: '80px' }}>
                  {road.equips.map((equip, ei) => {
                    const range = road.maxKm - road.minKm;
                    const pos = range > 0 ? ((equip.km ?? 0) - road.minKm) / range * 100 : 50;
                    const clampedPos = Math.max(2, Math.min(98, pos));

                    return (
                      <button
                        key={equip.equipamento}
                        onClick={() => setDetailEquip(equip)}
                        className="absolute group"
                        style={{ left: `${clampedPos}%`, transform: 'translateX(-50%)', top: `${(ei % 3) * 28}px` }}
                      >
                        {/* Connector line */}
                        <div className={`w-px h-3 mx-auto ${sevBorder(equip.c_ID)} border-l-2`} style={{ marginTop: `-${(ei % 3) * 28 + 14}px`, height: `${(ei % 3) * 28 + 14}px` }} />
                        
                        {/* Marker */}
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono whitespace-nowrap shadow-sm border transition-all hover:scale-110 hover:shadow-md cursor-pointer ${sevColor(equip.c_ID)} ${sevBorder(equip.c_ID)}`}>
                          {sevIcon(equip.c_ID)}
                          <span className="font-bold">{equip.serie ?? equip.equipamento.slice(-4)}</span>
                          <span className="opacity-80">{equip.c_ID !== null ? (equip.c_ID * 100).toFixed(0) + '%' : '—'}</span>
                        </div>

                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                          <div className="bg-popover text-popover-foreground border border-border rounded-lg shadow-lg p-3 text-[11px] min-w-[200px]">
                            <div className="font-bold mb-1">{equip.equipamento}</div>
                            <div className="text-muted-foreground">km {equip.km} · {equip.tipo} · {equip.numFaixas}f</div>
                            <div className="grid grid-cols-3 gap-1 mt-2 font-mono">
                              <span>IDF: {pct(equip.c_IDF)}</span>
                              <span>IEF: {pct(equip.c_IEF)}</span>
                              <span>ICV: {pct(equip.c_ICV)}</span>
                            </div>
                            {equip.descontoTotal > 0 && (
                              <div className="mt-1 text-red-500 font-semibold">Desconto: {formatMoeda(equip.descontoTotal)}</div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Km labels */}
                <div className="flex justify-between mt-2 text-[10px] text-muted-foreground font-mono">
                  <span>km {road.minKm.toFixed(1)}</span>
                  <span>km {road.maxKm.toFixed(1)}</span>
                </div>
              </div>
            </div>

            {/* Equipment list for this road */}
            <div className="border-t border-border">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0">
                {road.equips.map(equip => (
                  <button
                    key={equip.equipamento}
                    onClick={() => setDetailEquip(equip)}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 transition-colors text-left border-b border-r border-border"
                  >
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${sevColor(equip.c_ID)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs font-bold truncate">{equip.equipamento}</div>
                      <div className="text-[10px] text-muted-foreground">km {equip.km} · {equip.tipo}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-mono text-xs font-bold">{pct(equip.c_ID)}</div>
                      {equip.descontoTotal > 0 && (
                        <div className="text-[10px] text-red-500">{formatMoeda(equip.descontoTotal)}</div>
                      )}
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!detailEquip} onOpenChange={() => setDetailEquip(null)}>
        <DialogContent className="max-w-md">
          {detailEquip && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono text-sm">{detailEquip.equipamento}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Rodovia:</span> {detailEquip.rodovia}</div>
                  <div><span className="text-muted-foreground">Km:</span> {detailEquip.km}</div>
                  <div><span className="text-muted-foreground">Tipo:</span> {detailEquip.tipo}</div>
                  <div><span className="text-muted-foreground">Faixas:</span> {detailEquip.numFaixas}</div>
                  <div><span className="text-muted-foreground">Lote:</span> {detailEquip.lote || '—'}</div>
                  <div><span className="text-muted-foreground">Série:</span> {detailEquip.serie ?? '—'}</div>
                </div>

                <div className="border-t border-border pt-3">
                  <h4 className="text-xs font-semibold mb-2">Índices</h4>
                  <div className="grid grid-cols-2 gap-1.5 font-mono text-xs">
                    {[
                      { k: 'ID', v: detailEquip.c_ID },
                      { k: 'IDF', v: detailEquip.c_IDF },
                      { k: 'IEF', v: detailEquip.c_IEF },
                      { k: 'ICV', v: detailEquip.c_ICV },
                      { k: 'ICId', v: detailEquip.c_ICId },
                      { k: 'ICIn', v: detailEquip.c_ICIn },
                      { k: 'IEVri', v: detailEquip.c_IEVri },
                      { k: 'IEVdt', v: detailEquip.c_IEVdt },
                      { k: 'ILPd', v: detailEquip.c_ILPd },
                      { k: 'ILPn', v: detailEquip.c_ILPn },
                    ].map(idx => (
                      <div key={idx.k} className="flex justify-between">
                        <span className="text-muted-foreground">{idx.k}:</span>
                        <span className={
                          idx.v !== null && idx.v < 0.60 ? 'text-red-600 dark:text-red-400 font-semibold' :
                          idx.v !== null && idx.v < 0.85 ? 'text-amber-600 dark:text-amber-400' :
                          'text-emerald-600 dark:text-emerald-400'
                        }>{pct(idx.v)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-3">
                  <h4 className="text-xs font-semibold mb-2">Financeiro</h4>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <div><span className="text-muted-foreground">Valor Total:</span> <span className="font-semibold">{formatMoeda(detailEquip.valorTotal)}</span></div>
                    <div><span className="text-muted-foreground">Recebido:</span> <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatMoeda(detailEquip.valorRecebidoTotal)}</span></div>
                    <div><span className="text-muted-foreground">Desconto:</span> <span className="font-semibold text-red-600 dark:text-red-400">{formatMoeda(detailEquip.descontoTotal)}</span></div>
                    <div><span className="text-muted-foreground">Alavanca:</span> <span className="font-semibold">{detailEquip.melhorAlavanca.nome}</span></div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
