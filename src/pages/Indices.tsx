import React, { useState, useMemo, useCallback } from 'react';
import { Download, Settings, Eye, EyeOff, BarChart3, ListChecks, AlertTriangle, TrendingDown, DollarSign, Receipt, BadgeDollarSign, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UploadCard } from '@/components/UploadCard';
import { KPIGrid, KPICard } from '@/components/KPIGrid';
import { FiltersBar, FilterField, FilterSelect, FilterInput } from '@/components/FiltersBar';
import { StatusTag } from '@/components/StatusTag';
import { PaginationBar } from '@/components/PaginationBar';
import { RankingCard } from '@/components/RankingCard';
import { IndicesRow, ViewMode, DashboardMode } from '@/types';
import { RANKING_INDICES, INDICE_SHORT_LABELS } from '@/lib/constants';
import { normStr, fmt, safeNum, pct, formatMoeda, getStatusColor } from '@/lib/format';
import {
  parseIndicesFile, groupIndicesByEquipment, exportIndicesExcel,
  calcularPerdaPorSubIndice, identificarMaiorProblema,
} from '@/lib/indices-utils';

const PAGE_SIZE = 25;

const IndicesPage: React.FC = () => {
  const [raw, setRaw] = useState<IndicesRow[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('faixa');
  const [dashboardMode, setDashboardMode] = useState<DashboardMode>('detalhado');
  const [page, setPage] = useState(0);
  const [meta, setMeta] = useState(0.80);
  const [rankingIndice, setRankingIndice] = useState('ID');
  const [modalRow, setModalRow] = useState<IndicesRow | null>(null);
  const [fRodovia, setFRodovia] = useState('');
  const [fTipo, setFTipo] = useState('');
  const [fFaixa, setFFaixa] = useState('');
  const [fSearch, setFSearch] = useState('');

  const handleFile = useCallback(async (file: File) => {
    const buf = await file.arrayBuffer();
    setRaw(parseIndicesFile(buf));
    setPage(0);
  }, []);

  const rodovias = useMemo(() => [...new Set(raw.map(r => normStr(r.Rodovia)).filter(Boolean))].sort(), [raw]);
  const tipos = useMemo(() => [...new Set(raw.map(r => normStr(r.Tipo)).filter(Boolean))].sort(), [raw]);
  const faixas = useMemo(() => [...new Set(raw.map(r => normStr(r.Faixa)).filter(Boolean))].sort(), [raw]);

  const filtered = useMemo(() => {
    let data = raw.filter(r => {
      if (fRodovia && normStr(r.Rodovia) !== fRodovia) return false;
      if (fTipo && normStr(r.Tipo) !== fTipo) return false;
      if (fFaixa && normStr(r.Faixa) !== fFaixa) return false;
      if (fSearch) {
        const hay = [r.Rodovia, r.Equipamento, r.Faixa].map(normStr).join(' ').toLowerCase();
        if (!hay.includes(fSearch.toLowerCase())) return false;
      }
      return true;
    });
    if (viewMode === 'equipamento') data = groupIndicesByEquipment(data);
    return data;
  }, [raw, fRodovia, fTipo, fFaixa, fSearch, viewMode]);

  const kpis = useMemo(() => {
    const ids = filtered.map(r => safeNum(r.ID)).filter((v): v is number => v !== null);
    const avg = ids.length ? ids.reduce((a, b) => a + b, 0) / ids.length : null;
    const below = ids.filter(v => v < meta).length;
    const worst = ids.length ? Math.min(...ids) : null;
    const comValor = filtered.filter(r => r.ValorContratual);
    const totalContratual = comValor.reduce((s, r) => s + (r.ValorContratual || 0), 0);
    const totalReceber = comValor.reduce((s, r) => s + (r.ValorReceber || 0), 0);
    const totalDesconto = comValor.reduce((s, r) => s + (r.Desconto || 0), 0);
    return { avg, below, worst, totalContratual, totalReceber, totalDesconto, comValor, count: filtered.length };
  }, [filtered, meta]);

  const ranking = useMemo(() => {
    return [...filtered]
      .filter(r => safeNum((r as any)[rankingIndice]) !== null)
      .sort((a, b) => (safeNum((a as any)[rankingIndice]) || 0) - (safeNum((b as any)[rankingIndice]) || 0))
      .slice(0, 10);
  }, [filtered, rankingIndice]);

  const rankingFinanceiro = useMemo(() => {
    if (viewMode !== 'equipamento') return [];
    return [...filtered].filter(r => r.Desconto && r.Desconto > 0)
      .sort((a, b) => (b.Desconto || 0) - (a.Desconto || 0)).slice(0, 10);
  }, [filtered, viewMode]);

  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleChangeMeta = () => {
    const v = prompt('Meta do ID (ex: 0.80):', meta.toFixed(2));
    const n = Number((v || '').replace(',', '.'));
    if (Number.isFinite(n) && n > 0 && n < 1) setMeta(n);
  };

  if (raw.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-black text-gradient-primary mb-2">📈 Análise de Índices (ID)</h1>
          <p className="text-sm text-muted-foreground">Mapeamento fixo de colunas</p>
        </div>
        <UploadCard
          title="📂 Arraste sua planilha aqui (ou clique)"
          description="Mapeamento: ICId=W, ICIn=AA, IEVri=AG, IEVdt=AN, ILPd=AQ, ILPn=AT, IEF=AU, ICV=AX, IDF=BC, ID=BD"
          hint="💰 Valores contratuais pré-cadastrados para cálculo financeiro automático"
          onFile={handleFile}
        />
      </div>
    );
  }

  // Executive Dashboard
  if (dashboardMode === 'executivo') {
    const execData = viewMode === 'faixa' ? groupIndicesByEquipment(filtered) : filtered;
    const execIds = execData.map(r => safeNum(r.ID)).filter((v): v is number => v !== null);
    const execAvg = execIds.length ? execIds.reduce((a, b) => a + b, 0) / execIds.length : null;
    const criticos = execData.filter(r => safeNum(r.ID) !== null && safeNum(r.ID)! < meta);
    const comValor = execData.filter(r => r.ValorContratual);
    const totalDesconto = comValor.reduce((s, r) => s + (r.Desconto || 0), 0);
    const ok = execData.filter(r => safeNum(r.ID) !== null && safeNum(r.ID)! >= meta + 0.08).length;
    const atencao = execData.filter(r => { const id = safeNum(r.ID); return id !== null && id >= meta && id < meta + 0.08; }).length;

    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-extrabold text-gradient-primary">👔 Visão Executiva</h1>
          <Button variant="outline" size="sm" onClick={() => setDashboardMode('detalhado')}>← Visão Detalhada</Button>
        </div>

        <div className="card-glass rounded-2xl p-10 mb-6 text-center">
          <h2 className="text-3xl font-black text-gradient-primary mb-8">Resumo Executivo</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3">ID Médio</div>
              <div className={`text-5xl font-black font-mono ${execAvg !== null && execAvg >= meta ? 'text-neon-green' : 'text-neon-red'}`}>
                {execAvg !== null ? pct(execAvg) : '—'}
              </div>
              <div className="text-xs text-muted-foreground/60 mt-2">meta: {(meta * 100).toFixed(0)}%</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Equipamentos</div>
              <div className="text-5xl font-black font-mono text-neon-cyan">{execData.length}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Críticos</div>
              <div className="text-5xl font-black font-mono text-neon-red">{criticos.length}</div>
              <div className="text-xs text-muted-foreground/60 mt-2">abaixo da meta</div>
            </div>
            {comValor.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Desconto Total</div>
                <div className="text-4xl font-black font-mono text-neon-red">{formatMoeda(totalDesconto).replace('R$', '').trim()}</div>
                <div className="text-xs text-muted-foreground/60 mt-2">perda mensal</div>
              </div>
            )}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="grid grid-cols-3 gap-5 mb-6">
          <div className="card-glass rounded-2xl p-6 text-center border-neon-green/20">
            <div className="text-4xl font-black text-neon-green">{ok}</div>
            <div className="text-sm text-muted-foreground mt-2">✅ OK (&gt;{(meta * 100 + 8).toFixed(0)}%)</div>
          </div>
          <div className="card-glass rounded-2xl p-6 text-center border-neon-amber/20">
            <div className="text-4xl font-black text-neon-amber">{atencao}</div>
            <div className="text-sm text-muted-foreground mt-2">⚠️ Atenção</div>
          </div>
          <div className="card-glass rounded-2xl p-6 text-center border-neon-red/20">
            <div className="text-4xl font-black text-neon-red">{criticos.length}</div>
            <div className="text-sm text-muted-foreground mt-2">🔴 Crítico (&lt;{(meta * 100).toFixed(0)}%)</div>
          </div>
        </div>

        {/* Critical equipments */}
        {criticos.length > 0 && (
          <div className="card-glass rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold text-neon-red mb-4">🔴 Equipamentos Críticos</h3>
            <div className="grid md:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto scrollbar-thin">
              {criticos.slice(0, 20).map((r, i) => (
                <div key={i} onClick={() => setModalRow(r)}
                  className="p-3 bg-neon-red/5 border-l-[3px] border-neon-red rounded-md cursor-pointer hover:bg-neon-red/10 transition-colors">
                  <div className="flex justify-between">
                    <strong className="text-xs">{normStr(r.Equipamento)}</strong>
                    <span className="font-mono text-neon-red font-bold text-xs">{pct(safeNum(r.ID))}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground/60">{normStr(r.Rodovia)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Detailed view
  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gradient-primary">📈 Análise de Índices (ID)</h1>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            Meta: <strong className="font-mono text-foreground">{meta.toFixed(2)}</strong>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleChangeMeta}>Alterar</Button>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => { setViewMode('faixa'); setPage(0); }}
            className={viewMode === 'faixa' ? 'border-primary text-primary' : ''}>Por Faixa</Button>
          <Button variant="outline" size="sm" onClick={() => { setViewMode('equipamento'); setPage(0); }}
            className={viewMode === 'equipamento' ? 'border-primary text-primary' : ''}>Por Equipamento</Button>
          <Button variant="outline" size="sm" onClick={() => setDashboardMode('executivo')}>
            <Eye className="w-3.5 h-3.5 mr-1" /> Visão Executiva
          </Button>
          <Button size="sm" className="bg-neon-green text-background" onClick={() => exportIndicesExcel(filtered)}>
            <Download className="w-3.5 h-3.5 mr-1" /> Exportar Excel
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <KPIGrid>
        <KPICard label="Total de Linhas" value={String(kpis.count)} color="cyan" icon={ListChecks} />
        <KPICard label="ID Médio" value={kpis.avg !== null ? pct(kpis.avg) : '—'} color="cyan" icon={BarChart3} />
        <KPICard label="Abaixo da Meta" value={String(kpis.below)} color="amber" icon={AlertTriangle} />
        <KPICard label="Pior ID" value={kpis.worst !== null ? pct(kpis.worst) : '—'} color="red" icon={TrendingDown} />
      </KPIGrid>

      {viewMode === 'equipamento' && kpis.totalContratual > 0 && (
        <KPIGrid>
          <KPICard label="Valor Contratual" value={formatMoeda(kpis.totalContratual)} color="cyan" icon={DollarSign} />
          <KPICard label="Valor a Receber" value={formatMoeda(kpis.totalReceber)} color="green" icon={Receipt} />
          <KPICard label="Desconto Total" value={formatMoeda(kpis.totalDesconto)} color="red" icon={BadgeDollarSign} />
          <KPICard label="% Desconto" value={kpis.totalContratual > 0 ? ((kpis.totalDesconto / kpis.totalContratual) * 100).toFixed(1) + '%' : '—'} color="amber" icon={Percent} />
        </KPIGrid>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5 items-start">
        <div className="min-w-0">
          <div className="card-glass rounded-2xl p-5">
            <h3 className="text-base font-bold mb-4">Equipamentos</h3>
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
              <FilterField label="Buscar" className="min-w-[200px]">
                <FilterInput placeholder="Equipamento, etc." value={fSearch}
                  onChange={e => { setFSearch(e.target.value); setPage(0); }} />
              </FilterField>
            </FiltersBar>

            <div className="overflow-x-auto max-h-[500px] scrollbar-thin rounded-lg">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-secondary/50 backdrop-blur-sm">
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase">Rodovia</th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase">Km</th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase">Equipamento</th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase">Faixa</th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase">ID</th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase">IEF</th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase">ICV</th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase">IDF</th>
                    {viewMode === 'equipamento' && (
                      <th className="px-3 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase">💰 Desconto</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r, i) => {
                    const id = safeNum(r.ID);
                    const st = getStatusColor(id, meta);
                    return (
                      <tr key={i} onClick={() => setModalRow(r)}
                        className="border-b border-border/50 cursor-pointer transition-colors hover:bg-primary/5">
                        <td className="px-3 py-2.5 text-xs">{normStr(r.Rodovia)}</td>
                        <td className="px-3 py-2.5 font-mono text-xs">{fmt(safeNum(r.Km), 3)}</td>
                        <td className="px-3 py-2.5 font-medium text-xs">{normStr(r.Equipamento)}</td>
                        <td className="px-3 py-2.5 text-xs">{r._isGrouped ? `${r.NumFaixas} faixas` : normStr(r.Faixa)}</td>
                        <td className="px-3 py-2.5"><StatusTag color={st.color}>{id !== null ? pct(id) : '—'}</StatusTag></td>
                        <td className="px-3 py-2.5 font-mono text-xs">{pct(safeNum(r.IEF))}</td>
                        <td className="px-3 py-2.5 font-mono text-xs">{pct(safeNum(r.ICV))}</td>
                        <td className="px-3 py-2.5 font-mono text-xs">{pct(safeNum(r.IDF))}</td>
                        {viewMode === 'equipamento' && (
                          <td className="px-3 py-2.5">
                            {r.Desconto != null ? (
                              <StatusTag color={r.Desconto > 3000 ? 'red' : r.Desconto > 1000 ? 'amber' : 'green'}>
                                {formatMoeda(r.Desconto)}
                              </StatusTag>
                            ) : '—'}
                          </td>
                        )}
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
        </div>

        {/* Sidebar */}
        <div className="sticky top-5">
          <div className="card-glass rounded-2xl p-4 mb-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-gradient-danger">🔴 Piores Valores</h3>
            </div>
            <FilterField label="Índice">
              <FilterSelect value={rankingIndice} onChange={e => setRankingIndice(e.target.value)} className="w-full">
                {RANKING_INDICES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </FilterSelect>
            </FilterField>
            <div className="mt-3 flex flex-col gap-2">
              {ranking.map((r, idx) => (
                <div key={idx} onClick={() => setModalRow(r)}
                  className="bg-secondary/20 border border-border rounded-xl p-3 cursor-pointer transition-all hover:bg-destructive/5 hover:border-destructive/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono text-sm font-bold text-neon-red">#{idx + 1}</span>
                    <span className="font-mono text-sm font-bold text-neon-red">{pct(safeNum((r as any)[rankingIndice]))}</span>
                  </div>
                  <div className="text-xs font-semibold">{normStr(r.Equipamento)}</div>
                  <div className="text-[10px] text-muted-foreground/60">{normStr(r.Rodovia)}</div>
                </div>
              ))}
            </div>
          </div>

          {rankingFinanceiro.length > 0 && (
            <RankingCard
              title="💸 Maiores Descontos"
              items={rankingFinanceiro.map(r => ({
                id: normStr(r.Equipamento),
                label: normStr(r.Equipamento),
                value: formatMoeda(r.Desconto),
                meta: `ID: ${pct(safeNum(r.ID))} • ${normStr(r.Rodovia)}`,
                onClick: () => setModalRow(r),
              }))}
            />
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog open={!!modalRow} onOpenChange={() => setModalRow(null)}>
        <DialogContent className="max-w-3xl bg-card border-border max-h-[90vh] overflow-y-auto">
          {modalRow && (() => {
            const ief = safeNum(modalRow.IEF);
            const icv = safeNum(modalRow.ICV);
            const idf = safeNum(modalRow.IDF);
            const id = safeNum(modalRow.ID);
            const perdas = modalRow._isGrouped && modalRow.ValorContratual ? calcularPerdaPorSubIndice(modalRow) : null;
            const perdasMap: Record<string, { perda: number; contribuicao: number }> = {};
            perdas?.forEach(p => { perdasMap[p.nome] = { perda: p.perda, contribuicao: p.contribuicao }; });

            const iefComps = [
              { nome: 'ICId', val: safeNum(modalRow.ICId), desc: 'Captura de imagens diurnas' },
              { nome: 'ICIn', val: safeNum(modalRow.ICIn), desc: 'Captura de imagens noturnas' },
              { nome: 'IEVri', val: safeNum(modalRow.IEVri), desc: 'Envio/registro de imagens' },
              { nome: 'IEVdt', val: safeNum(modalRow.IEVdt), desc: 'Envio de registros no prazo' },
              { nome: 'ILPd', val: safeNum(modalRow.ILPd), desc: 'Leitura de placas diurna' },
              { nome: 'ILPn', val: safeNum(modalRow.ILPn), desc: 'Leitura de placas noturna' },
            ];

            return (
              <>
                <DialogHeader>
                  <DialogTitle>{normStr(modalRow.Equipamento)} - {normStr(modalRow.Faixa)}</DialogTitle>
                  <p className="text-sm text-muted-foreground">{normStr(modalRow.Rodovia)} • Km {fmt(safeNum(modalRow.Km), 3)}</p>
                </DialogHeader>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="bg-secondary/20 rounded-xl p-4 border border-border">
                    <h4 className="text-sm font-bold mb-3">Componentes do IEF</h4>
                    <div className="space-y-3">
                      {iefComps.map(c => {
                        const st = getStatusColor(c.val, meta);
                        const w = c.val !== null ? Math.min(c.val * 100, 100) : 0;
                        const perdaInfo = perdasMap[c.nome];
                        return (
                          <div key={c.nome} className="bg-secondary/20 rounded-lg p-3 border border-border">
                            <div className="flex justify-between items-center mb-1">
                              <strong className="text-xs">{c.nome}</strong>
                              <div className="text-right">
                                <span className="text-sm font-mono">{pct(c.val)}</span>
                                {perdaInfo && perdaInfo.perda > 0 && (
                                  <div className="text-[10px] text-neon-red">-{formatMoeda(perdaInfo.perda)}/mês</div>
                                )}
                              </div>
                            </div>
                            <div className="h-1.5 bg-secondary/30 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full bg-${st.color}`} style={{ width: `${w}%` }} />
                            </div>
                            <div className="text-[10px] text-muted-foreground/60 mt-1">{c.desc}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-secondary/20 rounded-xl p-4 border border-border">
                      <h4 className="text-sm font-bold mb-3">Índices Principais</h4>
                      {[
                        { nome: 'IEF', val: ief, desc: 'Eficiência leitura e envio' },
                        { nome: 'ICV', val: icv, desc: 'Classificação de veículos' },
                        { nome: 'IDF', val: idf, desc: 'Disponibilidade operacional' },
                      ].map(idx => {
                        const st = getStatusColor(idx.val, meta);
                        return (
                          <div key={idx.nome} className="mb-3">
                            <div className="flex justify-between text-xs mb-1">
                              <strong>{idx.nome}</strong>
                              <span className="font-mono">{pct(idx.val)}</span>
                            </div>
                            <div className="h-1.5 bg-secondary/30 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full bg-${st.color}`}
                                style={{ width: `${idx.val !== null ? Math.min(idx.val * 100, 100) : 0}%` }} />
                            </div>
                            <div className="text-[10px] text-muted-foreground/60 mt-1">{idx.desc}</div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bg-secondary/20 rounded-xl p-4 border border-border">
                      <h4 className="text-sm font-bold mb-2">ID Final</h4>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs">Índice de Disponibilidade</span>
                        <span className="text-xl font-black font-mono">{pct(id)}</span>
                      </div>
                      <div className="h-2 bg-secondary/30 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full bg-${getStatusColor(id, meta).color}`}
                          style={{ width: `${id !== null ? Math.min(id * 100, 100) : 0}%` }} />
                      </div>
                      <div className="text-[10px] text-muted-foreground/60 mt-2">Meta: {(meta * 100).toFixed(0)}%</div>
                    </div>

                    {modalRow._isGrouped && modalRow.ValorContratual != null && (
                      <div className="bg-secondary/20 rounded-xl p-4 border border-border">
                        <h4 className="text-sm font-bold mb-3">💰 Impacto Financeiro</h4>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between"><span>Valor Contratual</span><span className="font-mono">{formatMoeda(modalRow.ValorContratual)}</span></div>
                          <div className="flex justify-between"><span>Valor a Receber</span><span className="font-mono text-neon-green">{formatMoeda(modalRow.ValorReceber)}</span></div>
                          <div className="flex justify-between border-t border-border pt-2">
                            <span className="font-bold">💸 Desconto</span>
                            <span className="font-mono font-bold text-neon-red text-base">{formatMoeda(modalRow.Desconto)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IndicesPage;
