import React, { createContext, useContext, useState, useCallback } from 'react';
import { IDRecord, ClassRecord } from '@/types';
import { parseIDFile } from '@/lib/id-parser';
import { parseClassFile } from '@/lib/class-parser';

interface DataState {
  periods: Record<string, IDRecord[]>;
  activePeriod: string | null;
  classifications: Record<string, ClassRecord[]>;
  activeClass: string | null;
}

interface DataContextType extends DataState {
  importIDData: (records: IDRecord[], period: string) => void;
  importClassData: (records: ClassRecord[], period: string) => void;
  setActivePeriod: (key: string) => void;
  deletePeriod: (key: string) => void;
  deleteClassData: (key: string) => void;
  getActiveRecords: () => IDRecord[];
  getActiveClass: () => ClassRecord[];
  parseIDFileFromBuffer: (buffer: ArrayBuffer) => { records: IDRecord[]; period: string } | null;
  parseClassFileFromBuffer: (buffer: ArrayBuffer) => ClassRecord[];
}

const DataContext = createContext<DataContextType | null>(null);

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DataState>(() => {
    let periods: Record<string, IDRecord[]> = {};
    let classifications: Record<string, ClassRecord[]> = {};
    try {
      const raw = localStorage.getItem('der_periods');
      if (raw) periods = JSON.parse(raw);
    } catch (e) {
      console.error('[DataProvider] Failed to parse der_periods:', e);
      localStorage.removeItem('der_periods');
    }
    try {
      const raw = localStorage.getItem('der_classifications');
      if (raw) classifications = JSON.parse(raw);
    } catch (e) {
      console.error('[DataProvider] Failed to parse der_classifications:', e);
      localStorage.removeItem('der_classifications');
    }
    const activePeriod = Object.keys(periods)[0] || null;
    const activeClass = Object.keys(classifications)[0] || null;
    console.log('[DataProvider] Init:', { periodsKeys: Object.keys(periods), activePeriod, recordCount: activePeriod ? periods[activePeriod]?.length : 0 });
    return { periods, activePeriod, classifications, activeClass };
  });

  const importIDData = useCallback((records: IDRecord[], period: string) => {
    setState(prev => {
      const newPeriods = { ...prev.periods, [period]: records };
      try { localStorage.setItem('der_periods', JSON.stringify(newPeriods)); } catch {}
      return { ...prev, periods: newPeriods, activePeriod: period };
    });
  }, []);

  const importClassData = useCallback((records: ClassRecord[], period: string) => {
    setState(prev => {
      const newClass = { ...prev.classifications, [period]: records };
      try { localStorage.setItem('der_classifications', JSON.stringify(newClass)); } catch {}
      return { ...prev, classifications: newClass, activeClass: period };
    });
  }, []);

  const setActivePeriod = useCallback((key: string) => {
    setState(prev => ({ ...prev, activePeriod: key }));
  }, []);

  const deletePeriod = useCallback((key: string) => {
    setState(prev => {
      const newPeriods = { ...prev.periods };
      delete newPeriods[key];
      try { localStorage.setItem('der_periods', JSON.stringify(newPeriods)); } catch {}
      const newActive = prev.activePeriod === key ? (Object.keys(newPeriods)[0] || null) : prev.activePeriod;
      return { ...prev, periods: newPeriods, activePeriod: newActive };
    });
  }, []);

  const deleteClassData = useCallback((key: string) => {
    setState(prev => {
      const newClass = { ...prev.classifications };
      delete newClass[key];
      try { localStorage.setItem('der_classifications', JSON.stringify(newClass)); } catch {}
      const newActive = prev.activeClass === key ? (Object.keys(newClass)[0] || null) : prev.activeClass;
      return { ...prev, classifications: newClass, activeClass: newActive };
    });
  }, []);

  const getActiveRecords = useCallback(() => {
    return state.periods[state.activePeriod || ''] || [];
  }, [state.periods, state.activePeriod]);

  const getActiveClass = useCallback(() => {
    const key = state.activeClass || state.activePeriod || '';
    return state.classifications[key] || [];
  }, [state.classifications, state.activeClass, state.activePeriod]);

  const parseIDFileFromBuffer = useCallback((buffer: ArrayBuffer) => {
    return parseIDFile(buffer);
  }, []);

  const parseClassFileFromBuffer = useCallback((buffer: ArrayBuffer) => {
    return parseClassFile(buffer);
  }, []);

  return (
    <DataContext.Provider value={{
      ...state,
      importIDData,
      importClassData,
      setActivePeriod,
      deletePeriod,
      deleteClassData,
      getActiveRecords,
      getActiveClass,
      parseIDFileFromBuffer,
      parseClassFileFromBuffer,
    }}>
      {children}
    </DataContext.Provider>
  );
}
