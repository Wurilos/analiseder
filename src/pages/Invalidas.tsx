import React, { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { EQUIP_CATALOG, equipLabel, equipLabelFull } from '@/lib/equip-catalog';
import { ClassRecord } from '@/types';
import { Dialog, DialogContent } from '@/components/ui/dialog';

function fmt(v: number | null, d = 3) {
  if (v === null || v === undefined || isNaN(v as number)) return '—';
  return Number(v).toFixed(d);
}
function pct(v: number) { return (v * 100).toFixed(1) + '%'; }
function idBadge(v: number | null) { if (v === null) return 'badge-slate'; return v < 0.6 ? 'badge-red' : v < 0.85 ? 'badge-amber' : 'badge-green'; }

const CAT_LABELS: Record<string, string> = {
  imagem: 'Imagem', enquadramento: 'Enquadramento', sinalizacao: 'Sinalização',
  ambiente: 'Ambiente', mudancaFaixa: 'Mudança de Faixa', maisUm: 'Mais de 1 Veíc.',
  estrangeira: 'Placa Estrangeira', placa: 'Placa', renavam: 'RENAVAM', marca: 'Marca/Modelo', art280: 'Art.280 §6º',
};
const CAT_COLORS: Record<string, string> = {
  imagem: '#ef4444', enquadramento: '#f97316', sinalizacao: '#eab308',
  ambiente: '#64748b', mudancaFaixa: '#475569', maisUm: '#334155',
  estrangeira: '#94a3b8', placa: '#7d8fa3', renavam: '#6b7f95', marca: '#8795a6', art280: '#9aa5b1',
};
const SPLICE_CATS = ['imagem', 'enquadramento', 'sinalizacao'];
const OUTROS_CATS = ['ambiente', 'mudancaFaixa', 'maisUm', 'estrangeira', 'placa', 'renavam', 'marca', 'art280'];

const InvalidasPage: React.FC = () => {
  const { getActiveClass, getActiveRecords } = useData();
  const inv = getActiveClass();
  const idRecs = getActiveRecords();
  const [fRodovia, setFRodovia] = useState('');
  const [fTipo, setFTipo] = useState('');
  const [detail, setDetail] = useState<ClassRecord | null>(null);

  const rodovias = useMemo(() => [...new Set(inv.map(r => r.rodovia))].sort(), [inv]);
  const tipos = useMemo(() => [...new Set(inv.map(r => r.tipo))].sort(), [inv]);

  const filtered = useMemo(() => inv.filter(r =>
    (!fRodovia || r.rodovia === fRodovia) && (!fTipo || r.tipo === fTipo)
  ), [inv, fRodovia, fTipo]);

  const getID = (equip: string, faixa: string) => {
    const r = idRecs.find(x => x.equipamento === equip && x.faixa === faixa);
    return r?.c_ID ?? null;
  };

  const totValidas = filtered.reduce((s, r) => s + r.validas, 0);
  const totInv = filtered.reduce((s, r) => s + r.totalInvalidas, 0);
  const totSplice = filtered.reduce((s, r) => s + r.totalSplice, 0);
  const totOutros = filtered.reduce((s, r) => s + r.totalOutros, 0);
  const totConf = filtered.reduce((s, r) => s + r.totalConferidas, 0);
  const pctSpliceGlobal = totInv > 0 ? totSplice / totInv : 0;

  const catTotals = useMemo(() => {
    const t: Record<string, number> = {};
    [...SPLICE_CATS, ...OUTROS_CATS].forEach(k => { t[k] = filtered.reduce((s, r) => s + ((r as any)[k] || 0), 0); });
    return t;
  }, [filtered]);

  if (!inv.length) {
    return (
      <div className="empty-state">
        <div className="text-5xl mb-3">📂</div>
        <h3>Importe a planilha de classificação</h3>
        <p>Vá até a tela de <strong>Upload</strong> e importe o arquivo de Classificação de Infração Inválida.</p>
      </div>
    );
  }

  const sorted = [...filtered].sort((a, b) => b.totalSplice - a.totalSplice);

  return (
    <div>
      <div className="page-header flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <div className="page-title">Análise de Infrações Inválidas</div>
          <div className="page-subtitle">Classificação por responsabilidade — Splice vs. Outros Motivos</div>
        </div>
        <div className="filters flex gap-2">
          <select className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs" value={fRodovia} onChange={e => setFRodovia(e.target.value)}>
            <option value="">Todas rodovias</option>
            {rodovias.map(r => <option key={r}>{r}</option>)}
          </select>
          <select className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs" value={fTipo} onChange={e => setFTipo(e.target.value)}>
            <option value="">Todos tipos</option>
            {tipos.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpis grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3.5 mb-6">
        <div className="kpi info"><div className="kpi-label">Total Conferidas</div><div className="kpi-val">{totConf.toLocaleString('pt-BR')}</div><div className="kpi-sub">{filtered.length} faixas</div></div>
        <div className="kpi good"><div className="kpi-label">Válidas</div><div className="kpi-val">{totValidas.toLocaleString('pt-BR')}</div><div className="kpi-sub">{totConf > 0 ? pct(totValidas / totConf) : '0%'} do total</div></div>
        <div className={`kpi ${totSplice > 0 ? 'danger' : 'good'}`}><div className="kpi-label">Inválidas — Splice</div><div className="kpi-val" style={{ color: 'var(--red)' }}>{totSplice.toLocaleString('pt-BR')}</div><div className="kpi-sub">{pct(pctSpliceGlobal)} das inválidas</div></div>
        <div className="kpi warn"><div className="kpi-label">Inválidas — Outros</div><div className="kpi-val">{totOutros.toLocaleString('pt-BR')}</div><div className="kpi-sub">{totInv > 0 ? pct(totOutros / totInv) : '0%'}</div></div>
        <div className="kpi"><div className="kpi-label">Total Inválidas</div><div className="kpi-val">{totInv.toLocaleString('pt-BR')}</div><div className="kpi-sub">{totConf > 0 ? pct(totInv / totConf) : '0%'} do total</div></div>
      </div>

      {/* Category breakdown */}
      <div className="card mb-4">
        <div className="card-header"><h3>📊 Distribuição por Categoria</h3></div>
        <div className="card-body">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <div className="text-[11px] font-bold text-destructive uppercase tracking-wider mb-2.5">🔴 Responsabilidade Splice — {totSplice.toLocaleString('pt-BR')}</div>
              {SPLICE_CATS.map(k => (
                <div key={k} className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: CAT_COLORS[k] }} className="font-semibold">{CAT_LABELS[k]}</span>
                    <span className="font-mono" style={{ color: CAT_COLORS[k] }}>{catTotals[k]?.toLocaleString('pt-BR')} {totSplice > 0 ? `(${pct(catTotals[k] / totSplice)})` : ''}</span>
                  </div>
                  <div className="idx-bar" style={{ height: 8 }}>
                    <div className="idx-bar-fill" style={{ width: `${totSplice > 0 ? Math.round(catTotals[k] / totSplice * 100) : 0}%`, background: CAT_COLORS[k] }} />
                  </div>
                </div>
              ))}
            </div>
            <div>
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">⚪ Outros Motivos — {totOutros.toLocaleString('pt-BR')}</div>
              {OUTROS_CATS.map(k => (
                <div key={k} className="mb-1.5">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-muted-foreground">{CAT_LABELS[k]}</span>
                    <span className="font-mono text-muted-foreground">{catTotals[k]?.toLocaleString('pt-BR')} {totOutros > 0 ? `(${pct(catTotals[k] / totOutros)})` : ''}</span>
                  </div>
                  <div className="idx-bar" style={{ height: 6 }}>
                    <div className="idx-bar-fill" style={{ width: `${totOutros > 0 ? Math.round(catTotals[k] / totOutros * 100) : 0}%`, background: CAT_COLORS[k] }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header"><h3>📋 Detalhamento por Faixa — ordenado por Splice ↓</h3></div>
        <div className="table-wrap overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr>
              <th className="p-2 text-left">Série</th><th className="p-2">Equip</th><th className="p-2">Tipo</th><th className="p-2">Faixa</th><th className="p-2">Rodovia</th>
              <th className="p-2">Válidas</th><th className="p-2">Total Inv.</th>
              <th className="p-2" title="Imagem">Img</th><th className="p-2" title="Enquadramento">Enq</th><th className="p-2" title="Sinalização">Sin</th>
              <th className="p-2">🔴 Splice</th><th className="p-2">% Splice</th>
              <th className="p-2">ID</th><th className="p-2">+</th>
            </tr></thead>
            <tbody>
              {sorted.map((r, i) => {
                const id = getID(r.equipamento, r.faixa);
                const sc = r.totalSplice === 0 ? 'var(--green)' : r.pctSplice > 0.3 ? 'var(--red)' : 'var(--amber)';
                return (
                  <tr key={`${r.equipamento}-${r.faixa}-${i}`} className="cursor-pointer" onClick={() => setDetail(r)}>
                    <td className="p-2 font-mono text-primary font-bold">{EQUIP_CATALOG[r.equipamento]?.serie ?? '—'}</td>
                    <td className="p-2 text-muted-foreground text-[11px]">{r.equipamento}</td>
                    <td className="p-2"><span className={`tag tag-${r.tipo.toLowerCase()}`}>{r.tipo}</span></td>
                    <td className="p-2 font-mono">{r.faixa}</td>
                    <td className="p-2 text-muted-foreground text-[11px]">{r.rodovia}</td>
                    <td className="p-2 font-mono">{r.validas.toLocaleString('pt-BR')}</td>
                    <td className="p-2 font-mono">{r.totalInvalidas.toLocaleString('pt-BR')}</td>
                    <td className="p-2 font-mono" style={{ color: r.imagem > 0 ? '#ef4444' : 'var(--muted2)' }}>{r.imagem}</td>
                    <td className="p-2 font-mono" style={{ color: r.enquadramento > 0 ? '#f97316' : 'var(--muted2)' }}>{r.enquadramento}</td>
                    <td className="p-2 font-mono" style={{ color: r.sinalizacao > 0 ? '#eab308' : 'var(--muted2)' }}>{r.sinalizacao}</td>
                    <td className="p-2 font-mono font-bold" style={{ color: sc }}>{r.totalSplice.toLocaleString('pt-BR')}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-1.5">
                        <div className="idx-bar" style={{ width: 50, height: 5 }}>
                          <div className="idx-bar-fill" style={{ width: `${Math.round(r.pctSplice * 100)}%`, background: sc }} />
                        </div>
                        <span className="font-mono text-[11px]" style={{ color: sc }}>{pct(r.pctSplice)}</span>
                      </div>
                    </td>
                    <td className="p-2">{id !== null ? <span className={`badge ${idBadge(id)}`}>{fmt(id)}</span> : <span className="text-muted-foreground/40">—</span>}</td>
                    <td className="p-2"><button className="btn btn-sm" onClick={e => { e.stopPropagation(); setDetail(r); }}>Ver</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto bg-card border-border">
          {detail && <InvDetailModal r={detail} getID={getID} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

function InvDetailModal({ r, getID }: { r: ClassRecord; getID: (e: string, f: string) => number | null }) {
  const cat = EQUIP_CATALOG[r.equipamento];
  const id = getID(r.equipamento, r.faixa);
  const sc = r.totalSplice === 0 ? 'var(--green)' : r.pctSplice > 0.3 ? 'var(--red)' : 'var(--amber)';
  const total = r.totalInvalidas;

  return (
    <div>
      <h2 className="font-display text-base font-extrabold mb-1">{cat ? `Nº ${cat.serie} — ` : ''}{r.equipamento} · Faixa {r.faixa}</h2>
      <p className="text-xs text-muted-foreground mb-4">{r.tipo} · {r.rodovia} km {r.km} · {r.municipio}{cat ? ` · ${cat.lote}` : ''}</p>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <div className="text-[10px] text-muted-foreground uppercase">Válidas</div>
          <div className="font-mono text-lg font-bold text-emerald-400">{r.validas.toLocaleString('pt-BR')}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <div className="text-[10px] text-muted-foreground uppercase">Total Inválidas</div>
          <div className="font-mono text-lg font-bold">{r.totalInvalidas.toLocaleString('pt-BR')}</div>
        </div>
        <div className="bg-card border border-destructive/30 rounded-lg p-3 text-center">
          <div className="text-[10px] text-muted-foreground uppercase">Splice</div>
          <div className="font-mono text-lg font-bold" style={{ color: sc }}>{r.totalSplice.toLocaleString('pt-BR')}</div>
          <div className="text-[10px] text-muted-foreground">{pct(r.pctSplice)}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <div className="text-[10px] text-muted-foreground uppercase">ID</div>
          <div className="font-mono text-lg font-bold">{id !== null ? fmt(id) : '—'}</div>
        </div>
      </div>

      <div className="text-[13px] font-bold font-display mb-2">Detalhamento por Categoria</div>
      <div className="space-y-1.5">
        {[...SPLICE_CATS, ...OUTROS_CATS].map(k => {
          const v = (r as any)[k] || 0;
          const isSplice = SPLICE_CATS.includes(k);
          const bw = total > 0 ? Math.round(v / total * 100) : 0;
          return (
            <div key={k} className="flex items-center gap-2.5 py-1.5 border-b border-border">
              <div className="w-[130px] text-xs" style={{ color: isSplice ? CAT_COLORS[k] : 'var(--muted)', fontWeight: isSplice ? 600 : 400 }}>{CAT_LABELS[k]}</div>
              <div className="flex-1"><div className="idx-bar" style={{ height: 6 }}><div className="idx-bar-fill" style={{ width: `${bw}%`, background: isSplice ? CAT_COLORS[k] : 'var(--muted)' }} /></div></div>
              <div className="font-mono text-xs w-12 text-right">{v}</div>
              <div className="font-mono text-[10px] text-muted-foreground w-12 text-right">{total > 0 ? pct(v / total) : '—'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default InvalidasPage;
