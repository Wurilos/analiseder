import React, { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useData } from '@/context/DataContext';
import { EQUIP_CATALOG } from '@/lib/equip-catalog';
import { FileDown, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import html2pdf from 'html2pdf.js';

const SINALIZACAO = [
  { cod: '28.88.30.01', desc: 'Placa Alum. Composto, Esp.3mm. Mod. Aérea Pelic.Ret Tipo III + II-F.1' },
  { cod: '28.88.30.02', desc: 'Semi-Portico Metalico com Vão de 8,3m, Vento 35 M/S' },
  { cod: '28.88.30.03', desc: 'Suporte com 3,90m P/Placa Sinaliz em Madeira Tratada 10x10 Forn.Implant' },
  { cod: '28.88.30.05', desc: 'Suporte Colapsivel com 6,90m para Placa de Sinalização > 5 Mô – Forn. Implant' },
  { cod: '28.88.30.06', desc: 'Suporte Metalico C/Braço Projetado-Area de Expos. Até 4,50 Mô – Forn. Implant' },
  { cod: '28.88.30.07', desc: 'Defensa Metalica (HIAW4) – Fornec. E Implantação' },
  { cod: '28.88.30.08', desc: 'Term. ABS. Energia Especif. Conf. NCHRP 350 Nivel de Ensaio 70/80KM' },
  { cod: '28.88.30.09', desc: 'Term. ABS. Energia Especif. Conf. NCHRP 350 Nivel de Ensaio 100KM/H F. I' },
  { cod: '28.88.30.10', desc: 'Suporte Duplo Metal. CO Galvan.C/M 6,00M Cada P/ - 4,00X3,00 F. I' },
];

const EQUIPAMENTOS = [
  { cod: '34.88.78.01', desc: 'Disp. e Manut. Equip Control. Elet. Velocidade (CEV), com OCR 02 FXS' },
  { cod: '34.88.78.02', desc: 'Disp. e Manut. Equip Control. Elet. Velocidade (CEV), com OCR 03 FXS' },
  { cod: '34.88.78.03', desc: 'Disp. e Manut. Equip Control. Elet. Velocidade (CEV), com OCR 04 FXS' },
  { cod: '34.88.78.06', desc: 'Disp. e Manut. Equip Control. Elet. Velocidade (CEV), com OCR 02 FXS' },
  { cod: '34.88.78.07', desc: 'Disp. e Manut. Equip Control. Elet. Velocidade (CEV), com OCR 03 FXS' },
];

const EMPTY_ROWS = 10;

function formatDateBR(dateStr: string): string {
  if (!dateStr) return '___/___/______';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export default function MedicaoPage() {
  const { getActiveRecords } = useData();
  const [numMedicao, setNumMedicao] = useState('');
  const [obrasAte, setObrasAte] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const idSums = useMemo(() => {
    const records = getActiveRecords();
    const sums: Record<string, number> = {};
    const dr08Equips: Record<string, string[]> = {};
    Object.entries(EQUIP_CATALOG).forEach(([codigo, info]) => {
      if (info.lote === 'DR-08' && info.codMedicao) {
        if (!dr08Equips[info.codMedicao]) dr08Equips[info.codMedicao] = [];
        dr08Equips[info.codMedicao].push(codigo);
      }
    });
    Object.entries(dr08Equips).forEach(([codMed, equipCodes]) => {
      let sum = 0;
      equipCodes.forEach(code => {
        const rec = records.find(r => r.equipamento === code);
        if (rec) {
          const id = rec.f_ID ?? rec.c_ID ?? null;
          if (id !== null) sum += id;
        }
      });
      sums[codMed] = sum;
    });
    return sums;
  }, [getActiveRecords]);

  const handleExportPDF = () => {
    if (!printRef.current) return;
    html2pdf().set({
      margin: [2, 2, 2, 2],
      filename: `Medicao_${numMedicao || 'X'}_DR08.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2.5, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    }).from(printRef.current).save();
  };

  const medicaoLabel = numMedicao ? `${numMedicao}ª MEDIÇÃO` : '___ª MEDIÇÃO';
  const obrasLabel = formatDateBR(obrasAte);

  // Inline styles for PDF fidelity
  const border = '1px solid #000';
  const S: Record<string, React.CSSProperties> = {
    page: {
      background: '#fff', color: '#000', fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '9.5px', width: '277mm', lineHeight: 1.3,
    },
    outerTable: { width: '100%', borderCollapse: 'collapse', border: '2px solid #000' },
    // header
    headerRow: {},
    headerLeft: { border, padding: '8px 12px', verticalAlign: 'middle' },
    headerRight: { border, padding: '8px 12px', textAlign: 'right' as const, verticalAlign: 'middle', fontSize: '9.5px' },
    logoWrap: { display: 'flex', alignItems: 'center', gap: '12px' },
    logoBox: { width: '52px', minWidth: '52px' },
    headerTitles: { textAlign: 'center' as const, flex: 1 },
    titleSub: { fontSize: '10px', fontWeight: 'normal' as const, margin: 0 },
    titleMain: { fontSize: '13px', fontWeight: 'bold' as const, margin: '2px 0 0' },
    // data rows
    dataCell: { border, padding: '2.5px 8px', fontSize: '9.5px' },
    valCell: { border, padding: '2.5px 8px', fontSize: '9.5px', textAlign: 'right' as const, width: '70px', fontFamily: 'Arial, sans-serif' },
    emptyRow: { border, height: '20px', padding: 0 },
    // footer
    footerOuter: { border, padding: 0 },
    footerTable: { width: '100%', borderCollapse: 'collapse' as const },
    ftDeAcordo: { border, padding: '10px 8px', verticalAlign: 'bottom' as const, fontSize: '9px', width: '22%' },
    ftContinua: { border, padding: '10px 8px', verticalAlign: 'bottom' as const, fontSize: '9px', width: '16%' },
    ftMedicao: { border, padding: '8px', textAlign: 'center' as const, verticalAlign: 'top' as const, width: '22%' },
    ftContrato: { border, padding: '8px', fontSize: '7.5px', lineHeight: '1.35', verticalAlign: 'top' as const, width: '32%' },
    ftFls: { border, padding: '8px', textAlign: 'center' as const, verticalAlign: 'top' as const, fontSize: '9px', width: '8%' },
    ftSigLeft: { border, padding: '6px 8px', fontSize: '8px', textAlign: 'center' as const, verticalAlign: 'bottom' as const },
    ftSigRight: { border, padding: '6px 8px', fontSize: '8px', textAlign: 'center' as const, verticalAlign: 'bottom' as const },
  };

  const checkbox = (checked: boolean) => (
    <span style={{
      display: 'inline-block', width: '11px', height: '11px',
      border: '1px solid #000', textAlign: 'center', lineHeight: '11px',
      fontSize: '9px', verticalAlign: 'middle', marginRight: '2px',
      background: checked ? '#000' : '#fff', color: checked ? '#fff' : '#000',
    }}>
      {checked ? '✓' : '\u00A0'}
    </span>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Medição — DR-08</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Geração do formulário DER-621 para medição de serviços do Lote 8.
        </p>
      </motion.div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" /> Dados da Medição
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="numMedicao">Número da Medição</Label>
            <Input id="numMedicao" placeholder="Ex: 12" value={numMedicao} onChange={e => setNumMedicao(e.target.value)} />
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="obrasAte">Obras executadas até</Label>
            <Input id="obrasAte" type="date" value={obrasAte} onChange={e => setObrasAte(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={handleExportPDF} className="gap-2">
              <FileDown className="w-4 h-4" /> Exportar PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pré-visualização</CardTitle>
        </CardHeader>
        <CardContent className="p-2 overflow-x-auto bg-neutral-100">
          {/* ============ PRINTABLE AREA ============ */}
          <div ref={printRef} style={S.page}>
            <table style={S.outerTable}>
              {/* ── HEADER ── */}
              <thead>
                <tr>
                  <td colSpan={2} style={S.headerLeft}>
                    <div style={S.logoWrap}>
                      <div style={S.logoBox}>
                        {/* Simplified DER logo placeholder */}
                        <svg viewBox="0 0 50 56" width="42" height="48" style={{ display: 'block' }}>
                          <rect x="0" y="0" width="50" height="56" fill="none" />
                          <text x="25" y="16" textAnchor="middle" fontSize="5" fontWeight="bold" fontFamily="Arial">SECRETARIA DOS</text>
                          <text x="25" y="22" textAnchor="middle" fontSize="5" fontWeight="bold" fontFamily="Arial">TRANSPORTES</text>
                          <path d="M15 28 L25 50 L35 28 Z" fill="#000" />
                          <text x="25" y="40" textAnchor="middle" fontSize="5.5" fontWeight="bold" fill="#fff" fontFamily="Arial">DER</text>
                          <text x="25" y="46" textAnchor="middle" fontSize="3.5" fill="#fff" fontFamily="Arial">SP</text>
                        </svg>
                      </div>
                      <div style={S.headerTitles}>
                        <p style={S.titleSub}>SECRETARIA DO MEIO AMBIENTE INFRAESTRUTURA E LOGÍSTICA</p>
                        <p style={S.titleMain}>DEPARTAMENTO DE ESTRADAS DE RODAGEM</p>
                      </div>
                    </div>
                  </td>
                  <td style={S.headerRight}>
                    Continuação: &nbsp;{checkbox(false)} sim &nbsp;&nbsp;{checkbox(true)}não
                  </td>
                </tr>
              </thead>

              <tbody>
                {/* ── SINALIZAÇÃO ── */}
                {SINALIZACAO.map(r => (
                  <tr key={r.cod}>
                    <td colSpan={2} style={S.dataCell}>{r.cod} {r.desc}</td>
                    <td style={S.valCell}></td>
                  </tr>
                ))}

                {/* ── BLANK SEPARATOR ── */}
                <tr>
                  <td colSpan={2} style={{ ...S.emptyRow, border }}></td>
                  <td style={{ ...S.emptyRow, border }}></td>
                </tr>

                {/* ── EQUIPAMENTOS ── */}
                {EQUIPAMENTOS.map(r => {
                  const val = idSums[r.cod] ?? 0;
                  return (
                    <tr key={r.cod}>
                      <td colSpan={2} style={S.dataCell}>{r.cod} {r.desc}</td>
                      <td style={S.valCell}>{val > 0 ? val.toFixed(2).replace('.', ',') : ''}</td>
                    </tr>
                  );
                })}

                {/* ── EMPTY ROWS ── */}
                {Array.from({ length: EMPTY_ROWS }).map((_, i) => (
                  <tr key={`e${i}`}>
                    <td colSpan={2} style={{ ...S.emptyRow, border }}></td>
                    <td style={{ ...S.emptyRow, border }}></td>
                  </tr>
                ))}

                {/* ── FOOTER ── */}
                <tr>
                  <td colSpan={3} style={S.footerOuter}>
                    <table style={S.footerTable}>
                      <tbody>
                        <tr>
                          {/* De acordo */}
                          <td style={S.ftDeAcordo}>
                            De acordo:______________________
                          </td>
                          {/* Continua */}
                          <td style={S.ftContinua}>
                            Continua: &nbsp;{checkbox(false)} sim &nbsp;{checkbox(true)} não
                          </td>
                          {/* Medição */}
                          <td style={S.ftMedicao}>
                            <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '4px' }}>{medicaoLabel}</div>
                            <div style={{ textAlign: 'left', paddingLeft: '20%' }}>
                              <div>{checkbox(true)} Provisória</div>
                              <div style={{ marginTop: '3px' }}>{checkbox(false)} Final</div>
                            </div>
                            <div style={{ marginTop: '8px', fontSize: '9px' }}>obras executadas até {obrasLabel}</div>
                          </td>
                          {/* Contrato */}
                          <td style={S.ftContrato}>
                            <div>Contrato n.º: <strong>22.583-6</strong></div>
                            <div style={{ marginTop: '1px' }}>
                              Objeto: Contratação de Serviços de Fiscalização do Controle de Velocidade e Contagem Classificatória,
                              nas Rodovias Localizadas no Estado de São Paulo Sob Circunscrição do DER/SP, divididos em 14 lotes. Lote 8.
                            </div>
                            <div style={{ marginTop: '2px' }}>
                              <strong>Empresa</strong>: Splice Industria Comércio e Serviços Ltda.
                            </div>
                          </td>
                          {/* Fls */}
                          <td style={S.ftFls}>
                            <div>Fls.</div>
                            <div style={{ fontWeight: 'bold', marginTop: '6px' }}>01/01</div>
                          </td>
                        </tr>
                        {/* Signature row */}
                        <tr>
                          <td style={S.ftSigLeft}>
                            ________________________________<br />Contratante
                          </td>
                          <td colSpan={2} style={S.ftSigRight}>
                            ________________________________<br />Engenheiro Fiscal
                          </td>
                          <td colSpan={2} style={{ border, padding: '6px' }}></td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
            <div style={{ fontSize: '8px', marginTop: '2px', paddingLeft: '4px' }}>DER-621</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
