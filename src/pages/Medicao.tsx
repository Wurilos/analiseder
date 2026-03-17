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

const EMPTY_ROWS = 9;

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
      margin: [3, 3, 3, 3],
      filename: `Medicao_${numMedicao || 'X'}_DR08.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2.5, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    }).from(printRef.current).save();
  };

  const medicaoLabel = numMedicao ? `${numMedicao}ª MEDIÇÃO` : '___ª MEDIÇÃO';
  const obrasLabel = formatDateBR(obrasAte);

  const b = '1px solid #000';
  const bNone = 'none';

  const chk = (filled: boolean) => (
    <span style={{
      display: 'inline-block', width: '12px', height: '12px',
      border: '1.5px solid #000', verticalAlign: 'middle', marginRight: '3px',
      background: filled ? '#000' : '#fff', lineHeight: '12px',
      textAlign: 'center', fontSize: '9px', color: filled ? '#fff' : '#000',
    }}>{filled ? '' : '\u00A0'}</span>
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
        <CardContent className="p-3 overflow-x-auto" style={{ background: '#e5e5e5' }}>

          {/* ============ PRINTABLE AREA ============ */}
          <div ref={printRef} style={{
            background: '#fff', color: '#000', fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '10px', width: '280mm', lineHeight: 1.25, padding: '0',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000' }}>

              {/* ═══ HEADER ═══ */}
              <tbody>
                <tr>
                  <td style={{ borderBottom: b, borderRight: bNone, padding: '10px 14px', verticalAlign: 'middle', width: '85%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <img src="/images/brasao-sp.png" alt="Brasão SP" style={{ width: '56px', height: '60px', objectFit: 'contain' }} />
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: '11px', letterSpacing: '0.5px' }}>SECRETARIA DO MEIO AMBIENTE INFRAESTRUTURA E LOGÍSTICA</div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '2px', letterSpacing: '0.5px' }}>DEPARTAMENTO DE ESTRADAS DE RODAGEM</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ borderBottom: b, padding: '10px 14px', verticalAlign: 'middle', textAlign: 'right', width: '15%' }}>
                  </td>
                </tr>

                {/* ═══ CONTINUAÇÃO ROW ═══ */}
                <tr>
                  <td style={{ borderBottom: b, borderRight: bNone, padding: '4px 14px' }}></td>
                  <td style={{ borderBottom: b, padding: '4px 14px', textAlign: 'right', fontSize: '10px', whiteSpace: 'nowrap' }}>
                    Continuação: &nbsp;{chk(false)} sim &nbsp;&nbsp;{chk(true)}não
                  </td>
                </tr>

                {/* ═══ SINALIZAÇÃO ROWS ═══ */}
                {SINALIZACAO.map(r => (
                  <tr key={r.cod}>
                    <td style={{ borderBottom: b, borderRight: bNone, padding: '3px 14px', fontSize: '10px' }}>
                      {r.cod} {r.desc}
                    </td>
                    <td style={{ borderBottom: b, padding: '3px 14px', textAlign: 'right', fontSize: '10px' }}></td>
                  </tr>
                ))}

                {/* ═══ BLANK SEPARATOR ═══ */}
                <tr>
                  <td style={{ borderBottom: b, borderRight: bNone, height: '8px' }}></td>
                  <td style={{ borderBottom: b, height: '8px' }}></td>
                </tr>

                {/* ═══ EQUIPAMENTOS ROWS ═══ */}
                {EQUIPAMENTOS.map(r => {
                  const val = idSums[r.cod] ?? 0;
                  return (
                    <tr key={r.cod}>
                      <td style={{ borderBottom: b, borderRight: bNone, padding: '3px 14px', fontSize: '10px' }}>
                        {r.cod} {r.desc}
                      </td>
                      <td style={{ borderBottom: b, padding: '3px 14px', textAlign: 'right', fontSize: '10px', fontFamily: 'Arial, sans-serif' }}>
                        {val > 0 ? val.toFixed(2).replace('.', ',') : ''}
                      </td>
                    </tr>
                  );
                })}

                {/* ═══ EMPTY ROWS ═══ */}
                {Array.from({ length: EMPTY_ROWS }).map((_, i) => (
                  <tr key={`e${i}`}>
                    <td style={{ borderBottom: b, borderRight: bNone, height: '22px' }}></td>
                    <td style={{ borderBottom: b, height: '22px' }}></td>
                  </tr>
                ))}

                {/* ═══ FOOTER ═══ */}
                <tr>
                  <td colSpan={2} style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        {/* Footer main row */}
                        <tr>
                          <td style={{
                            borderTop: b, borderRight: b, padding: '12px 10px 8px',
                            verticalAlign: 'bottom', fontSize: '10px', width: '22%',
                          }}>
                            De acordo:______________________
                          </td>
                          <td style={{
                            borderTop: b, borderRight: b, padding: '12px 10px 8px',
                            verticalAlign: 'bottom', fontSize: '10px', width: '18%',
                          }}>
                            Continua: &nbsp;{chk(false)} sim &nbsp;&nbsp;{chk(true)} não
                          </td>
                          <td style={{
                            borderTop: b, borderRight: b, padding: '8px 10px',
                            textAlign: 'center', verticalAlign: 'top', width: '22%',
                          }}>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '6px' }}>{medicaoLabel}</div>
                            <div style={{ textAlign: 'left', paddingLeft: '24%', fontSize: '10px' }}>
                              <div style={{ marginBottom: '3px' }}>{chk(true)} Provisória</div>
                              <div>{chk(false)} Final</div>
                            </div>
                            <div style={{ marginTop: '10px', fontSize: '10px' }}>obras executadas até {obrasLabel}</div>
                          </td>
                          <td style={{
                            borderTop: b, borderRight: b, padding: '8px 10px',
                            fontSize: '8px', lineHeight: '1.4', verticalAlign: 'top', width: '30%',
                          }}>
                            <div>Contrato n.º: <strong>22.583-6</strong></div>
                            <div>
                              Objeto: Contratação de Serviços de Fiscalização do
                              Controle de Velocidade e Contagem Classificatória,
                              nas Rodovias Localizadas no Estado de São Paulo
                              Sob Circunscrição do DER/SP, divididos em 14
                              lotes. Lote 8.
                            </div>
                            <div style={{ marginTop: '2px' }}>
                              <strong>Empresa</strong>: Splice Industria Comércio e Serviços Ltda.
                            </div>
                          </td>
                          <td style={{
                            borderTop: b, padding: '8px 10px',
                            textAlign: 'center', verticalAlign: 'top', fontSize: '10px', width: '8%',
                          }}>
                            <div>Fls.</div>
                            <div style={{ fontWeight: 'bold', marginTop: '8px' }}>01/01</div>
                          </td>
                        </tr>

                        {/* Signature row */}
                        <tr>
                          <td style={{
                            borderTop: b, borderRight: b, padding: '4px 10px 6px',
                            textAlign: 'center', fontSize: '9px', verticalAlign: 'bottom',
                          }}>
                            <div style={{ marginBottom: '2px' }}>________________________________</div>
                            Contratante
                          </td>
                          <td colSpan={2} style={{
                            borderTop: b, borderRight: b, padding: '4px 10px 6px',
                            textAlign: 'center', fontSize: '9px', verticalAlign: 'bottom',
                          }}>
                            <div style={{ marginBottom: '2px' }}>________________________________</div>
                            Engenheiro Fiscal
                          </td>
                          <td style={{ borderTop: b, borderRight: b, padding: '6px' }}></td>
                          <td style={{ borderTop: b, padding: '6px' }}></td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* DER-621 */}
            <div style={{ fontSize: '8px', marginTop: '3px', paddingLeft: '6px' }}>DER-621</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
