import React, { useState, useMemo, useCallback } from 'react';
import { Download, Eye, BarChart3, ListChecks, AlertTriangle, TrendingDown, DollarSign, Receipt, BadgeDollarSign, Percent, ArrowLeft } from 'lucide-react';
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
import { getEquipInfo, equipLabel, equipLabelFull, getValorEquip } from '@/lib/equip-catalog';
import { calcGainPotential, getRecommendations } from '@/lib/recommendations';
import {
  parseIndicesFile, groupIndicesByEquipment, exportIndicesExcel,
  calcularPerdaPorSubIndice, identificarMaiorProblema,
} from '@/lib/indices-utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as RechartsRadar, Legend,
} from 'recharts';

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

  // Chart data
  const distributionData = useMemo(() => {
    const bins = ['0-0.1', '0.1-0.2', '0.2-0.3', '0.3-0.4', '0.4-0.5', '0.5-0.6', '0.6-0.7', '0.7-0.8', '0.8-0.9', '0.9-1.0'];
    const thresholds = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.01];
    const counts = new Array(10).fill(0);
    filtered.forEach(r => {
      const id = safeNum(r.ID);
      if (id === null) return;
      for (let i = 0; i < 10; i++) {
        if (id >= thresholds[i] && id < thresholds[i + 1]) { counts[i]++; break; }
      }
    });
    return bins.map((name, i) => ({
      name,
      count: counts[i],
      fill: i < 6 ? '#ef4444' : i < 8 ? '#f59e0b' : '#10b981',
    }));
  }, [filtered]);

  const radarData = useMemo(() => {
    const tiposUniq = [...new Set(filtered.map(r => normStr(r.Tipo)).filter(Boolean))];
    const fields = ['IDF', 'IEF', 'ICV', 'ICId', 'ICIn', 'IEVri', 'IEVdt'] as const;
    return fields.map(f => {
      const entry: any = { subject: f };
      tiposUniq.forEach(tipo => {
        const recs = filtered.filter(r => normStr(r.Tipo) === tipo);
        const vals = recs.map(r => safeNum(r[f])).filter((v): v is number => v !== null);
        entry[tipo] = vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(3) : 0;
      });
      return entry;
    });
  }, [filtered]);

  const topEquipData = useMemo(() => {
    const byEquip: Record<string, { sum: number; cnt: number }> = {};
    filtered.forEach(r => {
      const k = normStr(r.Equipamento);
      if (!byEquip[k]) byEquip[k] = { sum: 0, cnt: 0 };
      const id = safeNum(r.ID);
      if (id !== null) { byEquip[k].sum += id; byEquip[k].cnt++; }
    });
    return Object.entries(byEquip)
      .map(([k, v]) => ({ name: equipLabel(k), avg: v.cnt ? +(v.sum / v.cnt).toFixed(4) : 0 }))
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 20);
  }, [filtered]);

  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleChangeMeta = () => {
    const v = prompt('Meta do ID (ex: 0.80):', meta.toFixed(2));
    const n = Number((v || '').replace(',', '.'));
    if (Number.isFinite(n) && n > 0 && n < 1) setMeta(n);
  };

  const getMaiorProblemaDisplay = (r: IndicesRow) => {
    if (r._isGrouped && r.MaiorProblema) {
      const prob = r.MaiorProblema;
      if (prob.nome === 'Nenhum') return { text: 'OK', severity: 'ok' as const };
      return { text: `${prob.nome} (${pct(prob.valor)}, Gap: ${prob.gap.toFixed(1)}%)`, severity: prob.severidade };
    }
    if (!r._isGrouped) {
      const ief = safeNum(r.IEF);
      const icv = safeNum(r.ICV);
      const idf = safeNum(r.IDF);
      if (ief !== null && icv !== null && idf !== null) {
        const tipo = normStr(r.Tipo);
        const isCEV = /CEV/i.test(tipo);
        const pesoIEF = isCEV ? 0.9 : 0.7;
        const impactos = [
          { nome: 'IDF', perda: (1 - idf) * 100 },
          { nome: 'IEF', perda: (1 - ief) * pesoIEF * 100 },
          { nome: 'ICV', perda: (1 - icv) * 0.1 * 100 },
        ].sort((a, b) => b.perda - a.perda);
        if (impactos[0].perda > 1) {
          return { text: `${impactos[0].nome} (-${impactos[0].perda.toFixed(0)}pts)`, severity: 'moderado' as const };
        }
        return { text: 'OK', severity: 'ok' as const };
      }
    }
    return { text: '—', severity: 'ok' as const };
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'critico': return 'red';
      case 'grave': return 'amber';
      case 'moderado': return 'cyan';
      case 'leve': return 'green';
      default: return 'green';
    }
  };

  const idBadgeClass = (v: number | null) => {
    if (v === null) return 'badge-slate';
    return v < 0.6 ? 'badge-red' : v < 0.85 ? 'badge-amber' : 'badge-green';
  };

  const tiposUniq = [...new Set(filtered.map(r => normStr(r.Tipo)).filter(Boolean))];
  const radarColors = ['#f59e0b', '#3b82f6', '#10b981', '#a855f7'];

  if (raw.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-4xl mb-4">📊</div>
          <h1 className="text-2xl font-display font-extrabold text-primary mb-2">Splice News - Analytics</h1>
          <p className="text-sm text-muted-foreground">Análise de Índices de Desempenho · Edital 145/2023</p>
        </div>
        <UploadCard
          title="Arraste sua planilha aqui (ou clique)"
          description="Planilha de Desempenho (ID) — VelocidadeFixo...xlsx"
          hint="Valores contratuais pré-cadastrados para cálculo financeiro automático"
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
    const total = execData.length;

    const problemas: Record<string, number> = {};
    execData.forEach(r => {
      const ief = safeNum(r.IEF);
      const icv = safeNum(r.ICV);
      const idf = safeNum(r.IDF);
      if (ief !== null && ief < 0.85) problemas['IEF'] = (problemas['IEF'] || 0) + 1;
      if (icv !== null && icv < 0.95) problemas['ICV'] = (problemas['ICV'] || 0) + 1;
      if (idf !== null && idf < 0.85) problemas['IDF'] = (problemas['IDF'] || 0) + 1;
    });
    const problemasArray = Object.entries(problemas).sort((a, b) => b[1] - a[1]);

    const maioresCustos = [...comValor]
      .filter(r => r.Desconto && r.Desconto > 0)
      .sort((a, b) => (b.Desconto || 0) - (a.Desconto || 0))
      .slice(0, 10);

    const perdasTotais: Record<string, number> = {};
    comValor.forEach(equip => {
      const perdas = calcularPerdaPorSubIndice(equip);
      if (perdas) perdas.forEach(p => { perdasTotais[p.nome] = (perdasTotais[p.nome] || 0) + p.perda; });
    });
    const perdasOrdenadas = Object.entries(perdasTotais).sort((a, b) => b[1] - a[1]).filter(([_, v]) => v > 0);
    const maxPerda = perdasOrdenadas.length > 0 ? perdasOrdenadas[0][1] : 1;
    const totalGeralPerdas = perdasOrdenadas.reduce((sum, [_, v]) => sum + v, 0);
    const descontoTotalReal = comValor.reduce((sum, r) => {
      const id = safeNum(r.ID);
      const valor = r.ValorContratual;
      if (id !== null && valor) return sum + (valor * (1 - id));
      return sum;
    }, 0);

    const descProblema: Record<string, string> = {
      IEF: 'Eficiência dos equipamentos',
      ICV: 'Classificação de veículos',
      IDF: 'Disponibilidade operacional',
    };

    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-display font-extrabold text-primary">Visão Executiva</h1>
          <Button variant="outline" size="sm" onClick={() => setDashboardMode('detalhado')}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Visão Detalhada
          </Button>
        </div>

        {/* Resumo Visual Grande */}
        <div className="card-glass rounded-2xl p-10 mb-6 text-center">
          <h2 className="text-3xl font-display font-extrabold text-primary mb-8">Resumo Executivo</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3">ID Médio Geral</div>
              <div className={`text-5xl font-black font-mono ${execAvg !== null && execAvg >= meta ? 'text-neon-green' : 'text-neon-red'}`}>
                {execAvg !== null ? pct(execAvg) : '—'}
              </div>
              <div className="text-xs text-muted-foreground/60 mt-2">meta: {(meta * 100).toFixed(0)}%</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Equipamentos</div>
              <div className="text-5xl font-black font-mono text-neon-blue">{execData.length}</div>
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

        {/* Cards de Atenção */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          <div className="card-glass rounded-2xl p-6">
            <h3 className="text-lg font-display font-bold text-neon-red mb-4">Equipamentos Críticos</h3>
            {criticos.length === 0 ? (
              <div className="text-sm text-neon-green">Nenhum equipamento crítico!</div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto scrollbar-thin space-y-2">
                {criticos.slice(0, 10).map((r, i) => (
                  <div key={i} onClick={() => setModalRow(r)}
                    className="p-3 bg-neon-red/5 border-l-[3px] border-neon-red rounded-md cursor-pointer hover:bg-neon-red/10 transition-colors">
                    <div className="flex justify-between mb-1">
                      <strong className="text-xs">{equipLabel(normStr(r.Equipamento))}</strong>
                      <span className="font-mono text-neon-red font-bold text-xs">{pct(safeNum(r.ID))}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground/60">{normStr(r.Rodovia)} · Km {fmt(safeNum(r.Km), 1)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card-glass rounded-2xl p-6">
            <h3 className="text-lg font-display font-bold text-neon-amber mb-4">Principais Problemas</h3>
            {problemasArray.length === 0 ? (
              <div className="text-sm text-neon-green">Todos os índices estão saudáveis!</div>
            ) : (
              <div className="space-y-3">
                {problemasArray.map(([nome, qtd]) => (
                  <div key={nome} className="p-3 bg-neon-amber/5 border-l-[3px] border-neon-amber rounded-md">
                    <div className="flex justify-between mb-1">
                      <strong className="text-sm">{nome}</strong>
                      <span className="font-mono text-neon-amber font-bold text-xs">{qtd} equip.</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground/60">
                      {descProblema[nome]} · {total > 0 ? ((qtd / total) * 100).toFixed(1) : 0}% do total
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {comValor.length > 0 && (
            <div className="card-glass rounded-2xl p-6">
              <h3 className="text-lg font-display font-bold text-neon-purple mb-4">Maiores Custos</h3>
              <div className="max-h-[300px] overflow-y-auto scrollbar-thin space-y-2">
                {maioresCustos.map((r, i) => (
                  <div key={i} onClick={() => setModalRow(r)}
                    className="p-3 bg-neon-purple/5 border-l-[3px] border-neon-purple rounded-md cursor-pointer hover:bg-neon-purple/10 transition-colors">
                    <div className="flex justify-between mb-1">
                      <strong className="text-xs">{equipLabel(normStr(r.Equipamento))}</strong>
                      <span className="font-mono text-neon-purple font-bold text-xs">{formatMoeda(r.Desconto)}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground/60">ID: {pct(safeNum(r.ID))} · {normStr(r.Rodovia)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Distribuição de Status */}
        <div className="card-glass rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-display font-bold mb-5">Distribuição de Status</h3>
          <div className="grid grid-cols-3 gap-5">
            <div className="bg-neon-green/10 border border-neon-green/30 rounded-xl p-5 text-center">
              <div className="text-4xl font-black text-neon-green">{ok}</div>
              <div className="text-sm text-muted-foreground mt-2">OK (&gt;{(meta * 100 + 8).toFixed(0)}%)</div>
              <div className="text-xs text-muted-foreground/60 mt-1">{total > 0 ? ((ok / total) * 100).toFixed(1) : 0}%</div>
            </div>
            <div className="bg-neon-amber/10 border border-neon-amber/30 rounded-xl p-5 text-center">
              <div className="text-4xl font-black text-neon-amber">{atencao}</div>
              <div className="text-sm text-muted-foreground mt-2">Atenção</div>
              <div className="text-xs text-muted-foreground/60 mt-1">{total > 0 ? ((atencao / total) * 100).toFixed(1) : 0}%</div>
            </div>
            <div className="bg-neon-red/10 border border-neon-red/30 rounded-xl p-5 text-center">
              <div className="text-4xl font-black text-neon-red">{criticos.length}</div>
              <div className="text-sm text-muted-foreground mt-2">Crítico (&lt;{(meta * 100).toFixed(0)}%)</div>
              <div className="text-xs text-muted-foreground/60 mt-1">{total > 0 ? ((criticos.length / total) * 100).toFixed(1) : 0}%</div>
            </div>
          </div>
        </div>

        {/* Perdas Totais por Sub-Índice */}
        {comValor.length > 0 && perdasOrdenadas.length > 0 && (
          <div className="card-glass rounded-2xl p-6">
            <h3 className="text-lg font-display font-bold mb-2">Perdas Totais por Sub-Índice</h3>
            <p className="text-xs text-muted-foreground/60 mb-4">Somatória das perdas agrupadas por índice</p>
            <div className="space-y-4">
              {perdasOrdenadas.map(([indice, perda]) => {
                const largura = (perda / maxPerda) * 100;
                const perdaAnual = perda * 12;
                const cor = perda > 5000 ? 'bg-neon-red' : perda > 2000 ? 'bg-neon-amber' : perda > 500 ? 'bg-primary' : 'bg-neon-green';
                return (
                  <div key={indice}>
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <div className="text-sm font-bold">{indice}</div>
                        <div className="text-[11px] text-muted-foreground/60">{INDICE_SHORT_LABELS[indice] || indice}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-lg">{formatMoeda(perda)}</div>
                        <div className="text-[10px] text-muted-foreground/60">R$ {(perdaAnual / 1000).toFixed(1)}k/ano</div>
                      </div>
                    </div>
                    <div className="h-8 bg-secondary/30 rounded-full overflow-hidden">
                      <div className={`h-full ${cor} rounded-full transition-all duration-1000`} style={{ width: `${largura}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 p-4 bg-neon-purple/10 border-2 border-neon-purple/30 rounded-xl">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <strong className="text-base">Soma das Perdas Potenciais</strong>
                  <div className="text-[10px] text-muted-foreground mt-1">Se todos os índices fossem 100%</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-black text-2xl text-neon-purple">{formatMoeda(totalGeralPerdas)}</div>
                  <div className="text-xs text-muted-foreground/60">R$ {((totalGeralPerdas * 12) / 1000).toFixed(1)}k/ano</div>
                </div>
              </div>
              <div className="pt-3 border-t border-border space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Desconto Total Real:</span>
                  <span className="font-mono font-bold text-neon-red">{formatMoeda(descontoTotalReal)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Diferença (sobreposição):</span>
                  <span className="font-mono font-bold text-neon-amber">{formatMoeda(totalGeralPerdas - descontoTotalReal)}</span>
                </div>
              </div>
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
          <h1 className="text-2xl font-display font-extrabold text-primary">Dashboard Geral</h1>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            Meta: <strong className="font-mono text-foreground">{meta.toFixed(2)}</strong>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleChangeMeta}>Alterar</Button>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="toggle-group-custom">
            <button className={`toggle-btn-custom ${viewMode === 'faixa' ? 'active' : ''}`}
              onClick={() => { setViewMode('faixa'); setPage(0); }}>Por Faixa</button>
            <button className={`toggle-btn-custom ${viewMode === 'equipamento' ? 'active' : ''}`}
              onClick={() => { setViewMode('equipamento'); setPage(0); }}>Por Equipamento</button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setDashboardMode('executivo')}>
            <Eye className="w-3.5 h-3.5 mr-1" /> Visão Executiva
          </Button>
          <Button size="sm" className="bg-neon-green text-background hover:bg-neon-green/80" onClick={() => exportIndicesExcel(filtered)}>
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="card-glass rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border font-display text-sm font-semibold">Distribuição do ID</div>
          <div className="p-4 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#7a8ba8', fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fill: '#7a8ba8', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#151b25', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, color: '#e8edf5' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {distributionData.map((entry, index) => (
                    <rect key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-glass rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border font-display text-sm font-semibold">Subíndices — Média por Tipo</div>
          <div className="p-4 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#7a8ba8', fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 1]} tick={{ fill: '#7a8ba8', fontSize: 9 }} />
                {tiposUniq.map((tipo, i) => (
                  <RechartsRadar key={tipo} name={tipo} dataKey={tipo}
                    stroke={radarColors[i % 4]} fill={radarColors[i % 4]} fillOpacity={0.15} />
                ))}
                <Legend wrapperStyle={{ fontSize: 11, color: '#7a8ba8' }} />
                <Tooltip contentStyle={{ background: '#151b25', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, color: '#e8edf5' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5 items-start">
        <div className="min-w-0">
          <div className="card-glass rounded-2xl p-5">
            <h3 className="text-base font-display font-bold mb-4">Ranking & Diagnóstico</h3>
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
                <FilterInput placeholder="Equipamento, série..." value={fSearch}
                  onChange={e => { setFSearch(e.target.value); setPage(0); }} />
              </FilterField>
            </FiltersBar>

            <div className="overflow-x-auto max-h-[500px] scrollbar-thin rounded-lg">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-secondary backdrop-blur-sm">
                    <th className="px-3 py-3 text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">#</th>
                    <th className="px-3 py-3 text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">Série</th>
                    <th className="px-3 py-3 text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">Equipamento</th>
                    <th className="px-3 py-3 text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                    <th className="px-3 py-3 text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">Faixa</th>
                    <th className="px-3 py-3 text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">Rodovia</th>
                    <th className="px-3 py-3 text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">IDF</th>
                    <th className="px-3 py-3 text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">IEF</th>
                    <th className="px-3 py-3 text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">ICV</th>
                    <th className="px-3 py-3 text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">ID</th>
                    <th className="px-3 py-3 text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">Causa Principal</th>
                    <th className="px-3 py-3 text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">Ganho Pot.</th>
                    {viewMode === 'equipamento' && (
                      <th className="px-3 py-3 text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">Desconto</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r, i) => {
                    const id = safeNum(r.ID);
                    const st = getStatusColor(id, meta);
                    const info = getEquipInfo(normStr(r.Equipamento));
                    const recos = getRecommendations(r);
                    const gain = calcGainPotential(r);
                    const mainProblem = recos[0];
                    const rowClass = id !== null ? (id < 0.6 ? 'row-critical' : id < 0.85 ? 'row-warn' : 'row-ok') : '';
                    return (
                      <tr key={i} onClick={() => setModalRow(r)}
                        className={`border-b border-border/50 cursor-pointer transition-colors hover:bg-white/[0.03] ${rowClass}`}>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{page * PAGE_SIZE + i + 1}</td>
                        <td className="px-3 py-2.5 font-mono text-xs font-bold text-primary">{info?.serie || '—'}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{normStr(r.Equipamento)}</td>
                        <td className="px-3 py-2.5">
                          <span className={`tag-${normStr(r.Tipo).toLowerCase()} text-[11px] px-2 py-0.5 rounded font-semibold inline-block`}>
                            {normStr(r.Tipo)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs">{r._isGrouped ? `${r.NumFaixas} fxs` : normStr(r.Faixa)}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{normStr(r.Rodovia)}</td>
                        <td className="px-3 py-2.5"><span className={`font-mono text-xs px-2 py-0.5 rounded inline-block ${idBadgeClass(safeNum(r.IDF))}`}>{pct(safeNum(r.IDF))}</span></td>
                        <td className="px-3 py-2.5"><span className={`font-mono text-xs px-2 py-0.5 rounded inline-block ${idBadgeClass(safeNum(r.IEF))}`}>{pct(safeNum(r.IEF))}</span></td>
                        <td className="px-3 py-2.5"><span className={`font-mono text-xs px-2 py-0.5 rounded inline-block ${idBadgeClass(safeNum(r.ICV))}`}>{pct(safeNum(r.ICV))}</span></td>
                        <td className="px-3 py-2.5"><span className={`font-mono text-xs px-2 py-0.5 rounded inline-block font-bold ${idBadgeClass(id)}`}>{id !== null ? pct(id) : '—'}</span></td>
                        <td className="px-3 py-2.5 text-[11px] max-w-[180px] overflow-hidden text-ellipsis" style={{
                          color: mainProblem?.priority === 'high' ? '#fca5a5' : mainProblem?.priority === 'medium' ? '#fbbf24' : '#94a3b8'
                        }}>
                          {mainProblem ? mainProblem.title.split(' — ')[0] : '✓ Bom desempenho'}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs text-neon-green">+{pct(gain.total_gap)}</td>
                        {viewMode === 'equipamento' && (
                          <td className="px-3 py-2.5 font-mono text-xs font-bold" style={{
                            color: (r.Desconto || 0) > 1000 ? '#fca5a5' : (r.Desconto || 0) > 300 ? '#fbbf24' : '#6ee7b7'
                          }}>
                            {r.Desconto != null ? formatMoeda(r.Desconto) : '—'}
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
        <div className="sticky top-5 space-y-4">
          <div className="card-glass rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-display font-bold text-neon-red">Piores Valores</h3>
            </div>
            <FilterField label="Índice">
              <FilterSelect value={rankingIndice} onChange={e => setRankingIndice(e.target.value)} className="w-full">
                {RANKING_INDICES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </FilterSelect>
            </FilterField>
            <div className="mt-3 flex flex-col gap-2">
              {ranking.map((r, idx) => (
                <div key={idx} onClick={() => setModalRow(r)}
                  className="bg-secondary/20 border border-border rounded-xl p-3 cursor-pointer transition-all hover:bg-neon-red/5 hover:border-neon-red/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono text-sm font-bold text-neon-amber">#{idx + 1}</span>
                    <span className={`font-mono text-sm font-bold px-2 py-0.5 rounded ${idBadgeClass(safeNum((r as any)[rankingIndice]))}`}>
                      {pct(safeNum((r as any)[rankingIndice]))}
                    </span>
                  </div>
                  <div className="text-xs font-semibold">{equipLabel(normStr(r.Equipamento))} - {normStr(r.Faixa)}</div>
                  <div className="text-[10px] text-muted-foreground/60">{normStr(r.Rodovia)} · Km {fmt(safeNum(r.Km), 1)}</div>
                </div>
              ))}
            </div>
          </div>

          {rankingFinanceiro.length > 0 && (
            <RankingCard
              title="Maiores Descontos"
              items={rankingFinanceiro.map(r => ({
                id: normStr(r.Equipamento),
                label: equipLabel(normStr(r.Equipamento)),
                value: formatMoeda(r.Desconto),
                meta: `ID: ${pct(safeNum(r.ID))} · ${normStr(r.Rodovia)}`,
                onClick: () => setModalRow(r),
              }))}
            />
          )}
        </div>
      </div>

      {/* Detail Modal — Tree Decomposition */}
      <Dialog open={!!modalRow} onOpenChange={() => setModalRow(null)}>
        <DialogContent className="max-w-3xl bg-card border-border max-h-[90vh] overflow-y-auto">
          {modalRow && (() => {
            const ief = safeNum(modalRow.IEF);
            const icv = safeNum(modalRow.ICV);
            const idf = safeNum(modalRow.IDF);
            const id = safeNum(modalRow.ID);
            const nht = safeNum(modalRow.NHt);
            const nho = safeNum(modalRow.NHo);
            const info = getEquipInfo(normStr(modalRow.Equipamento));
            const tipo = normStr(modalRow.Tipo).toUpperCase();
            const isCEV = /CEV|REV/i.test(tipo);
            const pesoIEF = isCEV ? 0.9 : 0.7;
            const gain = calcGainPotential(modalRow);
            const recos = getRecommendations(modalRow);

            const idColor = id !== null ? (id < 0.6 ? '#ef4444' : id < 0.85 ? '#f59e0b' : '#10b981') : '#94a3b8';
            const idfColor = idf !== null && idf < 0.95 ? '#f59e0b' : '#10b981';

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
                  <DialogTitle className="font-display">
                    {info ? `Nº ${info.serie} — ` : ''}{normStr(modalRow.Equipamento)} · {normStr(modalRow.Faixa)}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    {normStr(modalRow.Tipo)} · {normStr(modalRow.Rodovia)} km {fmt(safeNum(modalRow.Km), 3)}
                    {info ? ` · ${info.lote}` : ''}
                  </p>
                </DialogHeader>

                {/* Tree Decomposition */}
                <div className="mt-4">
                  <div className="tree-node">
                    <div className="flex items-center gap-3">
                      <div className="font-mono text-xl font-bold" style={{ color: idColor, minWidth: 60 }}>{pct(id)}</div>
                      <div>
                        <div className="font-semibold text-sm">ID — Índice de Desempenho</div>
                        <div className="text-xs text-muted-foreground">{tipo} → IDF × ({pesoIEF}×IEF + 0.1×ICV)</div>
                      </div>
                    </div>
                    <div className="tree-children">
                      {/* IDF */}
                      <div className="tree-child">
                        <div className="flex items-center gap-2">
                          <div className="font-mono text-sm font-semibold" style={{ color: idfColor, minWidth: 50 }}>{pct(idf)}</div>
                          <div>
                            <div className="text-[13px] font-medium">IDF — Disponibilidade de Faixa</div>
                            <div className="text-[11px] text-muted-foreground">
                              NHo/NHt = {nho !== null ? nho.toFixed(0) : '?'}/{nht !== null ? nht.toFixed(0) : '?'}h
                              {idf !== null && idf >= 0.95 ? ' → arred. para 1.00' : ''}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* IEF */}
                      <div className="tree-child">
                        <div className="flex items-center gap-2">
                          <div className="font-mono text-sm font-semibold" style={{ color: ief !== null && ief < 0.8 ? '#ef4444' : '#10b981', minWidth: 50 }}>{pct(ief)}</div>
                          <div>
                            <div className="text-[13px] font-medium">IEF — Eficiência</div>
                            <div className="text-[11px] text-muted-foreground">0.8×(ICId+ICIn)/2×(IEVri+IEVdt)/2 + 0.2×(ILPd+ILPn)/2</div>
                          </div>
                        </div>
                        <div className="tree-children">
                          {iefComps.map(c => {
                            const cv = c.val !== null ? (c.val < 0.5 ? '#ef4444' : c.val < 0.8 ? '#f59e0b' : '#10b981') : '#94a3b8';
                            return (
                              <div key={c.nome} className="tree-leaf">
                                <span className="font-mono text-muted-foreground" style={{ minWidth: 40 }}>{c.nome}</span>
                                <span className="font-mono font-semibold" style={{ color: cv }}>{pct(c.val)}</span>
                                <span className="text-muted-foreground/60 text-[10px]">{c.desc}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* ICV */}
                      <div className="tree-child">
                        <div className="flex items-center gap-2">
                          <div className="font-mono text-sm font-semibold" style={{ color: icv !== null && icv < 1.0 ? '#f59e0b' : '#10b981', minWidth: 50 }}>{pct(icv)}</div>
                          <div>
                            <div className="text-[13px] font-medium">ICV — Classificação de Veículos</div>
                            <div className="text-[11px] text-muted-foreground">QVc/QVt</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                {recos.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-display font-bold mb-3">Recomendações</h4>
                    <div className="space-y-2">
                      {recos.map((reco, i) => (
                        <div key={i} className={`rounded-lg p-3 border flex items-start gap-3 ${reco.priority === 'high' ? 'reco-high' : reco.priority === 'medium' ? 'reco-medium' : 'reco-low'}`}>
                          <span className="text-base flex-shrink-0 mt-0.5">
                            {reco.priority === 'high' ? '🔴' : reco.priority === 'medium' ? '🟡' : '🔵'}
                          </span>
                          <div>
                            <div className="text-[13px] font-semibold">{reco.title}</div>
                            <div className="text-xs text-muted-foreground mt-1">{reco.desc}</div>
                            {reco.gain && <div className="font-mono text-xs text-neon-green mt-1">{reco.gain}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gain Potential */}
                <div className="mt-4 p-4 bg-secondary rounded-xl border border-border">
                  <h4 className="text-sm font-display font-bold mb-3">Potencial de Melhoria</h4>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Se IDF=1</div>
                      <div className="font-mono text-sm font-bold text-neon-green">+{pct(gain.idf_gain)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Se IEF=1</div>
                      <div className="font-mono text-sm font-bold text-neon-green">+{pct(gain.ief_gain)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Se ICV=1</div>
                      <div className="font-mono text-sm font-bold text-neon-green">+{pct(gain.icv_gain)}</div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">ID máximo atingível</span>
                    <span className="font-mono font-bold text-neon-amber">{pct(gain.max_id)}</span>
                  </div>
                </div>

                {/* Financial Impact */}
                {modalRow._isGrouped && modalRow.ValorContratual != null && (
                  <div className="mt-4 p-4 bg-secondary rounded-xl border border-border">
                    <h4 className="text-sm font-display font-bold mb-3">Impacto Financeiro</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between"><span>Valor Contratual</span><span className="font-mono">{formatMoeda(modalRow.ValorContratual)}</span></div>
                      <div className="flex justify-between"><span>Valor a Receber</span><span className="font-mono text-neon-green">{formatMoeda(modalRow.ValorReceber)}</span></div>
                      <div className="flex justify-between border-t border-border pt-2">
                        <span className="font-bold">Desconto</span>
                        <span className="font-mono font-bold text-neon-red text-base">{formatMoeda(modalRow.Desconto)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IndicesPage;
