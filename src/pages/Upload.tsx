import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/context/DataContext';
import { toast } from 'sonner';
import { IDRecord } from '@/types';
import { EQUIP_CATALOG } from '@/lib/equip-catalog';
import { fmt } from '@/lib/format';

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { periods, classifications, activePeriod, activeClass, importIDData, importClassData, deletePeriod, deleteClassData, setActivePeriod, parseIDFileFromBuffer, parseClassFileFromBuffer } = useData();
  const [pending, setPending] = useState<{ records: IDRecord[]; period: string; filename: string } | null>(null);
  const [dragID, setDragID] = useState(false);
  const [dragInv, setDragInv] = useState(false);
  const fileRefID = useRef<HTMLInputElement>(null);
  const fileRefInv = useRef<HTMLInputElement>(null);

  const handleIDFile = useCallback(async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const result = parseIDFileFromBuffer(buf);
      if (!result || !result.records.length) {
        toast.error('Nenhum dado encontrado na planilha');
        return;
      }
      setPending({ records: result.records, period: result.period, filename: file.name });
    } catch (err: any) {
      toast.error('Erro ao ler planilha: ' + err.message);
    }
  }, [parseIDFileFromBuffer]);

  const handleClassFile = useCallback(async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const records = parseClassFileFromBuffer(buf);
      if (!records.length) {
        toast.error('Nenhum dado encontrado — verifique se é a planilha de Classificação de Inválidas');
        return;
      }
      const key = activePeriod || 'class_latest';
      importClassData(records, key);
      toast.success(`✓ ${records.length} faixas de inválidas importadas`);
    } catch (err: any) {
      toast.error('Erro ao ler planilha: ' + err.message);
    }
  }, [parseClassFileFromBuffer, activePeriod, importClassData]);

  const confirmImport = useCallback(() => {
    if (!pending) return;
    importIDData(pending.records, pending.period);
    toast.success(`Período "${pending.period}" importado! ${pending.records.length} faixas.`);
    setPending(null);
    navigate('/dashboard');
  }, [pending, importIDData, navigate]);

  const cancelImport = () => setPending(null);

  const avgID = pending ? (() => {
    const withID = pending.records.filter(r => r.c_ID !== null);
    return withID.length ? withID.reduce((s, r) => s + (r.c_ID ?? 0), 0) / withID.length : 0;
  })() : 0;

  const periodos = pending ? [...new Set(pending.records.map(r => r.periodo))] : [];
  const tipos = pending ? [...new Set(pending.records.map(r => r.tipo))] : [];
  const rodovias = pending ? [...new Set(pending.records.map(r => r.rodovia))] : [];

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center">
      <div className="w-full max-w-[660px]">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="text-[40px] mb-2">📊</div>
          <h2 className="text-[26px] font-bold tracking-tight">DER Analytics</h2>
          <p className="text-muted-foreground text-sm mt-1">Análise de Índices de Desempenho · Edital 145/2023</p>
        </div>

        {/* Dual upload */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Upload ID */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              📈 Planilha de Desempenho (ID)
            </div>
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all bg-card
                ${dragID ? 'border-primary shadow-lg' : 'border-border hover:border-primary/40'}`}
              onDragOver={e => { e.preventDefault(); setDragID(true); }}
              onDragLeave={() => setDragID(false)}
              onDrop={e => { e.preventDefault(); setDragID(false); const f = e.dataTransfer.files[0]; if (f) handleIDFile(f); }}
              onClick={() => fileRefID.current?.click()}
            >
              <div className="text-3xl opacity-60 mb-2">📂</div>
              <h3 className="text-sm font-bold mb-1">Arraste o arquivo aqui</h3>
              <p className="text-xs text-muted-foreground">VelocidadeFixo...xlsx</p>
              <input ref={fileRefID} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleIDFile(f); }} />
            </div>
            {activePeriod && periods[activePeriod] && (
              <div className="mt-2 p-2.5 px-3 bg-green-50 dark:bg-emerald-500/5 border border-green-200 dark:border-emerald-500/20 rounded-lg text-xs flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span className="text-muted-foreground">{activePeriod} — {periods[activePeriod].length} faixas</span>
                <button className="ml-auto text-destructive text-[10px] hover:underline" onClick={() => deletePeriod(activePeriod)}>Remover</button>
              </div>
            )}
          </div>

          {/* Upload Classificação */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              📋 Classificação de Inválidas
            </div>
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all bg-card
                ${dragInv ? 'border-primary shadow-lg' : 'border-border hover:border-primary/40'}`}
              onDragOver={e => { e.preventDefault(); setDragInv(true); }}
              onDragLeave={() => setDragInv(false)}
              onDrop={e => { e.preventDefault(); setDragInv(false); const f = e.dataTransfer.files[0]; if (f) handleClassFile(f); }}
              onClick={() => fileRefInv.current?.click()}
            >
              <div className="text-3xl opacity-60 mb-2">📂</div>
              <h3 className="text-sm font-bold mb-1">Arraste o arquivo aqui</h3>
              <p className="text-xs text-muted-foreground">ClassificacaoInfracaoInvalida...xlsx</p>
              <input ref={fileRefInv} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleClassFile(f); }} />
            </div>
            {activeClass && classifications[activeClass] && (
              <div className="mt-2 p-2.5 px-3 bg-green-50 dark:bg-emerald-500/5 border border-green-200 dark:border-emerald-500/20 rounded-lg text-xs flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span className="text-muted-foreground">Dados de inválidas — {classifications[activeClass].length} faixas</span>
                <button className="ml-auto text-destructive text-[10px] hover:underline" onClick={() => deleteClassData(activeClass)}>Remover</button>
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        {pending && (
          <div className="mt-2">
            <div className="card p-5">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">📋 Preview — Planilha de Desempenho</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Arquivo:</span> <strong>{pending.filename}</strong></div>
                <div><span className="text-muted-foreground">Registros:</span> <strong>{pending.records.length} faixas</strong></div>
                <div><span className="text-muted-foreground">Período:</span> <strong className="text-primary">{periodos.join(', ')}</strong></div>
                <div><span className="text-muted-foreground">ID Médio:</span> <strong>{avgID.toFixed(3)}</strong></div>
                <div><span className="text-muted-foreground">Tipos:</span> {tipos.map(t => <span key={t} className={`tag tag-${t.toLowerCase()} ml-1`}>{t}</span>)}</div>
                <div><span className="text-muted-foreground">Rodovias:</span> {rodovias.slice(0, 4).join(', ')}{rodovias.length > 4 ? '...' : ''}</div>
              </div>
              <div className="h-1.5 bg-secondary rounded-full mt-4 overflow-hidden">
                <div className="h-full bg-primary rounded-full w-full" />
              </div>
            </div>
            <div className="flex gap-2.5 mt-3 justify-end">
              <button className="btn" onClick={cancelImport}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmImport}>
                ✓ Confirmar Importação
              </button>
            </div>
          </div>
        )}

        {/* Period history */}
        {Object.keys(periods).length > 0 && (
          <div className="mt-5 space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Períodos Importados</div>
            {Object.entries(periods).map(([key, recs]) => {
              const isActive = key === activePeriod;
              const avg = recs.filter(r => r.c_ID !== null).reduce((s, r) => s + (r.c_ID ?? 0), 0) / Math.max(1, recs.filter(r => r.c_ID !== null).length);
              return (
                <div key={key} className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer bg-card
                  ${isActive ? 'border-primary/30 ring-2 ring-primary/10' : 'border-border hover:border-primary/20'}`}
                  onClick={() => setActivePeriod(key)}
                >
                  <div className="period-badge">{key}</div>
                  <div className="flex-1 text-sm text-muted-foreground">{recs.length} faixas · ID médio: {avg.toFixed(3)}</div>
                  {isActive && <span className="text-[10px] text-primary font-bold uppercase">Ativo</span>}
                  <button className="text-[10px] text-destructive hover:underline" onClick={e => { e.stopPropagation(); deletePeriod(key); }}>×</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadPage;
