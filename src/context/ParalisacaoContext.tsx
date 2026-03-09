import React, { createContext, useContext, useState, useCallback } from 'react';

interface ParalisacaoEntry {
  equipamento: string;
  motivo: string;
  dataInicio: string;
}

interface ParalisacaoContextType {
  entries: ParalisacaoEntry[];
  addEntry: (entry: ParalisacaoEntry) => void;
  removeEntry: (equipamento: string) => void;
  isParalisado: (equipamento: string) => boolean;
  getMotivo: (equipamento: string) => string | undefined;
}

const ParalisacaoContext = createContext<ParalisacaoContextType | null>(null);

export function useParalisacao() {
  const ctx = useContext(ParalisacaoContext);
  if (!ctx) throw new Error('useParalisacao must be used within ParalisacaoProvider');
  return ctx;
}

const STORAGE_KEY = 'der_paralisacoes';

export function ParalisacaoProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<ParalisacaoEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });

  const persist = (next: ParalisacaoEntry[]) => {
    setEntries(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  const addEntry = useCallback((entry: ParalisacaoEntry) => {
    setEntries(prev => {
      const next = prev.filter(e => e.equipamento !== entry.equipamento).concat(entry);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const removeEntry = useCallback((equipamento: string) => {
    setEntries(prev => {
      const next = prev.filter(e => e.equipamento !== equipamento);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const isParalisado = useCallback((equipamento: string) => {
    return entries.some(e => e.equipamento === equipamento);
  }, [entries]);

  const getMotivo = useCallback((equipamento: string) => {
    return entries.find(e => e.equipamento === equipamento)?.motivo;
  }, [entries]);

  return (
    <ParalisacaoContext.Provider value={{ entries, addEntry, removeEntry, isParalisado, getMotivo }}>
      {children}
    </ParalisacaoContext.Provider>
  );
}
