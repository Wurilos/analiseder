import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { EquipGroup, IDRecord } from '@/types';
import { EQUIP_CATALOG, getFabricanteByCodigo } from '@/lib/equip-catalog';
import { computeFinanceForGroups } from '@/lib/finance-engine';
import { DollarSign, Percent, ShieldCheck, Activity, Tags, Sun, Moon, Camera, Send, ScanLine, FileText, Plus, Minus } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  groups: EquipGroup[];
  records: IDRecord[];
  periodo: string;
}


const SUBINDICES_LABELS: Record<string, string> = {
  IDF: 'IDF Crítico — Disponibilidade Reduzida',
  ICId: 'ICId Baixo — Captura Diurna',
  ICIn: 'ICIn Baixo — Captura Noturna',
  IEVri: 'IEVri Baixo — Registros de Imagens',
  IEVdt: 'IEVdt Baixo — Envio de Dados',
  ILPd: 'ILPd Baixo — OCR de Placas Diurno',
  ILPn: 'ILPn Baixo — OCR de Placas Noturno',
  ICV: 'ICV Baixo — Classificação Veicular',
};

const SUB_LABEL_SHORT: Record<string, { titulo: string; descricao: string }> = {
  IDF: { titulo: 'IDF Crítico', descricao: 'Disponibilidade Reduzida' },
  ICId: { titulo: 'ICId Baixo', descricao: 'Captura Diurna' },
  ICIn: { titulo: 'ICIn Baixo', descricao: 'Captura Noturna' },
  IEVri: { titulo: 'IEVri Baixo', descricao: 'Registros de Imagens' },
  IEVdt: { titulo: 'IEVdt Baixo', descricao: 'Envio de Dados' },
  ILPd: { titulo: 'ILPd Baixo', descricao: 'OCR de Placas Diurno' },
  ILPn: { titulo: 'ILPn Baixo', descricao: 'OCR de Placas Noturno' },
  ICV: { titulo: 'ICV Baixo', descricao: 'Classificação Veicular' },
};

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPct = (v: number) => (v * 100).toFixed(1).replace('.', ',') + '%';

const getDisplayID = (item: { f_ID?: number | null; c_ID?: number | null }) => item.f_ID ?? item.c_ID ?? null;

// Regra oficial: padrão Splice; Focalle só em equipamentos DR-05/DR-10
// marcados na planilha (catálogo). Fonte canônica = EQUIP_CATALOG (lookup
// pelo código do equipamento), não o lote do registro.
const fabricanteOf = (equip: string): 'Focalle' | 'Splice' => getFabricanteByCodigo(equip);

interface Resumo {
  count: number;
  desconto: number;
  valorTotal: number;
  idMedio: number;
  piores: { key: string; titulo: string; descricao: string }[];
}

function calcResumo(groups: EquipGroup[], records: IDRecord[]): Resumo {
  // Cérebro único: totais financeiros e ID vêm do finance-engine.
  const f = computeFinanceForGroups(groups, records);

  // Piores indicadores (cálculo local — apenas ranking visual, não financeiro).
  const validGroups = groups.filter(g => g.c_ID !== null);
  const fields: Array<keyof EquipGroup> = ['c_IDF', 'c_ICId', 'c_ICIn', 'c_IEVri', 'c_IEVdt', 'c_ILPd', 'c_ILPn', 'c_ICV'];
  const keyMap: Record<string, string> = {
    c_IDF: 'IDF', c_ICId: 'ICId', c_ICIn: 'ICIn',
    c_IEVri: 'IEVri', c_IEVdt: 'IEVdt', c_ILPd: 'ILPd', c_ILPn: 'ILPn', c_ICV: 'ICV',
  };
  const gaps = fields.map(fld => {
    const vals = validGroups.map(g => g[fld] as number | null).filter((v): v is number => v !== null);
    const m = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 1;
    return { key: keyMap[fld as string], gap: 1 - m, media: m };
  }).filter(x => x.gap > 0.01)
    .sort((a, b) => b.gap - a.gap);

  const piores = gaps.slice(0, 4).map(g => ({
    key: g.key,
    titulo: SUB_LABEL_SHORT[g.key]?.titulo ?? g.key,
    descricao: SUB_LABEL_SHORT[g.key]?.descricao ?? '',
  }));

  return {
    count: groups.length,
    desconto: f.descontoTotal,
    valorTotal: f.valorContratado,
    idMedio: f.idMedioFaixa,
    piores,
  };
}

/* ─── Bloco "Piores Indicadores" ─── */
const PioresList: React.FC<{ items: Resumo['piores']; numColor: string }> = ({ items, numColor }) => (
  <div className="bg-white rounded-lg p-3 mt-2 border border-slate-200">
    <div className="text-center font-bold text-slate-700 mb-2 text-sm">Piores Indicadores:</div>
    <div className="flex flex-col gap-1.5">
      {items.map((it, i) => (
        <div key={it.key} className="flex items-center gap-2 bg-slate-50 rounded px-2 py-1.5 border border-slate-200">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: numColor }}
          >
            {i + 1}º
          </div>
          <div className="text-sm">
            <span className="font-bold text-slate-800">{it.titulo}</span>
            <span className="text-slate-600"> {it.descricao}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ─── Card de Fabricante (azul Splice / laranja Focalle) ─── */
const FabricanteBlock: React.FC<{
  fabricante: 'Splice' | 'Focalle';
  resumo: Resumo;
  isMisto: boolean;
}> = ({ fabricante, resumo, isMisto }) => {
  const isSplice = fabricante === 'Splice';
  const headerBg = isSplice
    ? 'linear-gradient(180deg,#1e4d8b,#163a6b)'
    : 'linear-gradient(180deg,#e8742a,#c95a18)';
  const accentBorder = isSplice ? 'border-[#1e4d8b]' : 'border-[#e8742a]';
  const numColor = isSplice ? '#1e4d8b' : '#e8742a';
  const recebimento = resumo.valorTotal - resumo.desconto;

  return (
    <div className={`rounded-lg overflow-hidden border-2 ${accentBorder} bg-white`}>
      {/* Header com nome do fabricante + contagem */}
      <div
        className="text-white text-center font-extrabold py-2 px-3 text-base tracking-wide flex flex-col items-center justify-center min-h-[3.5rem] leading-tight"
        style={{ background: headerBg }}
      >
        <span>Equipamento {fabricante.toUpperCase()}:</span>
        <span className="text-xs font-semibold opacity-95 mt-0.5">({resumo.count} eqp homologado{resumo.count !== 1 ? 's' : ''})</span>
      </div>

      <div className="p-3 space-y-2 bg-slate-50">
        {/* ID de Equipamento */}
        <div
          className="text-white font-bold py-1.5 px-3 rounded flex items-center gap-2 text-sm"
          style={{ background: headerBg }}
        >
          <Percent className="w-4 h-4" />
          <span>ID de Equipamento</span>
          <span className="ml-auto font-extrabold">(ID: {fmtPct(resumo.idMedio)})</span>
        </div>

        {/* Valor de desconto previsto */}
        <div className="text-center bg-white border border-slate-300 rounded py-1.5 px-2 text-sm font-semibold text-slate-700">
          Valor de desconto previsto: <span className="text-slate-900 font-extrabold">{fmtBRL(resumo.desconto)}</span>
        </div>

        {/* Recebimento previsto por fabricante */}
        <div className="text-center bg-white border border-[#1f8a4d] rounded py-1.5 px-2 text-sm font-semibold text-slate-700">
          Recebimento Previsto: <span className="text-[#1c8048] font-extrabold">{fmtBRL(recebimento)}</span>
        </div>

        <PioresList items={resumo.piores} numColor={numColor} />
      </div>
    </div>
  );
};

const LoteAnaliseModal: React.FC<Props> = ({ open, onOpenChange, groups, records, periodo }) => {
  const lotes = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => { if (r.lote) set.add(r.lote); });
    return [...set].sort();
  }, [records]);

  const [loteSel, setLoteSel] = useState<string>('');
  const loteAtivo = loteSel || lotes[0] || '';

  const groupsLote = useMemo(
    () => groups.filter(g => g.lote === loteAtivo),
    [groups, loteAtivo]
  );
  const recordsLote = useMemo(
    () => records.filter(r => r.lote === loteAtivo),
    [records, loteAtivo]
  );

  // Identifica número do lote (DR-05 -> 5)
  const loteNum = useMemo(() => {
    const m = loteAtivo.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }, [loteAtivo]);

  const isMisto = loteNum === 5 || loteNum === 10;

  const splice = useMemo(() => groupsLote.filter(g => fabricanteOf(g.equipamento) === 'Splice'), [groupsLote]);
  const focalle = useMemo(() => groupsLote.filter(g => fabricanteOf(g.equipamento) === 'Focalle'), [groupsLote]);
  const spliceRecords = useMemo(() => recordsLote.filter(r => fabricanteOf(r.equipamento) === 'Splice'), [recordsLote]);
  const focalleRecords = useMemo(() => recordsLote.filter(r => fabricanteOf(r.equipamento) === 'Focalle'), [recordsLote]);

  const contratoResumo = useMemo(() => calcResumo(groups, records), [groups, records]);
  const totalResumo = useMemo(() => calcResumo(groupsLote, recordsLote), [groupsLote, recordsLote]);
  const spliceResumo = useMemo(() => calcResumo(splice, spliceRecords), [splice, spliceRecords]);
  const focalleResumo = useMemo(() => calcResumo(focalle, focalleRecords), [focalle, focalleRecords]);

  // Perdas — fonte única (finance-engine). Bate com Dashboard, Resumo e Valores.
  const perdas = useMemo(() => {
    const f = computeFinanceForGroups(groups, records);
    return {
      main: { total: f.descontoTotal, IDF: f.perdaIDF, IEF: f.perdaIEF, ICV: f.perdaICV },
      sub: f.perdaSub,
    };
  }, [groups, records]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-slate-50 border-slate-300 p-0 overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Cabeçalho azul */}
        <div
          className="text-white py-3 px-6 text-center"
          style={{ background: 'linear-gradient(180deg,#1e4d8b,#163a6b)' }}
        >
          <DialogTitle className="text-xl font-extrabold tracking-wide text-white">
            LOTE {String(loteNum).padStart(2, '0')} — ANÁLISE
          </DialogTitle>
          <div className="text-xs mt-1 text-white/90 font-medium">
            PERÍODO {periodo || '—'} · {totalResumo.count} EQUIPAMENTO{totalResumo.count !== 1 ? 'S' : ''} {isMisto ? 'DEFERIDOS' : 'HOMOLOGADOS'}.
          </div>
        </div>

        {/* Seletor de lote */}
        {lotes.length > 1 && (
          <div className="px-6 pt-3 flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 uppercase">Lote:</label>
            <select
              value={loteAtivo}
              onChange={e => setLoteSel(e.target.value)}
              className="text-sm border border-slate-300 rounded px-2 py-1 bg-white text-slate-800"
            >
              {lotes.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        )}

        <div className="p-5 space-y-3">
          {/* KPIs topo: verde + laranja */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded-lg overflow-hidden border-2 border-[#1f8a4d]"
              style={{ background: 'linear-gradient(180deg,#22a85d,#1c8048)' }}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="bg-white/20 rounded-md p-2">
                  <DollarSign className="w-7 h-7 text-white" />
                </div>
                <div className="text-white">
                  <div className="text-xs font-semibold opacity-95">
                    Valor previsto para recebimento:
                  </div>
                  <div className="text-2xl font-extrabold leading-tight">
                    {fmtBRL(contratoResumo.valorTotal - contratoResumo.desconto)}
                  </div>
                </div>
              </div>
            </div>
            <div
              className="rounded-lg overflow-hidden border-2 border-[#c95a18]"
              style={{ background: 'linear-gradient(180deg,#e8742a,#c95a18)' }}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="bg-white/20 rounded-md p-2">
                  <Percent className="w-7 h-7 text-white" />
                </div>
                <div className="text-white">
                  <div className="text-xs font-semibold opacity-95">
                    ID Geral do Contrato:
                  </div>
                  <div className="text-2xl font-extrabold leading-tight">{fmtPct(contratoResumo.idMedio)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Relação entre valor previsto e descontos */}
          <div className="rounded-lg border border-slate-300 bg-white overflow-hidden">
            <div className="grid grid-cols-3 divide-x divide-slate-200">
              <div className="px-3 py-2 text-center">
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Valor Contratado</div>
                <div className="text-base font-extrabold text-slate-800 mt-0.5">{fmtBRL(contratoResumo.valorTotal)}</div>
              </div>
              <div className="px-3 py-2 text-center">
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Desconto Previsto</div>
                <div className="text-base font-extrabold text-[#c95a18] mt-0.5">− {fmtBRL(contratoResumo.desconto)}</div>
              </div>
              <div className="px-3 py-2 text-center">
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">% Desconto / Contrato</div>
                <div className="text-base font-extrabold text-[#c95a18] mt-0.5">
                  {contratoResumo.valorTotal > 0 ? fmtPct(contratoResumo.desconto / contratoResumo.valorTotal) : '—'}
                </div>
              </div>
            </div>
            {contratoResumo.valorTotal > 0 && (
              <div className="px-3 pb-2">
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden flex">
                  <div
                    className="h-full bg-[#1c8048]"
                    style={{ width: `${Math.max(0, Math.min(100, ((contratoResumo.valorTotal - contratoResumo.desconto) / contratoResumo.valorTotal) * 100))}%` }}
                    title={`Recebimento: ${fmtPct((contratoResumo.valorTotal - contratoResumo.desconto) / contratoResumo.valorTotal)}`}
                  />
                  <div
                    className="h-full bg-[#c95a18]"
                    style={{ width: `${Math.max(0, Math.min(100, (contratoResumo.desconto / contratoResumo.valorTotal) * 100))}%` }}
                    title={`Desconto: ${fmtPct(contratoResumo.desconto / contratoResumo.valorTotal)}`}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-semibold text-slate-500 mt-1">
                  <span>
                    <span className="inline-block w-2 h-2 rounded-full bg-[#1c8048] mr-1 align-middle" />
                    Recebimento {fmtPct((contratoResumo.valorTotal - contratoResumo.desconto) / contratoResumo.valorTotal)}
                  </span>
                  <span>
                    <span className="inline-block w-2 h-2 rounded-full bg-[#c95a18] mr-1 align-middle" />
                    Desconto {fmtPct(contratoResumo.desconto / contratoResumo.valorTotal)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Perdas Financeiras (cards expansíveis) */}
          <div className="rounded-lg border border-slate-300 bg-white p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Perdas Financeiras</h4>
              <span className="text-[10px] text-slate-500">Clique no <Plus className="inline w-3 h-3" /> para detalhar</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <PerdaMiniCard
                label="Perda Total" value={fmtBRL(perdas.main.total)} sub="Desconto contratual" tone="red"
                icon={<DollarSign className="w-4 h-4" />}
                expandedContent={
                  <div className="grid grid-cols-3 gap-1.5">
                    <SubMiniCard label="IDF" value={fmtBRL(perdas.main.IDF)} tone="amber" />
                    <SubMiniCard label="IEF" value={fmtBRL(perdas.main.IEF)} tone="orange" />
                    <SubMiniCard label="ICV" value={fmtBRL(perdas.main.ICV)} tone="purple" />
                  </div>
                }
              />
              <PerdaMiniCard label="Perda IDF" value={fmtBRL(perdas.main.IDF)} sub="Disponibilidade" tone="amber" icon={<ShieldCheck className="w-4 h-4" />} />
              <PerdaMiniCard
                label="Perda IEF" value={fmtBRL(perdas.main.IEF)} sub="Eficiência funcional" tone="orange"
                icon={<Activity className="w-4 h-4" />}
                expandedContent={
                  <div className="grid grid-cols-2 gap-1.5">
                    <SubMiniCard label="ICId" value={fmtBRL(perdas.sub.ICId)} sub="Captura diurna" tone="amber" icon={<Sun className="w-3 h-3" />} />
                    <SubMiniCard label="ICIn" value={fmtBRL(perdas.sub.ICIn)} sub="Captura noturna" tone="indigo" icon={<Moon className="w-3 h-3" />} />
                    <SubMiniCard label="IEVri" value={fmtBRL(perdas.sub.IEVri)} sub="Envio imagens" tone="orange" icon={<Camera className="w-3 h-3" />} />
                    <SubMiniCard label="IEVdt" value={fmtBRL(perdas.sub.IEVdt)} sub="Envio dados" tone="purple" icon={<Send className="w-3 h-3" />} />
                    <SubMiniCard label="ILPd" value={fmtBRL(perdas.sub.ILPd)} sub="OCR diurno" tone="red" icon={<ScanLine className="w-3 h-3" />} />
                    <SubMiniCard label="ILPn" value={fmtBRL(perdas.sub.ILPn)} sub="OCR noturno" tone="teal" icon={<FileText className="w-3 h-3" />} />
                  </div>
                }
              />
              <PerdaMiniCard label="Perda ICV" value={fmtBRL(perdas.main.ICV)} sub="Classificação veicular" tone="purple" icon={<Tags className="w-4 h-4" />} />
            </div>
          </div>

          {isMisto ? (
            // Layout com Splice + Focalle lado a lado
            <div className="grid grid-cols-2 gap-3">
              {splice.length > 0 && <FabricanteBlock fabricante="Splice" resumo={spliceResumo} isMisto={isMisto} />}
              {focalle.length > 0 && <FabricanteBlock fabricante="Focalle" resumo={focalleResumo} isMisto={isMisto} />}
              {splice.length === 0 && focalle.length === 0 && (
                <div className="col-span-2 text-center text-sm text-slate-500 py-6">
                  Sem equipamentos identificados neste lote.
                </div>
              )}
            </div>
          ) : (
            // Layout único (lotes 1, 2, 3, etc.)
            <div className="space-y-3">
              {/* Desconto previsto destacado em pílula azul */}
              <div className="flex justify-center">
                <div
                  className="text-white text-sm font-bold px-4 py-1.5 rounded-full inline-flex items-center gap-2 shadow"
                  style={{ background: 'linear-gradient(180deg,#1e4d8b,#163a6b)' }}
                >
                  <DollarSign className="w-4 h-4" />
                  Desconto previsto: <span className="font-extrabold">{fmtBRL(totalResumo.desconto)}</span>
                </div>
              </div>

              <div className="rounded-lg overflow-hidden border-2 border-[#1e4d8b] bg-slate-100">
                <div
                  className="text-white text-center font-extrabold py-2 text-base tracking-wide"
                  style={{ background: 'linear-gradient(180deg,#1e4d8b,#163a6b)' }}
                >
                  Piores Indicadores:
                </div>
                <div className="p-3">
                  <div className="flex flex-col gap-1.5">
                    {totalResumo.piores.map((it, i) => (
                      <div key={it.key} className="flex items-center gap-2 bg-white rounded px-2 py-2 border border-slate-200">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: '#1f8a4d' }}
                        >
                          {i + 1}º
                        </div>
                        <div className="text-sm">
                          <span className="font-bold text-slate-800">{it.titulo}</span>
                          <span className="text-slate-600"> {it.descricao}</span>
                        </div>
                      </div>
                    ))}
                    {totalResumo.piores.length === 0 && (
                      <div className="text-center text-sm text-slate-500 py-2">
                        Sem indicadores críticos identificados.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

type Tone = 'red' | 'amber' | 'orange' | 'purple' | 'indigo' | 'teal';
const TONE_BORDER: Record<Tone, string> = {
  red: 'border-l-red-500', amber: 'border-l-amber-500', orange: 'border-l-orange-500',
  purple: 'border-l-purple-500', indigo: 'border-l-indigo-500', teal: 'border-l-teal-500',
};
const TONE_TEXT: Record<Tone, string> = {
  red: 'text-red-600', amber: 'text-amber-600', orange: 'text-orange-600',
  purple: 'text-purple-600', indigo: 'text-indigo-600', teal: 'text-teal-600',
};

const PerdaMiniCard: React.FC<{
  label: string; value: string; sub: string; tone: Tone;
  icon: React.ReactNode; expandedContent?: React.ReactNode;
}> = ({ label, value, sub, tone, icon, expandedContent }) => {
  const [open, setOpen] = useState(false);
  const expandable = !!expandedContent;
  return (
    <div className={`rounded-md border border-slate-200 border-l-4 ${TONE_BORDER[tone]} bg-slate-50 p-2`}>
      <div className="flex items-center justify-between gap-1">
        <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
        <div className="flex items-center gap-1">
          <span className={TONE_TEXT[tone]}>{icon}</span>
          {expandable && (
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              className={`p-0.5 rounded hover:bg-slate-200 transition-colors ${TONE_TEXT[tone]}`}
              aria-label={open ? 'Recolher' : 'Expandir'}
              title={open ? 'Recolher' : 'Expandir'}
            >
              {open ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>
      <div className="font-mono text-sm font-extrabold text-slate-800 leading-tight mt-0.5">{value}</div>
      <div className="text-[9px] text-slate-500 leading-tight">{sub}</div>
      {expandable && open && (
        <div className="mt-2 pt-2 border-t border-dashed border-slate-300">{expandedContent}</div>
      )}
    </div>
  );
};

const SubMiniCard: React.FC<{ label: string; value: string; sub?: string; tone: Tone; icon?: React.ReactNode }> = ({
  label, value, sub, tone, icon,
}) => (
  <div className={`rounded border border-slate-200 border-l-2 ${TONE_BORDER[tone]} bg-white px-1.5 py-1`}>
    <div className="flex items-center justify-between gap-1">
      <span className="text-[8px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      {icon && <span className={TONE_TEXT[tone]}>{icon}</span>}
    </div>
    <div className="font-mono text-[10px] font-bold text-slate-800 leading-tight">{value}</div>
    {sub && <div className="text-[8px] text-slate-500 leading-tight">{sub}</div>}
  </div>
);

export default LoteAnaliseModal;

