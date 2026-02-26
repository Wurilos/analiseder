import React, { useState, useMemo, useCallback } from 'react';
import { Download, Settings, Eye, BarChart3, ListChecks, AlertTriangle, TrendingDown, DollarSign, Receipt, BadgeDollarSign, Percent, FileText, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UploadCard } from '@/components/UploadCard';
import { KPIGrid, KPICard } from '@/components/KPIGrid';
import { FiltersBar, FilterField, FilterSelect, FilterInput } from '@/components/FiltersBar';
import { StatusTag } from '@/components/StatusTag';
import { PaginationBar } from '@/components/PaginationBar';
import { RankingCard } from '@/components/RankingCard';
import { IndicesRow, ViewMode, DashboardMode, ExcecaoCobrancaConfig } from '@/types';
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
  const [excecoes, setExcecoes] = useState<Record<string, ExcecaoCobrancaConfig>>({});
  const [showExcecoes, setShowExcecoes] = useState(false);
  const [showValores, setShowValores] = useState(false);

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

  // Helper: get maior problema display for table
  const getMaiorProblemaDisplay = (r: IndicesRow) => {
    if (r._isGrouped && r.MaiorProblema) {
      const prob = r.MaiorProblema;
      if (prob.nome === 'Nenhum') return { text: 'OK', severity: 'ok' as const };
      return {
        text: `${prob.nome} (${pct(prob.valor)}, Gap: ${prob.gap.toFixed(1)}%)`,
        severity: prob.severidade,
      };
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

  if (raw.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-black text-primary mb-2">Dashboard ID - Análise de Índices</h1>
          <p className="text-sm text-muted-foreground">Mapeamento fixo de colunas</p>
        </div>
        <UploadCard
          title="Arraste sua planilha aqui (ou clique)"
          description="Mapeamento: ICId=W, ICIn=AA, IEVri=AG, IEVdt=AN, ILPd=AQ, ILPn=AT, IEF=AU, ICV=AX, IDF=BC, ID=BD"
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

    // Principais Problemas
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

    // Maiores Custos
    const maioresCustos = [...comValor]
      .filter(r => r.Desconto && r.Desconto > 0)
      .sort((a, b) => (b.Desconto || 0) - (a.Desconto || 0))
      .slice(0, 10);

    // Perdas Totais por Sub-Índice
    const perdasTotais: Record<string, number> = {};
    comValor.forEach(equip => {
      const perdas = calcularPerdaPorSubIndice(equip);
      if (perdas) {
        perdas.forEach(p => {
          perdasTotais[p.nome] = (perdasTotais[p.nome] || 0) + p.perda;
        });
      }
    });
    const perdasOrdenadas = Object.entries(perdasTotais)
      .sort((a, b) => b[1] - a[1])
      .filter(([_, v]) => v > 0);
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
          <h1 className="text-2xl font-extrabold text-primary">Visão Executiva</h1>
          <Button variant="outline" size="sm" onClick={() => setDashboardMode('detalhado')}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Visão Detalhada
          </Button>
        </div>

        {/* Resumo Visual Grande */}
        <div className="card-glass rounded-2xl p-10 mb-6 text-center">
          <h2 className="text-3xl font-black text-primary mb-8">Resumo Executivo</h2>
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
              <div className="text-5xl font-black font-mono text-primary">{execData.length}</div>
              <div className="text-xs text-muted-foreground/60 mt-2">
                {viewMode === 'equipamento' ? 'equipamentos agrupados' : 'faixas monitoradas'}
              </div>
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
          {/* Equipamentos Críticos */}
          <div className="card-glass rounded-2xl p-6">
            <h3 className="text-lg font-bold text-destructive mb-4">Equipamentos Críticos</h3>
            {criticos.length === 0 ? (
              <div className="text-sm text-neon-green">Nenhum equipamento crítico!</div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto scrollbar-thin space-y-2">
                {criticos.slice(0, 10).map((r, i) => (
                  <div key={i} onClick={() => setModalRow(r)}
                    className="p-3 bg-neon-red/5 border-l-[3px] border-neon-red rounded-md cursor-pointer hover:bg-neon-red/10 transition-colors">
                    <div className="flex justify-between mb-1">
                      <strong className="text-xs">{normStr(r.Equipamento)}</strong>
                      <span className="font-mono text-neon-red font-bold text-xs">{pct(safeNum(r.ID))}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground/60">{normStr(r.Rodovia)} · Km {fmt(safeNum(r.Km), 1)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Principais Problemas */}
          <div className="card-glass rounded-2xl p-6">
            <h3 className="text-lg font-bold text-neon-amber mb-4">Principais Problemas</h3>
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

          {/* Maiores Custos */}
          {comValor.length > 0 && (
            <div className="card-glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-neon-purple mb-4">Maiores Custos</h3>
              <div className="max-h-[300px] overflow-y-auto scrollbar-thin space-y-2">
                {maioresCustos.map((r, i) => (
                  <div key={i} onClick={() => setModalRow(r)}
                    className="p-3 bg-neon-purple/5 border-l-[3px] border-neon-purple rounded-md cursor-pointer hover:bg-neon-purple/10 transition-colors">
                    <div className="flex justify-between mb-1">
                      <strong className="text-xs">{normStr(r.Equipamento)}</strong>
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
          <h3 className="text-lg font-bold mb-5">Distribuição de Status</h3>
          <div className="grid grid-cols-3 gap-5">
            <div className="bg-neon-green/10 border border-neon-green/30 rounded-xl p-5 text-center">
              <div className="text-4xl font-black text-neon-green">{ok}</div>
              <div className="text-sm text-muted-foreground mt-2">OK (&gt;{(meta * 100 + 8).toFixed(0)}%)</div>
              <div className="text-xs text-muted-foreground/60 mt-1">{total > 0 ? ((ok / total) * 100).toFixed(1) : 0}% do total</div>
            </div>
            <div className="bg-neon-amber/10 border border-neon-amber/30 rounded-xl p-5 text-center">
              <div className="text-4xl font-black text-neon-amber">{atencao}</div>
              <div className="text-sm text-muted-foreground mt-2">Atenção ({(meta * 100).toFixed(0)}-{(meta * 100 + 8).toFixed(0)}%)</div>
              <div className="text-xs text-muted-foreground/60 mt-1">{total > 0 ? ((atencao / total) * 100).toFixed(1) : 0}% do total</div>
            </div>
            <div className="bg-neon-red/10 border border-neon-red/30 rounded-xl p-5 text-center">
              <div className="text-4xl font-black text-neon-red">{criticos.length}</div>
              <div className="text-sm text-muted-foreground mt-2">Crítico (&lt;{(meta * 100).toFixed(0)}%)</div>
              <div className="text-xs text-muted-foreground/60 mt-1">{total > 0 ? ((criticos.length / total) * 100).toFixed(1) : 0}% do total</div>
            </div>
          </div>
        </div>

        {/* Perdas Totais por Sub-Índice */}
        <div className="card-glass rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-2">Perdas Totais por Sub-Índice</h3>
          <p className="text-xs text-muted-foreground/60 mb-4">Somatória das perdas de todos os equipamentos agrupadas por índice</p>
          
          <div className="bg-neon-amber/10 border-l-4 border-neon-amber p-3 rounded-r-md mb-4">
            <div className="text-xs font-semibold text-neon-amber mb-1">IMPORTANTE: Interpretação Correta</div>
            <div className="text-[11px] text-muted-foreground leading-relaxed">
              Este total (soma das perdas individuais) é diferente do Desconto Total porque cada perda é calculada simulando "se APENAS este índice fosse 100%".
              Como os índices são interdependentes, a soma das melhorias individuais não é aditiva. Use estes valores para priorizar ações.
            </div>
          </div>

          {comValor.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">Ative o modo "Por Equipamento" e configure valores contratuais</div>
          ) : perdasOrdenadas.length === 0 ? (
            <div className="text-sm text-neon-green text-center py-4">Nenhuma perda identificada! Todos os índices estão em 100%!</div>
          ) : (
            <>
              <div className="space-y-4">
                {perdasOrdenadas.map(([indice, perda], idx) => {
                  const cor = perda > 5000 ? 'neon-red' : perda > 2000 ? 'neon-amber' : perda > 500 ? 'primary' : 'neon-green';
                  const largura = (perda / maxPerda) * 100;
                  const perdaAnual = perda * 12;
                  return (
                    <div key={indice}>
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <div className="text-sm font-bold">{indice}</div>
                          <div className="text-[11px] text-muted-foreground/60">{INDICE_SHORT_LABELS[indice] || indice}</div>
                        </div>
                        <div className="text-right">
                          <div className={`font-mono font-bold text-lg text-${cor}`}>{formatMoeda(perda)}</div>
                          <div className="text-[10px] text-muted-foreground/60">R$ {(perdaAnual / 1000).toFixed(1)}k/ano</div>
                        </div>
                      </div>
                      <div className="h-8 bg-secondary/30 rounded-full overflow-hidden">
                        <div className={`h-full bg-${cor} rounded-full transition-all duration-1000`} style={{ width: `${largura}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total */}
              <div className="mt-6 p-4 bg-neon-purple/10 border-2 border-neon-purple/30 rounded-xl">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <strong className="text-base">Soma das Perdas Potenciais</strong>
                    <div className="text-[10px] text-muted-foreground mt-1">Se todos os índices fossem melhorados para 100%</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-black text-2xl text-neon-purple">{formatMoeda(totalGeralPerdas)}</div>
                    <div className="text-xs text-muted-foreground/60">R$ {((totalGeralPerdas * 12) / 1000).toFixed(1)}k por ano</div>
                  </div>
                </div>
                <div className="pt-3 border-t border-border space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Desconto Total Real (atual):</span>
                    <span className="font-mono font-bold text-neon-red">{formatMoeda(descontoTotalReal)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Diferença (sobreposição):</span>
                    <span className="font-mono font-bold text-neon-amber">{formatMoeda(totalGeralPerdas - descontoTotalReal)}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground/60 mt-2 italic">
                    * A diferença ocorre porque as perdas individuais são calculadas isoladamente e há interdependência entre os índices.
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Detailed view
  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-primary">Dashboard ID - Análise de Índices</h1>
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
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase">Maior Problema</th>
                    {viewMode === 'equipamento' && (
                      <th className="px-3 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase">Desconto</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r, i) => {
                    const id = safeNum(r.ID);
                    const st = getStatusColor(id, meta);
                    const prob = getMaiorProblemaDisplay(r);
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
                        <td className="px-3 py-2.5">
                          {prob.text === '—' || prob.text === 'OK' ? (
                            <span className="text-xs text-neon-green font-medium">{prob.text === 'OK' ? '✅ OK' : '—'}</span>
                          ) : (
                            <StatusTag color={getSeverityColor(prob.severity)} className="text-[10px]">{prob.text}</StatusTag>
                          )}
                        </td>
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
              <h3 className="text-sm font-bold text-destructive">Piores Valores</h3>
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
                  <div className="text-xs font-semibold">{normStr(r.Equipamento)} - {normStr(r.Faixa)}</div>
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
                label: normStr(r.Equipamento),
                value: formatMoeda(r.Desconto),
                meta: `ID: ${pct(safeNum(r.ID))} · ${normStr(r.Rodovia)}`,
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
            const nht = safeNum(modalRow.NHt);
            const nho = safeNum(modalRow.NHo);
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

            // Impact analysis
            const tipo = normStr(modalRow.Tipo);
            const isCEV = /CEV/i.test(tipo);
            const pesoIEF = isCEV ? 0.9 : 0.7;
            const impactos = ief !== null && icv !== null && idf !== null ? [
              { nome: 'IDF', perda: (1 - idf) * 100, valor: idf, desc: 'Disponibilidade operacional (horas)' },
              { nome: 'IEF', perda: (1 - ief) * pesoIEF * 100, valor: ief, desc: 'Eficiência dos equipamentos' },
              { nome: 'ICV', perda: (1 - icv) * 0.1 * 100, valor: icv, desc: 'Classificação de veículos' },
            ].sort((a, b) => b.perda - a.perda) : null;

            return (
              <>
                <DialogHeader>
                  <DialogTitle>{normStr(modalRow.Equipamento)} - {normStr(modalRow.Faixa)}</DialogTitle>
                  <p className="text-sm text-muted-foreground">{normStr(modalRow.Rodovia)} · Km {fmt(safeNum(modalRow.Km), 3)}</p>
                  <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                    <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-neon-red mr-1" />Crítico (&lt; meta)</span>
                    <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-neon-amber mr-1" />Atenção</span>
                    <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-neon-green mr-1" />OK</span>
                  </div>
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
                                {perdaInfo && perdaInfo.perda > 0 && c.val !== null && c.val < 1.0 && (
                                  <div className="text-[10px] text-muted-foreground">
                                    Gap: {((1 - c.val) * 100).toFixed(1)}% · Contrib: {perdaInfo.contribuicao.toFixed(1)}%
                                  </div>
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
                        { nome: 'IEF', val: ief, desc: 'IEF combina eficiência de leitura de placas e envio/registro de imagens.' },
                        { nome: 'ICV', val: icv, desc: 'ICV vem de QVc/QVt (contagem de veículos válida vs total).' },
                        { nome: 'IDF', val: idf, desc: 'IDF vem de NHo/NHt (horas operacionais vs. horas previstas).', extra: nht !== null && nho !== null ? `NHo: ${nho.toFixed(0)}h / NHt: ${nht.toFixed(0)}h` : undefined },
                      ].map(idx => {
                        const st = getStatusColor(idx.val, meta);
                        return (
                          <div key={idx.nome} className="mb-3">
                            <div className="flex justify-between text-xs mb-1">
                              <strong>{idx.nome}</strong>
                              <div className="text-right">
                                <span className="font-mono">{pct(idx.val)}</span>
                                {idx.extra && <div className="text-[11px] text-muted-foreground mt-0.5">{idx.extra}</div>}
                              </div>
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

                    {/* Impact Analysis */}
                    {impactos && (
                      <div className="bg-secondary/20 rounded-xl p-4 border border-border">
                        <h4 className="text-sm font-bold mb-3">Análise de Impacto no ID</h4>
                        <div className="space-y-3">
                          {impactos.map((imp, idx) => {
                            const isTop = idx === 0 && imp.perda > 5;
                            const stColor = imp.perda > 20 ? 'neon-red' : imp.perda > 10 ? 'neon-amber' : 'neon-green';
                            return (
                              <div key={imp.nome} className={`bg-secondary/20 rounded-lg p-3 border ${isTop ? 'border-2 border-neon-red bg-neon-red/5' : 'border-border'}`}>
                                <div className="flex justify-between items-center mb-1">
                                  <strong className="text-xs">{imp.nome} {isTop ? '← MAIOR IMPACTO' : ''}</strong>
                                  <span className="font-mono text-xs">-{imp.perda.toFixed(1)} pontos</span>
                                </div>
                                <div className="h-1.5 bg-secondary/30 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full bg-${stColor}`} style={{ width: `${Math.min(imp.perda, 100)}%` }} />
                                </div>
                                <div className="text-[10px] text-muted-foreground/60 mt-1">
                                  {imp.desc} · Valor atual: {pct(imp.valor)}
                                  {isTop && imp.perda > 10 && (
                                    <span className="block font-semibold mt-1">Priorize a melhoria deste índice para aumentar o ID!</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="text-[10px] text-muted-foreground/60 mt-2">
                          Mostra quanto cada índice está reduzindo o ID final. Quanto maior o impacto, mais prioritário é melhorar esse índice.
                        </div>
                      </div>
                    )}

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
                        <h4 className="text-sm font-bold mb-3">Impacto Financeiro</h4>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span>Equipamento / Tipo / Faixas</span>
                            <span className="font-mono">{modalRow.Equipamento} / {normStr(modalRow.Tipo)} / {modalRow.NumFaixas} faixas</span>
                          </div>
                          <div className="flex justify-between"><span>Valor Contratual</span><span className="font-mono">{formatMoeda(modalRow.ValorContratual)}</span></div>
                          <div className="flex justify-between"><span>Valor a Receber</span><span className="font-mono text-neon-green">{formatMoeda(modalRow.ValorReceber)}</span></div>
                          <div className="flex justify-between border-t border-border pt-2">
                            <span className="font-bold">Desconto</span>
                            <span className="font-mono font-bold text-neon-red text-base">{formatMoeda(modalRow.Desconto)}</span>
                          </div>
                          {modalRow.Desconto != null && modalRow.Desconto > 0 && (
                            <div className="text-[10px] text-muted-foreground/60 mt-1">
                              {(() => {
                                const economia = (modalRow.Desconto || 0) - ((modalRow.ValorContratual || 0) * (1 - meta));
                                return economia > 0
                                  ? `Melhore o ID para ${(meta * 100).toFixed(0)}% e economize ${formatMoeda(economia)}/mês`
                                  : 'Equipamento acima da meta!';
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {!modalRow._isGrouped && (
                      <div className="bg-secondary/20 rounded-xl p-4 border border-border">
                        <h4 className="text-sm font-bold mb-2">Impacto Financeiro</h4>
                        <div className="text-xs text-muted-foreground">Ative o modo "Por Equipamento" para ver análise financeira</div>
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
