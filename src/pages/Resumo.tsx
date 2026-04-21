import React, { useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useData } from '@/context/DataContext';
import { groupByEquipamento } from '@/lib/grouping';
import { EquipGroup } from '@/types';
import { pct, formatMoeda } from '@/lib/format';
import { motion } from 'framer-motion';
import { FileText, AlertTriangle, TrendingUp, CheckCircle2, AlertCircle, Info, Download } from 'lucide-react';

function severidade(id: number | null): { label: string; color: string; icon: React.ElementType } {
  if (id === null) return { label: 'Sem dados', color: 'text-muted-foreground', icon: Info };
  if (id >= 0.95) return { label: 'Ótimo', color: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle2 };
  if (id >= 0.85) return { label: 'Regular', color: 'text-amber-600 dark:text-amber-400', icon: AlertTriangle };
  return { label: 'Crítico', color: 'text-red-600 dark:text-red-400', icon: AlertCircle };
}

function gerarTextoMelhoria(g: EquipGroup): string[] {
  const linhas: string[] = [];
  const id = g.c_ID ?? 0;
  const idf = g.c_IDF ?? 0;
  const ief = g.c_IEF ?? 0;
  const icv = g.c_ICV ?? 0;
  const icid = g.c_ICId ?? 0;
  const icin = g.c_ICIn ?? 0;
  const ievri = g.c_IEVri ?? 0;
  const ievdt = g.c_IEVdt ?? 0;
  const ilpd = g.c_ILPd ?? 0;
  const ilpn = g.c_ILPn ?? 0;

  if (id >= 0.98) {
    linhas.push('✅ Equipamento com desempenho excelente. Manter as práticas atuais de manutenção e monitoramento.');
    return linhas;
  }

  if (idf < 0.95) {
    linhas.push(`⚠️ IDF em ${pct(idf)} — Disponibilidade reduzida. Verificar telemetria, manutenção preventiva, certificação INMETRO e conectividade. A melhoria deste índice impactaria o ID em +${pct(g.perdaIDF / g.valorTotal)} (recuperação de ${formatMoeda(g.perdaIDF)}).`);
  }

  if (icid < 0.85) {
    linhas.push(`📷 ICId em ${pct(icid)} — Qualidade de captura diurna baixa. Revisar alinhamento de câmera, limpeza de lente, foco, ângulo de captura e possíveis obstruções no campo de visão.`);
  }

  if (icin < 0.85) {
    linhas.push(`🌙 ICIn em ${pct(icin)} — Qualidade de captura noturna baixa. Verificar iluminação infravermelha, sensibilidade noturna da câmera, limpeza de lente e configuração de exposição.`);
  }

  if (ievri < 0.90) {
    linhas.push(`📤 IEVri em ${pct(ievri)} — Envio de registros de imagens abaixo do esperado. Verificar latência de conexão, processamento do servidor, fila de envio e possíveis falhas de rede.`);
  }

  if (ievdt < 0.90) {
    linhas.push(`📊 IEVdt em ${pct(ievdt)} — Envio de dados de tráfego insuficiente. Verificar conexão com servidor central, atrasos no processamento e integridade dos pacotes.`);
  }

  if (ilpd < 0.75) {
    linhas.push(`🔤 ILPd em ${pct(ilpd)} — Leitura de placas diurna deficiente. Revisar resolução de câmera, ângulo de captura, oclusões e condições de placas (sujas/danificadas).`);
  }

  if (ilpn < 0.75) {
    linhas.push(`🔤 ILPn em ${pct(ilpn)} — Leitura de placas noturna deficiente. Verificar iluminação IR, configuração de câmera para baixa luminosidade e ajuste de exposição.`);
  }

  if (icv < 1.0 && icv < 0.95) {
    linhas.push(`🚗 ICV em ${pct(icv)} — Classificação de veículos abaixo do ideal. Verificar configuração dos laços indutivos, sensores de classificação e parametrização do sistema.`);
  }

  if (ief < 0.90 && linhas.length === 0) {
    linhas.push(`📉 IEF em ${pct(ief)} — Eficiência geral do equipamento comprometida. Recomenda-se revisão completa dos sub-índices de captura e envio.`);
  }

  if (linhas.length === 0) {
    linhas.push('ℹ️ Equipamento com desempenho satisfatório, mas com margem para otimização. Monitorar tendências nos próximos períodos.');
  }

  // Best lever
  if (g.melhorAlavanca.perda > 0) {
    linhas.push(`💡 Maior alavanca de melhoria: ${g.melhorAlavanca.nome} — corrigir permitiria recuperar até ${formatMoeda(g.melhorAlavanca.perda)} no valor recebido.`);
  }

  return linhas;
}

export default function ResumoPage() {
  const { getActiveRecords, activePeriod } = useData();
  const records = getActiveRecords();
  const contentRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    if (!contentRef.current) return;
    const html2pdf = (await import('html2pdf.js')).default;
    
    // Temporarily add print-friendly styles
    const el = contentRef.current;
    el.style.background = 'white';
    el.style.color = '#111';
    el.style.padding = '20px';
    
    html2pdf()
      .set({
        margin: [8, 8, 8, 8],
        filename: `Relatorio_Executivo_${activePeriod || 'geral'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      })
      .from(el)
      .save()
      .then(() => {
        el.style.background = '';
        el.style.color = '';
        el.style.padding = '';
      });
  };



  const groups = useMemo(() => {
    if (!records.length) return [];
    return groupByEquipamento(records).sort((a, b) => (a.c_ID ?? 0) - (b.c_ID ?? 0));
  }, [records]);

  const stats = useMemo(() => {
    if (!groups.length) return null;
    const criticos = groups.filter(g => (g.c_ID ?? 0) < 0.85).length;
    const regulares = groups.filter(g => (g.c_ID ?? 0) >= 0.85 && (g.c_ID ?? 0) < 0.95).length;
    const otimos = groups.filter(g => (g.c_ID ?? 0) >= 0.95).length;
    const descontoTotal = groups.reduce((s, g) => s + g.descontoTotal, 0);
    return { criticos, regulares, otimos, descontoTotal };
  }, [groups]);

  if (!records.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileText className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-semibold text-foreground">Nenhum dado importado</h2>
        <p className="text-sm text-muted-foreground mt-1">Importe uma planilha de desempenho na página de Upload para visualizar o resumo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground">Relatório Executivo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Diagnóstico completo com recomendações de melhoria — Período: <span className="font-semibold text-foreground">{activePeriod || '—'}</span>
          </p>
        </motion.div>
        <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2">
          <Download className="w-4 h-4" />
          Exportar PDF
        </Button>
      </div>

      <div ref={contentRef}>
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Críticos', value: stats.criticos, color: 'text-red-600 dark:text-red-400' },
            { label: 'Regulares', value: stats.regulares, color: 'text-amber-600 dark:text-amber-400' },
            { label: 'Ótimos', value: stats.otimos, color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Desconto Total', value: formatMoeda(stats.descontoTotal), color: 'text-foreground' },
          ].map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {groups.map((g, i) => {
          const sev = severidade(g.c_ID);
          const SevIcon = sev.icon;
          const melhorias = gerarTextoMelhoria(g);

          return (
            <motion.div
              key={g.equipamento}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.5) }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <SevIcon className={`w-5 h-5 ${sev.color}`} />
                      <div>
                        <CardTitle className="text-sm font-bold font-mono">
                          {g.equipamento}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {g.rodovia} km {g.km} · {g.tipo} · {g.numFaixas} faixa(s) · Lote {g.lote || '—'}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className={`font-bold ${sev.color}`}>
                        ID {g.c_ID !== null ? pct(g.c_ID) : '—'} ({sev.label})
                      </span>
                      {g.descontoTotal > 0 && (
                        <span className="text-muted-foreground">
                          Desconto: <span className="font-semibold text-red-600 dark:text-red-400">{formatMoeda(g.descontoTotal)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Índices principais (compostos) */}
                  <div className="mb-3">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Índices Principais</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { k: 'ID', label: 'Desempenho', v: g.c_ID, threshold: 0.95 },
                        { k: 'IDF', label: 'Disponibilidade', v: g.c_IDF, threshold: 0.95 },
                        { k: 'IEF', label: 'Eficiência', v: g.c_IEF, threshold: 0.90 },
                        { k: 'ICV', label: 'Classif. Veículos', v: g.c_ICV, threshold: 0.95 },
                      ].map(idx => {
                        const bad = idx.v !== null && idx.v < idx.threshold;
                        return (
                          <div key={idx.k} className={`rounded-md border px-2.5 py-1.5 ${bad ? 'border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-900' : 'border-border bg-muted/40'}`}>
                            <div className="flex items-baseline justify-between gap-1">
                              <span className="text-[10px] font-semibold text-muted-foreground">{idx.k}</span>
                              <span className={`text-sm font-bold font-mono ${bad ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                                {idx.v !== null ? pct(idx.v) : '—'}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-tight break-words">{idx.label}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Subíndices */}
                  <div className="mb-3">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Subíndices</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                      {[
                        { k: 'ICId', label: 'Captura Diurna', v: g.c_ICId, threshold: 0.85 },
                        { k: 'ICIn', label: 'Captura Noturna', v: g.c_ICIn, threshold: 0.85 },
                        { k: 'IEVri', label: 'Envio Imagens', v: g.c_IEVri, threshold: 0.90 },
                        { k: 'IEVdt', label: 'Envio Dados', v: g.c_IEVdt, threshold: 0.90 },
                        { k: 'ILPd', label: 'Leitura Placa Diurna', v: g.c_ILPd, threshold: 0.75 },
                        { k: 'ILPn', label: 'Leitura Placa Noturna', v: g.c_ILPn, threshold: 0.75 },
                      ].map(idx => {
                        const bad = idx.v !== null && idx.v < idx.threshold;
                        return (
                          <div key={idx.k} className={`rounded-md border px-2 py-1 ${bad ? 'border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-900' : 'border-border bg-muted/30'}`}>
                            <div className="flex items-baseline justify-between gap-1">
                              <span className="text-[10px] font-semibold text-muted-foreground">{idx.k}</span>
                              <span className={`text-xs font-bold font-mono ${bad ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                                {idx.v !== null ? pct(idx.v) : '—'}
                              </span>
                            </div>
                            <p className="text-[9px] text-muted-foreground leading-tight break-words">{idx.label}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Maior causa do baixo aproveitamento */}
                  {g.melhorAlavanca.perda > 0 && (
                    <div className="mb-3 rounded-md border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-[10px] uppercase tracking-wide font-bold text-amber-700 dark:text-amber-300">
                            Principal causa do baixo aproveitamento
                          </p>
                          <p className="text-xs text-foreground mt-0.5">
                            <span className="font-bold font-mono">{g.melhorAlavanca.nome}</span> é o índice que mais impacta negativamente o desempenho deste equipamento.
                            Corrigi-lo permitiria recuperar até <span className="font-bold text-amber-700 dark:text-amber-300">{formatMoeda(g.melhorAlavanca.perda)}</span> no valor recebido.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recommendations text */}
                  <div className="space-y-1.5 border-t border-border pt-3">
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Recomendações de Melhoria
                    </p>
                    {melhorias.map((texto, j) => (
                      <p key={j} className="text-xs text-muted-foreground leading-relaxed pl-5">
                        {texto}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
