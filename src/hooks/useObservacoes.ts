import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ObservacoesMap = Record<string, string>;

let cache: ObservacoesMap | null = null;
const listeners = new Set<(m: ObservacoesMap) => void>();

async function loadAll(): Promise<ObservacoesMap> {
  const { data, error } = await supabase
    .from('equipamento_observacoes')
    .select('codigo, observacao');
  if (error) {
    console.error('[useObservacoes] load error', error);
    return {};
  }
  const map: ObservacoesMap = {};
  (data ?? []).forEach((r: any) => { map[r.codigo] = r.observacao; });
  return map;
}

function emit() {
  if (cache) listeners.forEach(l => l(cache!));
}

export function useObservacoes() {
  const [obs, setObs] = useState<ObservacoesMap>(cache ?? {});
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    const l = (m: ObservacoesMap) => setObs({ ...m });
    listeners.add(l);
    if (cache === null) {
      loadAll().then(m => {
        cache = m;
        setLoading(false);
        emit();
      });
    } else {
      setLoading(false);
    }
    return () => { listeners.delete(l); };
  }, []);

  const save = useCallback(async (codigo: string, observacao: string) => {
    const trimmed = observacao.trim();
    if (!cache) cache = {};
    if (!trimmed) {
      delete cache[codigo];
      emit();
      const { error } = await supabase
        .from('equipamento_observacoes')
        .delete()
        .eq('codigo', codigo);
      if (error) console.error('[useObservacoes] delete error', error);
      return;
    }
    cache[codigo] = trimmed;
    emit();
    const { error } = await supabase
      .from('equipamento_observacoes')
      .upsert({ codigo, observacao: trimmed }, { onConflict: 'codigo' });
    if (error) console.error('[useObservacoes] save error', error);
  }, []);

  return { obs, loading, save };
}
