import { describe, it, expect } from 'vitest';
import { computeFinanceForGroups } from '@/lib/finance-engine';
import { EquipGroup, IDRecord } from '@/types';

function mkGroup(over: Partial<EquipGroup> = {}): EquipGroup {
  return {
    equipamento: 'EQP-1', serie: 1, lote: 'DR-01', tipo: 'A', rodovia: 'SP-000',
    km: 0, numFaixas: 2, faixas: ['F1', 'F2'],
    c_ICId: 0.9, c_ICIn: 0.85, c_IEVri: 0.95, c_IEVdt: 0.95, c_ILPd: 0.8, c_ILPn: 0.7,
    c_IEF: 0.82, c_IDF: 0.95, c_ICV: 0.9, c_ID: 0.78,
    valorTotal: 100_000, valorFaixa: 50_000, valorRecebidoTotal: 78_000, descontoTotal: 22_000,
    perdaIDF: 4_000, perdaIEF: 15_000, perdaICV: 3_000,
    melhorAlavanca: { nome: 'IEF', perda: 15_000 },
    levers: [],
    ...over,
  };
}

function mkRec(over: Partial<IDRecord> = {}): IDRecord {
  return {
    operadora: 'X', rodovia: 'SP-000', km: 0, municipio: 'Y',
    equipamento: 'EQP-1', serie: 1, lote: 'DR-01', tipo: 'A', faixa: 'F1',
    periodo: '2026-04', dias: 30, NHt: 720, NHo: 700,
    IVd: null, INd: null, TId: null, IVn: null, INn: null, TIn: null,
    rfri1: null, rfri2: null, rfri3: null, rfri4: null, rfri5: null,
    rfdt1: null, rfdt2: null, rfdt3: null, rfdt4: null, rfdt5: null, rfdt6: null,
    LPd: null, IVd_ocr: null, LPn: null, IVn_ocr: null,
    QVc: null, QVt: null, pktsInf: null, pktsTraf: null,
    ICId_raw: null, ICIn_raw: null, ILPd_raw: null, ILPn_raw: null,
    c_ICId: 0.9, c_ICIn: 0.85, c_IEVri: 0.95, c_IEVdt: 0.95, c_ILPd: 0.8, c_ILPn: 0.7,
    c_IEF: 0.82, c_IDF: 0.95, c_ICV: 0.9, c_ID: 0.78,
    f_ICId: null, f_ICIn: null, f_IEVri: null, f_IEVdt: null, f_ILPd: null, f_ILPn: null,
    f_IEF: null, f_IDF: null, f_ICV: null, f_ID: null,
    f_MediaEquip: null,
    infracoes: null, validas: null, invalidas: null, contagemVeic: null,
    ...over,
  };
}

describe('finance-engine', () => {
  it('IDF + IEF + ICV = descontoTotal (decomposição proporcional)', () => {
    const g = [mkGroup(), mkGroup({ equipamento: 'EQP-2', valorTotal: 80_000, valorFaixa: 40_000, valorRecebidoTotal: 60_000, descontoTotal: 20_000, perdaIDF: 2_000, perdaIEF: 10_000, perdaICV: 1_000 })];
    const r = [mkRec(), mkRec({ faixa: 'F2', c_ID: 0.78 }), mkRec({ equipamento: 'EQP-2', faixa: 'F1', c_ID: 0.75 })];
    const f = computeFinanceForGroups(g, r);
    expect(Math.abs(f.perdaIDF + f.perdaIEF + f.perdaICV - f.descontoTotal)).toBeLessThan(0.01);
  });

  it('Σ sub-IEF = perdaIEF (após normalização)', () => {
    const g = [mkGroup()];
    const r = [mkRec(), mkRec({ faixa: 'F2' })];
    const f = computeFinanceForGroups(g, r);
    const sum = f.perdaSub.ICId + f.perdaSub.ICIn + f.perdaSub.IEVri + f.perdaSub.IEVdt + f.perdaSub.ILPd + f.perdaSub.ILPn;
    expect(Math.abs(sum - f.perdaIEF)).toBeLessThan(0.01);
  });

  it('contagens de severidade respeitam cortes 0.60 / 0.85', () => {
    const g = [
      mkGroup({ equipamento: 'A', c_ID: 0.50 }),
      mkGroup({ equipamento: 'B', c_ID: 0.70 }),
      mkGroup({ equipamento: 'C', c_ID: 0.90 }),
    ];
    const r = [
      mkRec({ equipamento: 'A', c_ID: 0.50 }),
      mkRec({ equipamento: 'B', c_ID: 0.70 }),
      mkRec({ equipamento: 'C', c_ID: 0.90 }),
    ];
    const f = computeFinanceForGroups(g, r);
    expect(f.equipCriticos).toBe(1);
    expect(f.equipAlerta).toBe(1);
    expect(f.equipOk).toBe(1);
    expect(f.faixasCriticas).toBe(1);
    expect(f.faixasAlerta).toBe(1);
    expect(f.faixasOk).toBe(1);
  });

  it('valorContratado/Recebido/Desconto vêm das somas dos grupos', () => {
    const g = [mkGroup()];
    const r = [mkRec()];
    const f = computeFinanceForGroups(g, r);
    expect(f.valorContratado).toBe(100_000);
    expect(f.valorRecebido).toBe(78_000);
    expect(f.descontoTotal).toBe(22_000);
    expect(f.pctDesconto).toBeCloseTo(0.22, 4);
  });
});
