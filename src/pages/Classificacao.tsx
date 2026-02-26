import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UploadCard } from '@/components/UploadCard';
import { KPIGrid, KPICard } from '@/components/KPIGrid';
import { FiltersBar, FilterField, FilterSelect, FilterInput } from '@/components/FiltersBar';
import { StatusTag } from '@/components/StatusTag';
import { PaginationBar } from '@/components/PaginationBar';
import { RankingCard } from '@/components/RankingCard';
import { BarChartSimple } from '@/components/BarChartSimple';
import { ClassificacaoRow, ViewMode } from '@/types';
import { MOTIVOS_LABELS, SPLICE_MOTIVOS } from '@/lib/constants';
import { normStr, fmt, safeNum, getPercColor } from '@/lib/format';
import {
  parseClassificacaoFile,
  groupClassificacaoByEquipment,
  exportClassificacaoCSV,
} from '@/lib/classificacao-utils';

const PAGE_SIZE = 25;

const ClassificacaoPage: React.FC = () => {
  const [raw, setRaw] = useState<ClassificacaoRow[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('faixa');
  const [page, setPage] = useState(0);
  const [modalRow, setModalRow] = useState<ClassificacaoRow | null>(null);

  // Filters
  const [fRodovia, setFRodovia] = useState('');
  const [fTipo, setFTipo] = useState('');
  const [fResp, setFResp] = useState('');
  const [fSearch, setFSearch] = useState('');

  const handleFile = useCallback(async (file: File) => {
    const buf = await file.arrayBuffer();
    setRaw(parseClassificacaoFile(buf));
    setPage(0);
  }, []);

  // Filter options
  const rodovias = useMemo(() => [...new Set(raw.map(r => normStr(r.Rodovia)).filter(Boolean))].sort(), [raw]);
  const tipos = useMemo(() => [...new Set(raw.map(r => normStr(r.Tipo)).filter(Boolean))].sort(), [raw]);

  // Apply filters
  const filtered = useMemo(() => {
    let data = raw.filter(r => {
      if (fRodovia && normStr(r.Rodovia) !== fRodovia) return false;
      if (fTipo && normStr(r.Tipo) !== fTipo) return false;
      if (fResp && r.RespPrincipal.toLowerCase() !== fResp) return false;
      if (fSearch) {
        const hay = [r.Rodovia, r.Equipamento, r.Faixa].map(normStr).join(' ').toLowerCase();
        if (!hay.includes(fSearch.toLowerCase())) return false;
      }
      return true;
    });
    if (viewMode === 'equipamento') {
      data = groupClassificacaoByEquipment(data);
    }
    return data;
  }, [raw, fRodovia, fTipo, fResp, fSearch, viewMode]);

  // KPIs
  const kpis = useMemo(() => {
    const totValidas = filtered.reduce((s, r) => s + r.Validas, 0);
    const totInvalidas = filtered.reduce((s, r) => s + r.TotalInvalidas, 0);
    const totSplice = filtered.reduce((s, r) => s + r.Splice, 0);
    const totDER = filtered.reduce((s, r) => s + r.DER, 0);
    const totGeral = totValidas + totInvalidas;
    const percValidas = totGeral > 0 ? (totValidas / totGeral) * 100 : 0;
    const percInvalidas = totGeral > 0 ? (totInvalidas / totGeral) * 100 : 0;

    // Splice motivos
    const totImagem = filtered.reduce((s, r) => s + (r.Motivos?.Imagem || 0), 0);
    const totEnq = filtered.reduce((s, r) => s + (r.Motivos?.Enquadramento || 0), 0);
    const totSinal = filtered.reduce((s, r) => s + (r.Motivos?.SinalizacaoTransito || 0), 0);

    return {
      totGeral, totValidas, totInvalidas, totSplice, totDER,
      percValidas, percInvalidas,
      totImagem, totEnq, totSinal,
      percSplice: totGeral > 0 ? (totSplice / totGeral) * 100 : 0,
      percDER: totGeral > 0 ? (totDER / totGeral) * 100 : 0,
    };
  }, [filtered]);

  // Rankings
  const rankingSpliceTotal = useMemo(() => {
    let data = viewMode === 'faixa' ? groupClassificacaoByEquipment(filtered) : filtered;
    return data.filter(r => r.Splice > 0).sort((a, b) => b.Splice - a.Splice).slice(0, 10);
  }, [filtered, viewMode]);

  const rankingSplicePerc = useMemo(() => {
    let data = viewMode === 'faixa' ? groupClassificacaoByEquipment(filtered) : filtered;
    return data
      .filter(r => r.Splice > 0 && r.Validas > 0)
      .map(r => ({ ...r, calcPercSplice: (r.Splice / (r.Validas + r.TotalInvalidas)) * 100 }))
      .sort((a, b) => b.calcPercSplice - a.calcPercSplice)
      .slice(0, 10);
  }, [filtered, viewMode]);

  // Chart data - problem distribution
  const chartData = useMemo(() => {
    const totais: Record<string, number> = {};
    Object.keys(MOTIVOS_LABELS).forEach(k => {
      totais[k] = raw.reduce((s, r) => s + (r.Motivos[k as keyof typeof r.Motivos] || 0), 0);
    });
    return Object.entries(totais)
      .sort(([, a], [, b]) => b - a)
      .filter(([, v]) => v > 0)
      .map(([key, val]) => {
        const isSplice = (SPLICE_MOTIVOS as readonly string[]).includes(key);
        return {
          label: MOTIVOS_LABELS[key],
          value: val,
          color: isSplice ? 'hsl(263, 84%, 58%)' : 'hsl(37, 100%, 56%)',
          tag: isSplice ? 'Splice' : 'DER',
          tagColor: isSplice ? 'bg-neon-purple/20 text-neon-purple' : 'bg-neon-amber/20 text-neon-amber',
        };
      });
  }, [raw]);

  // Pagination
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (raw.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-black text-gradient-primary mb-2">
            📊 Classificação de Infrações
          </h1>
          <p className="text-sm text-muted-foreground">
            Análise detalhada de infrações inválidas por motivo de classificação
          </p>
        </div>
        <UploadCard
          title="📂 Arraste a planilha de classificação aqui (ou clique)"
          description="Arquivo: ClassificacaoInfracaoInvalida.xlsx"
          hint="Splice: Imagem, Enquadramento, Sinalização | DER: Demais classificações"
          onFile={handleFile}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gradient-primary">📊 Classificação de Infrações</h1>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-xs text-muted-foreground">
              Total: <strong className="font-mono text-foreground">{filtered.length}</strong> registros
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setViewMode('faixa'); setPage(0); }}
            className={viewMode === 'faixa' ? 'border-primary text-primary' : ''}>
            Por Faixa
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setViewMode('equipamento'); setPage(0); }}
            className={viewMode === 'equipamento' ? 'border-primary text-primary' : ''}>
            Por Equipamento
          </Button>
          <Button size="sm" onClick={() => exportClassificacaoCSV(filtered)}
            className="bg-primary text-primary-foreground">
            <Download className="w-3.5 h-3.5 mr-1" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Dashboard Charts */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {/* Visão Geral */}
        <div className="card-glass rounded-2xl p-6">
          <div className="text-xs text-muted-foreground uppercase tracking-wider text-center mb-4">📊 Visão Geral</div>
          <div className="text-center mb-5">
            <div className="text-4xl font-black font-mono text-neon-cyan">{kpis.totGeral.toLocaleString('pt-BR')}</div>
            <div className="text-[10px] text-muted-foreground/60 uppercase mt-1">Total de Imagens</div>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>✅ Válidas</span>
                <span className="font-mono font-bold text-neon-green">{kpis.totValidas.toLocaleString('pt-BR')} ({kpis.percValidas.toFixed(1)}%)</span>
              </div>
              <div className="h-6 bg-secondary/30 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-neon-green to-neon-green/70 transition-all duration-700" style={{ width: `${kpis.percValidas}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>❌ Inválidas</span>
                <span className="font-mono font-bold text-neon-red">{kpis.totInvalidas.toLocaleString('pt-BR')} ({kpis.percInvalidas.toFixed(1)}%)</span>
              </div>
              <div className="h-6 bg-secondary/30 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-neon-red to-neon-red/70 transition-all duration-700" style={{ width: `${kpis.percInvalidas}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Splice */}
        <div className="card-glass rounded-2xl p-6">
          <div className="text-xs text-muted-foreground uppercase tracking-wider text-center mb-4">🟣 Responsabilidade Splice</div>
          <div className="text-center mb-5">
            <div className="text-4xl font-black font-mono text-neon-purple">{kpis.totSplice.toLocaleString('pt-BR')}</div>
            <div className="text-[10px] text-muted-foreground/60 uppercase mt-1">Infrações Splice</div>
          </div>
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span>% do Total</span>
              <span className="font-mono font-bold text-neon-purple">{kpis.percSplice.toFixed(2)}%</span>
            </div>
            <div className="h-6 bg-secondary/30 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-neon-purple to-neon-purple/70 transition-all duration-700" style={{ width: `${Math.min(kpis.percSplice * 5, 100)}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
            <div className="text-center">
              <div className="text-lg font-black font-mono text-neon-purple">{kpis.totImagem.toLocaleString('pt-BR')}</div>
              <div className="text-[10px] text-muted-foreground/60">Imagem</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-black font-mono text-neon-purple">{kpis.totEnq.toLocaleString('pt-BR')}</div>
              <div className="text-[10px] text-muted-foreground/60">Enquadramento</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-black font-mono text-neon-purple">{kpis.totSinal.toLocaleString('pt-BR')}</div>
              <div className="text-[10px] text-muted-foreground/60">Sinalização</div>
            </div>
          </div>
        </div>

        {/* DER */}
        <div className="card-glass rounded-2xl p-6">
          <div className="text-xs text-muted-foreground uppercase tracking-wider text-center mb-4">🟡 Responsabilidade DER</div>
          <div className="text-center mb-5">
            <div className="text-4xl font-black font-mono text-neon-amber">{kpis.totDER.toLocaleString('pt-BR')}</div>
            <div className="text-[10px] text-muted-foreground/60 uppercase mt-1">Infrações DER</div>
          </div>
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span>% do Total</span>
              <span className="font-mono font-bold text-neon-amber">{kpis.percDER.toFixed(2)}%</span>
            </div>
            <div className="h-6 bg-secondary/30 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-neon-amber to-neon-amber/70 transition-all duration-700" style={{ width: `${Math.min(kpis.percDER * 5, 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Main content + sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5 items-start">
        <div className="min-w-0">
          {/* Filters */}
          <div className="card-glass rounded-2xl p-5 mb-5">
            <h3 className="text-base font-bold mb-4">📋 Detalhes por Equipamento</h3>
            <FiltersBar>
              <FilterField label="Rodovia">
                <FilterSelect value={fRodovia} onChange={e => { setFRodovia(e.target.value); setPage(0); }}>
                  <option value="">Todas</option>
                  {rodovias.map(r => <option key={r} value={r}>{r}</option>)}
                </FilterSelect>
              </FilterField>
              <FilterField label="Tipo">
                <FilterSelect value={fTipo} onChange={e => { setFTipo(e.target.value); setPage(0); }}>
                  <option value="">Todos</option>
                  {tipos.map(t => <option key={t} value={t}>{t}</option>)}
                </FilterSelect>
              </FilterField>
              <FilterField label="Responsabilidade">
                <FilterSelect value={fResp} onChange={e => { setFResp(e.target.value); setPage(0); }}>
                  <option value="">Todas</option>
                  <option value="splice">Splice</option>
                  <option value="der">DER</option>
                </FilterSelect>
              </FilterField>
              <FilterField label="Buscar" className="min-w-[200px]">
                <FilterInput placeholder="Equipamento, etc." value={fSearch}
                  onChange={e => { setFSearch(e.target.value); setPage(0); }} />
              </FilterField>
            </FiltersBar>

            {/* Table */}
            <div className="overflow-x-auto max-h-[600px] scrollbar-thin rounded-lg">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-secondary/50 backdrop-blur-sm">
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase">Equipamento</th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase">Rodovia</th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase">Km</th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase">Faixa</th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase">Válidas</th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase">Inválidas</th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase">% Inv.</th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase">Maior Problema</th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase">Resp.</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r, i) => {
                    const percCls = getPercColor(r.PercInvalidas);
                    const respCls = r.RespPrincipal === 'Splice' ? 'purple' : 'amber';
                    return (
                      <tr key={i} onClick={() => setModalRow(r)}
                        className="border-b border-border/50 cursor-pointer transition-colors hover:bg-primary/5">
                        <td className="px-3 py-2.5 font-medium text-xs">{normStr(r.Equipamento)}</td>
                        <td className="px-3 py-2.5 text-xs">{normStr(r.Rodovia)}</td>
                        <td className="px-3 py-2.5 font-mono text-xs">{fmt(safeNum(r.Km), 1)}</td>
                        <td className="px-3 py-2.5 text-xs">{r._isGrouped ? `${r.NumFaixas} faixas` : normStr(r.Faixa)}</td>
                        <td className="px-3 py-2.5 font-mono text-xs">{r.Validas.toLocaleString('pt-BR')}</td>
                        <td className="px-3 py-2.5 font-mono text-xs">{r.TotalInvalidas.toLocaleString('pt-BR')}</td>
                        <td className="px-3 py-2.5"><StatusTag color={percCls}>{r.PercInvalidas.toFixed(1)}%</StatusTag></td>
                        <td className="px-3 py-2.5 text-xs">{r.MaiorMotivo ? MOTIVOS_LABELS[r.MaiorMotivo] : '—'}</td>
                        <td className="px-3 py-2.5"><StatusTag color={respCls}>{r.RespPrincipal}</StatusTag></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationBar page={page} pageSize={PAGE_SIZE} total={filtered.length}
              onPrev={() => setPage(p => Math.max(0, p - 1))}
              onNext={() => setPage(p => (p + 1) * PAGE_SIZE < filtered.length ? p + 1 : p)} />
          </div>

          {/* Chart Geral */}
          {chartData.length > 0 && (
            <div className="card-glass rounded-2xl p-5">
              <h3 className="text-base font-bold mb-4">📊 Distribuição de Problemas (Geral)</h3>
              <BarChartSimple data={chartData} />
            </div>
          )}
        </div>

        {/* Sidebar Rankings */}
        <div className="sticky top-5">
          <RankingCard
            title="🔴 Maiores Perdas Splice (Total)"
            items={rankingSpliceTotal.map(r => ({
              id: normStr(r.Equipamento),
              label: normStr(r.Equipamento),
              value: r.Splice.toLocaleString('pt-BR'),
              meta: `${normStr(r.Rodovia)} • ${r._isGrouped ? r.NumFaixas + ' faixas' : r.Faixa}`,
              onClick: () => setModalRow(r),
            }))}
            gradient="text-gradient-danger"
          />
          <RankingCard
            title="📊 Maiores Perdas Splice (%)"
            items={rankingSplicePerc.map(r => ({
              id: normStr(r.Equipamento) + '_perc',
              label: normStr(r.Equipamento),
              value: (r as any).calcPercSplice.toFixed(1) + '%',
              meta: `${normStr(r.Rodovia)} • ${r.Splice} perdas`,
              onClick: () => setModalRow(r),
            }))}
            gradient="text-gradient-primary"
          />
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog open={!!modalRow} onOpenChange={() => setModalRow(null)}>
        <DialogContent className="max-w-2xl bg-card border-border">
          {modalRow && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {normStr(modalRow.Equipamento)} - {modalRow._isGrouped ? `${modalRow.NumFaixas} faixas` : normStr(modalRow.Faixa)}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {normStr(modalRow.Rodovia)} • Km {fmt(safeNum(modalRow.Km), 1)}
                </p>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Resumo */}
                <div className="bg-secondary/20 rounded-xl p-4 border border-border">
                  <h4 className="text-sm font-bold text-primary mb-3">📊 Resumo Geral</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Válidas</div>
                      <div className="text-2xl font-bold font-mono text-neon-green">{modalRow.Validas.toLocaleString('pt-BR')}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Inválidas</div>
                      <div className="text-2xl font-bold font-mono text-neon-red">{modalRow.TotalInvalidas.toLocaleString('pt-BR')}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">% Inválidas</div>
                      <div className="text-2xl font-bold font-mono text-neon-amber">{modalRow.PercInvalidas.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>

                {/* Detalhamento */}
                <div className="bg-secondary/20 rounded-xl p-4 border border-border">
                  <h4 className="text-sm font-bold text-primary mb-3">🔍 Detalhamento por Motivo</h4>
                  <BarChartSimple
                    data={Object.entries(modalRow.Motivos)
                      .sort(([, a], [, b]) => b - a)
                      .filter(([, v]) => v > 0)
                      .map(([key, val]) => {
                        const isSplice = (SPLICE_MOTIVOS as readonly string[]).includes(key);
                        return {
                          label: MOTIVOS_LABELS[key],
                          value: val,
                          color: isSplice ? 'hsl(263, 84%, 58%)' : 'hsl(37, 100%, 56%)',
                          tag: isSplice ? 'Splice' : 'DER',
                          tagColor: isSplice ? 'bg-neon-purple/20 text-neon-purple' : 'bg-neon-amber/20 text-neon-amber',
                        };
                      })}
                  />
                </div>

                {/* Responsabilidade */}
                <div className="bg-secondary/20 rounded-xl p-4 border border-border">
                  <h4 className="text-sm font-bold text-primary mb-3">⚠️ Responsabilidade</h4>
                  {(() => {
                    const totalResp = modalRow.Splice + modalRow.DER;
                    const percSplice = totalResp > 0 ? (modalRow.Splice / totalResp) * 100 : 0;
                    const percDER = totalResp > 0 ? (modalRow.DER / totalResp) * 100 : 0;
                    return (
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="flex items-center gap-2">
                              <StatusTag color="purple">Splice</StatusTag>
                              {percSplice.toFixed(1)}%
                            </span>
                            <span className="font-mono font-bold">{modalRow.Splice}</span>
                          </div>
                          <div className="h-5 bg-secondary/30 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-neon-purple" style={{ width: `${percSplice}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="flex items-center gap-2">
                              <StatusTag color="amber">DER</StatusTag>
                              {percDER.toFixed(1)}%
                            </span>
                            <span className="font-mono font-bold">{modalRow.DER}</span>
                          </div>
                          <div className="h-5 bg-secondary/30 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-neon-amber" style={{ width: `${percDER}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassificacaoPage;
