import { IDRecord, EquipGroup } from '@/types';
import { EQUIP_CATALOG, getValorEquip } from './equip-catalog';
import { calcID, calcIEF } from './calc-engine';

function avg(arr: (number | null)[]): number | null {
  const valid = arr.filter((v): v is number => v !== null);
  return valid.length ? valid.reduce((s, v) => s + v, 0) / valid.length : null;
}

export function groupByEquipamento(records: IDRecord[]): EquipGroup[] {
  const groups: Record<string, IDRecord[]> = {};
  records.forEach(r => {
    const k = r.equipamento;
    if (!k) return;
    if (!groups[k]) groups[k] = [];
    groups[k].push(r);
  });

  return Object.entries(groups).map(([equip, recs]) => {
    const first = recs[0];
    const n = recs.length;
    const c_ICId = avg(recs.map(r => r.c_ICId));
    const c_ICIn = avg(recs.map(r => r.c_ICIn));
    const c_IEVri = avg(recs.map(r => r.c_IEVri));
    const c_IEVdt = avg(recs.map(r => r.c_IEVdt));
    const c_ILPd = avg(recs.map(r => r.c_ILPd));
    const c_ILPn = avg(recs.map(r => r.c_ILPn));
    const c_IEF = avg(recs.map(r => r.c_IEF));
    const c_IDF = avg(recs.map(r => r.c_IDF));
    const c_ICV = avg(recs.map(r => r.c_ICV));
    const c_ID = avg(recs.map(r => r.c_ID));

    const cat = EQUIP_CATALOG[equip];
    const valorTotal = cat ? cat.valor : getValorEquip(equip, first.tipo) * n;
    const valorFaixa = valorTotal / n;
    const valorRecebidoTotal = recs.reduce((s, r) => s + valorFaixa * (r.c_ID ?? 0), 0);
    const descontoTotal = valorTotal - valorRecebidoTotal;

    const idf = c_IDF ?? 0, ief = c_IEF ?? 0, icv = c_ICV ?? 0, id = c_ID ?? 0;
    const id_idf1 = calcID(first.tipo, 1.0, ief, icv) ?? 0;
    const id_ief1 = calcID(first.tipo, idf, 1.0, icv) ?? 0;
    const id_icv1 = calcID(first.tipo, idf, ief, 1.0) ?? 0;
    const perdaIDF = valorTotal * Math.max(0, id_idf1 - id);
    const perdaIEF = valorTotal * Math.max(0, id_ief1 - id);
    const perdaICV = valorTotal * Math.max(0, id_icv1 - id);

    const levers = [
      { nome: 'IDF', perda: perdaIDF },
      { nome: 'IEF', perda: perdaIEF },
      { nome: 'ICV', perda: perdaICV },
    ].sort((a, b) => b.perda - a.perda);

    return {
      equipamento: equip,
      serie: first.serie,
      lote: first.lote,
      tipo: first.tipo,
      rodovia: first.rodovia,
      km: first.km,
      numFaixas: n,
      faixas: recs.map(r => r.faixa),
      c_ICId, c_ICIn, c_IEVri, c_IEVdt, c_ILPd, c_ILPn, c_IEF, c_IDF, c_ICV, c_ID,
      valorTotal, valorFaixa, valorRecebidoTotal, descontoTotal,
      perdaIDF, perdaIEF, perdaICV,
      melhorAlavanca: levers[0],
      levers,
    };
  });
}
