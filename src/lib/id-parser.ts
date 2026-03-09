import * as XLSX from 'xlsx';
import { IDRecord } from '@/types';
import { EQUIP_CATALOG } from './equip-catalog';
import { sn, parseCurrency, calcICId, calcICIn, calcILPd, calcILPn, calcIEVri, calcIEVdt, calcIEF, calcIDF, calcICV, calcID } from './calc-engine';

/** Column indices matching the reference HTML exactly */
const COL = {
  operadora: 0, rodovia: 1, km: 2, municipio: 3, coords: 4,
  equipamento: 5, tipo: 6, faixa: 7, inicio: 8,
  pktsInf: 9, infracoes: 10, situacao: 11, validas: 12, invalidas: 13, testeEquip: 14,
  pktsTraf: 15, contagemVeic: 16, corretas: 17, incorretas: 18,
  IVd: 19, INd: 20, TId: 21, ICId: 22,
  IVn: 23, INn: 24, TIn: 25, ICIn: 26,
  rfri1: 27, rfri2: 28, rfri3: 29, rfri4: 30, rfri5: 31, IEVri: 32,
  rfdt1: 33, rfdt2: 34, rfdt3: 35, rfdt4: 36, rfdt5: 37, rfdt6: 38, IEVdt: 39,
  LPd: 40, IVd_ocr: 41, ILPd: 42,
  LPn: 43, IVn_ocr: 44, ILPn: 45,
  IEF: 46, QVc: 47, QVt: 48, ICV: 49,
  periodo: 50, dias: 51, NHt: 52, NHo: 53, IDF: 54, ID: 55,
  mediaEquip: 56,
};

function getSerie(equip: string) { return EQUIP_CATALOG[equip]?.serie ?? null; }
function getLote(equip: string) { return EQUIP_CATALOG[equip]?.lote ?? null; }

function computeRecord(raw: unknown[]): IDRecord {
  const g = (i: number) => sn(raw[i]);
  const IVd = g(COL.IVd), INd = g(COL.INd), TId = g(COL.TId);
  const IVn = g(COL.IVn), INn = g(COL.INn), TIn = g(COL.TIn);
  const rfri1 = g(COL.rfri1), rfri2 = g(COL.rfri2), rfri3 = g(COL.rfri3), rfri4 = g(COL.rfri4), rfri5 = g(COL.rfri5);
  const rfdt1 = g(COL.rfdt1), rfdt2 = g(COL.rfdt2), rfdt3 = g(COL.rfdt3), rfdt4 = g(COL.rfdt4), rfdt5 = g(COL.rfdt5), rfdt6 = g(COL.rfdt6);
  const LPd = g(COL.LPd), IVd_ocr = g(COL.IVd_ocr);
  const LPn = g(COL.LPn), IVn_ocr = g(COL.IVn_ocr);
  const QVc = g(COL.QVc), QVt = g(COL.QVt);
  const NHo = g(COL.NHo), NHt = g(COL.NHt);
  const pktsTraf = g(COL.pktsTraf);
  const pktsInf = g(COL.pktsInf);
  const tipo = (raw[COL.tipo] || '').toString().trim().toUpperCase();
  const equip = (raw[COL.equipamento] || '').toString().trim();

  const ICId_raw = (IVd !== null && TId) ? ((IVd + (INd || 0)) / TId) : null;
  const ICIn_raw = (IVn !== null && TIn) ? ((IVn + (INn || 0)) / TIn) : null;
  const ILPd_raw = (IVd_ocr && LPd !== null) ? (LPd / IVd_ocr) : null;
  const ILPn_raw = (IVn_ocr && LPn !== null) ? (LPn / IVn_ocr) : null;

  const c_ICId = calcICId(IVd || 0, INd || 0, TId);
  const c_ICIn = calcICIn(IVn || 0, INn || 0, TIn);
  const c_IEVri = calcIEVri(rfri1, rfri2, rfri3, rfri4, rfri5, pktsInf);
  const c_IEVdt = calcIEVdt(rfdt1, rfdt2, rfdt3, rfdt4, rfdt5, rfdt6, pktsTraf);
  const c_ILPd = calcILPd(LPd, IVd_ocr);
  const c_ILPn = calcILPn(LPn, IVn_ocr);
  const c_IEF = calcIEF(c_ICId, c_ICIn, c_IEVri, c_IEVdt, c_ILPd, c_ILPn);
  const c_IDF = calcIDF(NHo, NHt);
  const c_ICV = calcICV(QVc, QVt);
  const c_ID = calcID(tipo, c_IDF, c_IEF, c_ICV);

  return {
    operadora: (raw[COL.operadora] || '').toString().trim(),
    rodovia: (raw[COL.rodovia] || '').toString().trim(),
    km: sn(raw[COL.km]),
    municipio: (raw[COL.municipio] || '').toString().trim(),
    equipamento: equip,
    serie: getSerie(equip),
    lote: getLote(equip),
    tipo,
    faixa: (raw[COL.faixa] || '').toString().trim(),
    periodo: (raw[COL.periodo] || '').toString().trim(),
    dias: g(COL.dias), NHt, NHo,
    IVd, INd, TId, IVn, INn, TIn,
    rfri1, rfri2, rfri3, rfri4, rfri5,
    rfdt1, rfdt2, rfdt3, rfdt4, rfdt5, rfdt6,
    LPd, IVd_ocr, LPn, IVn_ocr,
    QVc, QVt, pktsInf, pktsTraf,
    ICId_raw, ICIn_raw, ILPd_raw, ILPn_raw,
    c_ICId, c_ICIn, c_IEVri, c_IEVdt, c_ILPd, c_ILPn, c_IEF, c_IDF, c_ICV, c_ID,
    f_ICId: g(COL.ICId), f_ICIn: g(COL.ICIn),
    f_IEVri: g(COL.IEVri), f_IEVdt: g(COL.IEVdt),
    f_ILPd: g(COL.ILPd), f_ILPn: g(COL.ILPn),
    f_IEF: g(COL.IEF), f_IDF: g(COL.IDF),
    f_ICV: g(COL.ICV), f_ID: g(COL.ID),
    f_MediaEquip: g(COL.mediaEquip),
    f_ValorEquip: parseCurrency(raw[COL.valorEquip]),
    f_VlrCobrado: parseCurrency(raw[COL.vlrCobrado]),
    infracoes: g(COL.infracoes), validas: g(COL.validas), invalidas: g(COL.invalidas),
    contagemVeic: g(COL.contagemVeic),
  };
}

export function parseIDFile(buffer: ArrayBuffer): { records: IDRecord[]; period: string } | null {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true }) as unknown[][];

  let dataStart = 3;
  for (let i = 0; i < Math.min(6, raw.length); i++) {
    const r = raw[i];
    if (r && r[0] && String(r[0]).includes('145')) { dataStart = i; break; }
  }

  const dataRows = raw.slice(dataStart).filter(r => r && r[0] && String(r[0]).trim());
  const records = dataRows.map(computeRecord).filter(r => r.equipamento);

  if (!records.length) return null;
  const period = records[0].periodo || 'Desconhecido';
  return { records, period };
}
