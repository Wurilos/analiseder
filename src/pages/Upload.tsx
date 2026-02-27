import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/context/DataContext';
import { toast } from 'sonner';
import { IDRecord } from '@/types';
import { Upload, FileSpreadsheet, ChevronRight, Trash2, CheckCircle2, BarChart3, ClipboardList, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import uploadIllustration from '@/assets/upload-illustration.png';

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
    toast.success(`Período "${pending.period}" importado com sucesso!`);
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

  const hasData = Object.keys(periods).length > 0;

  return (
    <div className="min-h-[85vh] flex flex-col">
      {/* Hero section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl mb-8"
        style={{
          background: 'linear-gradient(135deg, hsl(222 60% 45%) 0%, hsl(222 60% 35%) 50%, hsl(240 50% 30%) 100%)',
        }}
      >
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        <div className="relative flex items-center justify-between p-8 md:p-10">
          <div className="flex-1 max-w-lg">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">
              Importar Dados
            </h1>
            <p className="text-white/70 text-sm md:text-base leading-relaxed">
              Faça upload das planilhas de desempenho e classificação de inválidas para gerar análises completas do Edital 145/2023.
            </p>
            {hasData && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => navigate('/dashboard')}
                className="mt-5 inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white text-sm font-medium px-4 py-2.5 rounded-lg backdrop-blur-sm transition-all border border-white/10"
              >
                Ver Dashboard <ChevronRight className="w-4 h-4" />
              </motion.button>
            )}
          </div>
          <div className="hidden md:block w-[280px] flex-shrink-0">
            <img src={uploadIllustration} alt="Analytics illustration" className="w-full h-auto opacity-90 drop-shadow-lg" />
          </div>
        </div>
      </motion.div>

      {/* Upload cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Upload ID */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-glass rounded-2xl overflow-hidden"
        >
          <div className="p-5 border-b border-border/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3b82f6] flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Planilha de Desempenho (ID)</h3>
              <p className="text-xs text-muted-foreground">VelocidadeFixo...xlsx</p>
            </div>
          </div>
          <div
            className={`p-8 text-center cursor-pointer transition-all duration-300 group
              ${dragID ? 'bg-primary/5 border-primary' : 'hover:bg-muted/30'}`}
            onDragOver={e => { e.preventDefault(); setDragID(true); }}
            onDragLeave={() => setDragID(false)}
            onDrop={e => { e.preventDefault(); setDragID(false); const f = e.dataTransfer.files[0]; if (f) handleIDFile(f); }}
            onClick={() => fileRefID.current?.click()}
          >
            <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl border-2 border-dashed flex items-center justify-center transition-all
              ${dragID ? 'border-primary bg-primary/10 scale-110' : 'border-border group-hover:border-primary/40 group-hover:bg-primary/5'}`}>
              <Upload className={`w-7 h-7 transition-colors ${dragID ? 'text-primary' : 'text-muted-foreground group-hover:text-primary/60'}`} />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Arraste o arquivo aqui</p>
            <p className="text-xs text-muted-foreground">ou clique para selecionar · .xlsx, .xls</p>
            <input ref={fileRefID} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleIDFile(f); }} />
          </div>
          {activePeriod && periods[activePeriod] && (
            <div className="px-5 pb-4">
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-emerald-500/5 border border-green-200 dark:border-emerald-500/20 rounded-xl text-xs">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-muted-foreground flex-1">{activePeriod} — {periods[activePeriod].length} faixas carregadas</span>
                <button className="text-destructive hover:text-destructive/80 transition-colors" onClick={() => deletePeriod(activePeriod)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Upload Classificação */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-glass rounded-2xl overflow-hidden"
        >
          <div className="p-5 border-b border-border/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#f59e0b] flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Classificação de Inválidas</h3>
              <p className="text-xs text-muted-foreground">ClassificacaoInfracaoInvalida...xlsx</p>
            </div>
          </div>
          <div
            className={`p-8 text-center cursor-pointer transition-all duration-300 group
              ${dragInv ? 'bg-primary/5 border-primary' : 'hover:bg-muted/30'}`}
            onDragOver={e => { e.preventDefault(); setDragInv(true); }}
            onDragLeave={() => setDragInv(false)}
            onDrop={e => { e.preventDefault(); setDragInv(false); const f = e.dataTransfer.files[0]; if (f) handleClassFile(f); }}
            onClick={() => fileRefInv.current?.click()}
          >
            <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl border-2 border-dashed flex items-center justify-center transition-all
              ${dragInv ? 'border-primary bg-primary/10 scale-110' : 'border-border group-hover:border-primary/40 group-hover:bg-primary/5'}`}>
              <Upload className={`w-7 h-7 transition-colors ${dragInv ? 'text-primary' : 'text-muted-foreground group-hover:text-primary/60'}`} />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Arraste o arquivo aqui</p>
            <p className="text-xs text-muted-foreground">ou clique para selecionar · .xlsx, .xls</p>
            <input ref={fileRefInv} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleClassFile(f); }} />
          </div>
          {activeClass && classifications[activeClass] && (
            <div className="px-5 pb-4">
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-emerald-500/5 border border-green-200 dark:border-emerald-500/20 rounded-xl text-xs">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-muted-foreground flex-1">Dados de inválidas — {classifications[activeClass].length} faixas</span>
                <button className="text-destructive hover:text-destructive/80 transition-colors" onClick={() => deleteClassData(activeClass)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Preview */}
      <AnimatePresence>
        {pending && (
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="mb-6"
          >
            <div className="card-glass rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#6366f1] flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">Preview da Importação</h3>
                    <p className="text-xs text-muted-foreground">{pending.filename}</p>
                  </div>
                </div>
                <button onClick={cancelImport} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
                  <div className="p-3 rounded-xl bg-muted/40">
                    <div className="text-xs text-muted-foreground mb-1">Registros</div>
                    <div className="text-lg font-bold font-mono text-foreground">{pending.records.length}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40">
                    <div className="text-xs text-muted-foreground mb-1">Período</div>
                    <div className="text-lg font-bold font-mono text-primary">{periodos.join(', ')}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40">
                    <div className="text-xs text-muted-foreground mb-1">ID Médio</div>
                    <div className="text-lg font-bold font-mono text-foreground">{avgID.toFixed(3)}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-5">
                  {tipos.map(t => <span key={t} className={`tag tag-${t.toLowerCase()}`}>{t}</span>)}
                  <span className="text-xs text-muted-foreground self-center ml-1">
                    {rodovias.length} rodovia{rodovias.length !== 1 ? 's' : ''}: {rodovias.slice(0, 4).join(', ')}{rodovias.length > 4 ? '…' : ''}
                  </span>
                </div>
                <div className="flex gap-3 justify-end">
                  <button className="btn" onClick={cancelImport}>Cancelar</button>
                  <button className="btn-primary btn inline-flex items-center gap-2" onClick={confirmImport}>
                    <CheckCircle2 className="w-4 h-4" /> Confirmar Importação
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Period history */}
      {Object.keys(periods).length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="card-glass rounded-2xl overflow-hidden"
        >
          <div className="p-5 border-b border-border/50">
            <h3 className="font-semibold text-sm text-foreground">Períodos Importados</h3>
          </div>
          <div className="p-3 space-y-2">
            {Object.entries(periods).map(([key, recs]) => {
              const isActive = key === activePeriod;
              const avg = recs.filter(r => r.c_ID !== null).reduce((s, r) => s + (r.c_ID ?? 0), 0) / Math.max(1, recs.filter(r => r.c_ID !== null).length);
              return (
                <div
                  key={key}
                  className={`flex items-center gap-3 p-3.5 rounded-xl transition-all cursor-pointer
                    ${isActive ? 'bg-primary/5 border border-primary/20 ring-1 ring-primary/10' : 'hover:bg-muted/40 border border-transparent'}`}
                  onClick={() => setActivePeriod(key)}
                >
                  <div className="period-badge">{key}</div>
                  <div className="flex-1 text-sm text-muted-foreground">
                    {recs.length} faixas · <span className="font-mono">ID {avg.toFixed(3)}</span>
                  </div>
                  {isActive && <span className="text-[10px] font-bold uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-md">Ativo</span>}
                  <button
                    className="w-7 h-7 rounded-lg hover:bg-destructive/10 flex items-center justify-center transition-colors"
                    onClick={e => { e.stopPropagation(); deletePeriod(key); }}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default UploadPage;
