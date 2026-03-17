import React, { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useData } from '@/context/DataContext';
import { EQUIP_CATALOG } from '@/lib/equip-catalog';
import { FileDown, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import html2pdf from 'html2pdf.js';

// ════════════════════════════════════════════
// DR-08 Data
// ════════════════════════════════════════════
const DR08_SINALIZACAO = [
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

const DR08_EQUIPS = [
  { cod: '34.88.78.01', desc: 'Disp. e Manut. Equip Control. Elet. Velocidade (CEV), com OCR 02 FXS' },
  { cod: '34.88.78.02', desc: 'Disp. e Manut. Equip Control. Elet. Velocidade (CEV), com OCR 03 FXS' },
  { cod: '34.88.78.03', desc: 'Disp. e Manut. Equip Control. Elet. Velocidade (CEV), com OCR 04 FXS' },
  { cod: '34.88.78.06', desc: 'Disp. e Manut. Equip Control. Elet. Velocidade (CEV), com OCR 02 FXS' },
  { cod: '34.88.78.07', desc: 'Disp. e Manut. Equip Control. Elet. Velocidade (CEV), com OCR 03 FXS' },
];

// ════════════════════════════════════════════
// DR-14 Data
// ════════════════════════════════════════════
const DR14_EQUIPS = [
  { cod: '34.88.78.01', desc: 'DISP.E MANUT.EQUIP CONTROL. ELET. VELOCIDADE (CEV), COM OCR 02 FXS' },
  { cod: '34.88.78.02', desc: 'DISP.E MANUT.EQUIP CONTROL. ELET. VELOCIDADE (CEV), COM OCR 03 FXS' },
  { cod: '34.88.78.03', desc: 'DISP.E MANUT.EQUIP CONTROL. ELET. VELOCIDADE (CEV), COM OCR 04 FXS' },
  { cod: '34.88.78.06', desc: 'DISP.E MANUT.EQUIP CONTROL. ELET. COMPOSTO VELOCIDADE (CEC), COM OCR 02 FXS' },
  { cod: '34.88.78.07', desc: 'DISP.E MANUT.EQUIP CONTROL. ELET. COMPOSTO VELOCIDADE (CEC), COM OCR 03 FXS' },
  { cod: '34.88.78.08', desc: 'DISP.E MANUT.EQUIP CONTROL. ELET. COMPOSTO VELOCIDADE (CEC), COM OCR 04 FXS' },
  { cod: '34.88.78.12', desc: 'DISP.E MANUT.EQUIP. REDUTOR VELOC. COM OCR REDUTOR-LOMBADA TIPO II' },
];

function formatDateBR(dateStr: string): string {
  if (!dateStr) return '___/___/______';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return '__/__/__';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

// ════════════════════════════════════════════
// Helper: get equipment data grouped by codMedicao for a lote
// ════════════════════════════════════════════
function useEquipData(lote: string, records: any[]) {
  return useMemo(() => {
    const groups: Record<string, { codigo: string; endereco: string; id: number | null }[]> = {};
    const sums: Record<string, number> = {};

    Object.entries(EQUIP_CATALOG).forEach(([codigo, info]) => {
      if (info.lote !== lote || !info.codMedicao) return;
      if (!groups[info.codMedicao]) groups[info.codMedicao] = [];

      const rec = records.find(r => r.equipamento === codigo);
      const id = rec ? (rec.f_ID ?? rec.c_ID ?? null) : null;

      groups[info.codMedicao].push({ codigo, endereco: info.endereco, id });

      if (!sums[info.codMedicao]) sums[info.codMedicao] = 0;
      if (id !== null) sums[info.codMedicao] += id;
    });

    return { groups, sums };
  }, [lote, records]);
}

// ════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════
export default function MedicaoPage() {
  const { getActiveRecords } = useData();
  const [numMedicao, setNumMedicao] = useState('');
  const [obrasAte, setObrasAte] = useState('');
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [activeLote, setActiveLote] = useState('DR-08');
  const printRef08 = useRef<HTMLDivElement>(null);
  const printRef14 = useRef<HTMLDivElement>(null);

  const records = useMemo(() => getActiveRecords(), [getActiveRecords]);
  const dr08Data = useEquipData('DR-08', records);
  const dr14Data = useEquipData('DR-14', records);

  const handleExportPDF = () => {
    const ref = activeLote === 'DR-08' ? printRef08.current : printRef14.current;
    if (!ref) return;
    html2pdf().set({
      margin: [2, 2, 2, 2],
      filename: `Medicao_${numMedicao || 'X'}_${activeLote}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2.5, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
      pagebreak: { mode: 'avoid-all' },
    }).from(ref).save();
  };

  const medicaoLabel = numMedicao ? `${numMedicao}ª MEDIÇÃO` : '___ª MEDIÇÃO';
  const medicaoRef = numMedicao ? `${numMedicao}ª Medição` : '___ª Medição';
  const obrasLabel = formatDateBR(obrasAte);
  const periodoLabel = periodoInicio && periodoFim
    ? `${formatDateShort(periodoInicio)} a ${formatDateShort(periodoFim)}`
    : '__/__/__ a __/__/__';

  const b = '1px solid #000';

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
        <h1 className="text-2xl font-bold text-foreground">Medição</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Geração dos formulários de medição para faturamento.
        </p>
      </motion.div>

      <Tabs value={activeLote} onValueChange={setActiveLote}>
        <TabsList>
          <TabsTrigger value="DR-08">DR-08 (DER-621)</TabsTrigger>
          <TabsTrigger value="DR-14">DR-14 (Memória de Cálculo)</TabsTrigger>
        </TabsList>

        {/* ── Inputs ── */}
        <Card className="mt-4">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" /> Dados da Medição
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4 flex-wrap">
            <div className="flex-1 min-w-[140px] space-y-1.5">
              <Label>Número da Medição</Label>
              <Input placeholder="Ex: 12" value={numMedicao} onChange={e => setNumMedicao(e.target.value)} />
            </div>
            {activeLote === 'DR-08' ? (
              <div className="flex-1 min-w-[140px] space-y-1.5">
                <Label>Obras executadas até</Label>
                <Input type="date" value={obrasAte} onChange={e => setObrasAte(e.target.value)} />
              </div>
            ) : (
              <>
                <div className="flex-1 min-w-[140px] space-y-1.5">
                  <Label>Período — Início</Label>
                  <Input type="date" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} />
                </div>
                <div className="flex-1 min-w-[140px] space-y-1.5">
                  <Label>Período — Fim</Label>
                  <Input type="date" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} />
                </div>
              </>
            )}
            <div className="flex items-end">
              <Button onClick={handleExportPDF} className="gap-2">
                <FileDown className="w-4 h-4" /> Exportar PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ══════════════════════════════════════════ */}
        {/* DR-08 TAB */}
        {/* ══════════════════════════════════════════ */}
        <TabsContent value="DR-08">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2"><CardTitle className="text-base">Pré-visualização — DER-621</CardTitle></CardHeader>
            <CardContent className="p-3 overflow-x-auto" style={{ background: '#e5e5e5' }}>
              <div ref={printRef08} style={{
                background: '#fff', color: '#000', fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '9px', width: '280mm', lineHeight: 1.2,
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000' }}>
                  <tbody>
                    {/* Header */}
                    <tr>
                      <td style={{ borderBottom: b, padding: '6px 10px', verticalAlign: 'middle', width: '85%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img src="/images/brasao-sp.png" alt="" style={{ width: '56px', height: '60px', objectFit: 'contain' }} />
                          <div style={{ textAlign: 'center', flex: 1 }}>
                            <div style={{ fontSize: '11px', letterSpacing: '0.5px' }}>SECRETARIA DO MEIO AMBIENTE INFRAESTRUTURA E LOGÍSTICA</div>
                            <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '2px', letterSpacing: '0.5px' }}>DEPARTAMENTO DE ESTRADAS DE RODAGEM</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ borderBottom: b, padding: '6px 10px', textAlign: 'right', width: '15%' }}></td>
                    </tr>
                    {/* Continuação */}
                    <tr>
                      <td style={{ borderBottom: b, padding: '2px 10px' }}></td>
                      <td style={{ borderBottom: b, padding: '2px 10px', textAlign: 'right', fontSize: '9px', whiteSpace: 'nowrap' }}>
                        Continuação: &nbsp;{chk(false)} sim &nbsp;&nbsp;{chk(true)}não
                      </td>
                    </tr>
                    {/* Sinalização */}
                    {DR08_SINALIZACAO.map(r => (
                      <tr key={r.cod}>
                        <td style={{ borderBottom: b, padding: '2px 10px', fontSize: '9px' }}>{r.cod} {r.desc}</td>
                        <td style={{ borderBottom: b, padding: '2px 10px', textAlign: 'right' }}></td>
                      </tr>
                    ))}
                    <tr><td style={{ borderBottom: b, height: '4px' }}></td><td style={{ borderBottom: b, height: '4px' }}></td></tr>
                    {/* Equipamentos */}
                    {DR08_EQUIPS.map(r => {
                      const val = dr08Data.sums[r.cod] ?? 0;
                      return (
                        <tr key={r.cod}>
                          <td style={{ borderBottom: b, padding: '3px 14px', fontSize: '10px' }}>{r.cod} {r.desc}</td>
                          <td style={{ borderBottom: b, padding: '3px 14px', textAlign: 'right', fontSize: '10px' }}>
                            {val > 0 ? val.toFixed(2).replace('.', ',') : ''}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Empty rows */}
                    {Array.from({ length: 9 }).map((_, i) => (
                      <tr key={`e${i}`}><td style={{ borderBottom: b, height: '22px' }}></td><td style={{ borderBottom: b, height: '22px' }}></td></tr>
                    ))}
                    {/* Footer */}
                    <tr>
                      <td colSpan={2} style={{ padding: 0 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <tbody>
                            <tr>
                              <td style={{ borderTop: b, borderRight: b, padding: '12px 10px 8px', verticalAlign: 'bottom', fontSize: '10px', width: '22%' }}>
                                De acordo:______________________
                              </td>
                              <td style={{ borderTop: b, borderRight: b, padding: '12px 10px 8px', verticalAlign: 'bottom', fontSize: '10px', width: '18%' }}>
                                Continua: &nbsp;{chk(false)} sim &nbsp;&nbsp;{chk(true)} não
                              </td>
                              <td style={{ borderTop: b, borderRight: b, padding: '8px 10px', textAlign: 'center', verticalAlign: 'top', width: '22%' }}>
                                <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '6px' }}>{medicaoLabel}</div>
                                <div style={{ textAlign: 'left', paddingLeft: '24%', fontSize: '10px' }}>
                                  <div style={{ marginBottom: '3px' }}>{chk(true)} Provisória</div>
                                  <div>{chk(false)} Final</div>
                                </div>
                                <div style={{ marginTop: '10px', fontSize: '10px' }}>obras executadas até {obrasLabel}</div>
                              </td>
                              <td style={{ borderTop: b, borderRight: b, padding: '8px 10px', fontSize: '8px', lineHeight: '1.4', verticalAlign: 'top', width: '30%' }}>
                                <div>Contrato n.º: <strong>22.583-6</strong></div>
                                <div>Objeto: Contratação de Serviços de Fiscalização do Controle de Velocidade e Contagem Classificatória, nas Rodovias Localizadas no Estado de São Paulo Sob Circunscrição do DER/SP, divididos em 14 lotes. Lote 8.</div>
                                <div style={{ marginTop: '2px' }}><strong>Empresa</strong>: Splice Industria Comércio e Serviços Ltda.</div>
                              </td>
                              <td style={{ borderTop: b, padding: '8px 10px', textAlign: 'center', verticalAlign: 'top', fontSize: '10px', width: '8%' }}>
                                <div>Fls.</div><div style={{ fontWeight: 'bold', marginTop: '8px' }}>01/01</div>
                              </td>
                            </tr>
                            <tr>
                              <td style={{ borderTop: b, borderRight: b, padding: '4px 10px 6px', textAlign: 'center', fontSize: '9px', verticalAlign: 'bottom' }}>
                                ________________________________<br />Contratante
                              </td>
                              <td colSpan={2} style={{ borderTop: b, borderRight: b, padding: '4px 10px 6px', textAlign: 'center', fontSize: '9px', verticalAlign: 'bottom' }}>
                                ________________________________<br />Engenheiro Fiscal
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
                <div style={{ fontSize: '8px', marginTop: '3px', paddingLeft: '6px' }}>DER-621</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════ */}
        {/* DR-14 TAB */}
        {/* ══════════════════════════════════════════ */}
        <TabsContent value="DR-14">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2"><CardTitle className="text-base">Pré-visualização — Memória de Cálculo</CardTitle></CardHeader>
            <CardContent className="p-3 overflow-x-auto" style={{ background: '#e5e5e5' }}>
              <div ref={printRef14} style={{
                background: '#fff', color: '#000', fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '9px', width: '280mm', lineHeight: 1.3, padding: '10px 14px',
              }}>
                {/* ── Header ── */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '15%', verticalAlign: 'middle' }}>
                        <img src="/images/logo-der.jpg" alt="DER" style={{ width: '70px', objectFit: 'contain' }} />
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ fontSize: '10px' }}>SECRETARIA DE MEIO AMBIENTE, INFRAESTRUTURA E LOGÍSTICA</div>
                        <div style={{ fontSize: '12px', fontWeight: 'bold' }}>DEPARTAMENTO DE ESTRADAS DE RODAGEM</div>
                      </td>
                      <td style={{ width: '15%', textAlign: 'right', verticalAlign: 'middle' }}>
                        <img src="/images/brasao-sp.png" alt="SP" style={{ width: '50px', objectFit: 'contain' }} />
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11px', margin: '8px 0' }}>MEMORIA DE CALCULO</div>

                {/* Sub-header info */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px', fontSize: '9px' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '40%' }}>COORDENADORIA GERAL REGIONAL DE BARRETOS - CGR.14</td>
                      <td style={{ textAlign: 'center', width: '20%' }}>Contrato: 22.589-7</td>
                      <td style={{ textAlign: 'right', width: '40%' }}>
                        <div>Atesto da {medicaoRef} Provisória</div>
                        <div>{periodoLabel}</div>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} style={{ paddingTop: '2px' }}>
                        Contratada: &nbsp;Splice Industria Comércio e Serviços Ltda
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Object description */}
                <div style={{
                  fontSize: '8px', fontWeight: 'bold', padding: '4px 0', borderTop: b, borderBottom: b,
                  marginBottom: '2px', lineHeight: 1.3,
                }}>
                  CONTRATAÇÃO DE SERVIÇOS DE FISCALIZAÇÃO DO CONTROLE DE VELOCIDADE E CONTAGEM CLASSIFICATÓRIA,
                  NAS RODOVIAS LOCALIZADAS NO ESTADO DE SÃO PAULO SOB CIRCUNSCRIÇÃO DO DER/SP, DIVIDIDOS EM 14 LOTES. LOTE 14
                </div>

                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '9px', padding: '4px 0', borderBottom: b }}>
                  FASE 34 - SINALIZAÇÃO E ELEMENTOS DE SEGURANÇA
                </div>

                {/* ── Main Table ── */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '2px', fontSize: '8.5px' }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: '10%', borderBottom: b }}>ITEM</th>
                      <th style={{ ...thStyle, width: '50%', textAlign: 'left', borderBottom: b }}>SERVIÇO</th>
                      <th style={{ ...thStyle, width: '10%', borderBottom: b }}></th>
                      <th style={{ ...thStyle, width: '10%', borderBottom: b }}></th>
                      <th style={{ ...thStyle, width: '10%', borderBottom: b }}></th>
                      <th style={{ ...thStyle, width: '10%', borderBottom: b }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {DR14_EQUIPS.map(eq => {
                      const equipList = dr14Data.groups[eq.cod] || [];
                      const acum = dr14Data.sums[eq.cod] ?? 0;

                      return (
                        <React.Fragment key={eq.cod}>
                          {/* Code header row */}
                          <tr>
                            <td style={{ ...tdStyle, fontWeight: 'bold', borderBottom: b, borderTop: '1.5px solid #000', paddingTop: '6px' }}>
                              {eq.cod}
                            </td>
                            <td style={{ ...tdStyle, fontWeight: 'bold', borderBottom: b, borderTop: '1.5px solid #000', paddingTop: '6px' }}>
                              {eq.desc}
                            </td>
                            <td style={{ ...tdStyle, borderBottom: b, borderTop: '1.5px solid #000' }}></td>
                            <td style={{ ...tdStyle, borderBottom: b, borderTop: '1.5px solid #000' }}></td>
                            <td style={{ ...tdStyle, textAlign: 'right', borderBottom: b, borderTop: '1.5px solid #000', fontSize: '8px' }}>
                              Acumulado
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold', borderBottom: b, borderTop: '1.5px solid #000' }}>
                              {acum > 0 ? acum.toFixed(2).replace('.', ',') : '-'}
                            </td>
                          </tr>
                          {/* Sub-header row */}
                          <tr>
                            <td style={tdStyle}></td>
                            <td style={{ ...tdStyle, fontWeight: 'bold', fontSize: '8px' }}>Local</td>
                            <td style={{ ...tdStyle, fontWeight: 'bold', fontSize: '8px', textAlign: 'center' }}>Quantidade</td>
                            <td style={tdStyle}></td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontSize: '8px', fontWeight: 'bold' }}>Mensal</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>
                              {acum > 0 ? acum.toFixed(2).replace('.', ',') : '-'}
                            </td>
                          </tr>
                          {/* Equipment detail rows */}
                          {equipList.map((item, idx) => {
                            const idVal = item.id;
                            const display = idVal !== null ? (idVal === Math.floor(idVal) ? idVal.toFixed(0) : idVal.toFixed(2).replace('.', ',')) : '0';
                            const mensalDisplay = idVal !== null ? (idVal === Math.floor(idVal) && idVal >= 1 ? idVal.toFixed(0) + ',00' : idVal.toFixed(2).replace('.', ',')) : '0,00';
                            return (
                              <tr key={`${eq.cod}-${idx}`}>
                                <td style={{ ...tdStyle, fontWeight: 'bold', fontSize: '8px' }}>{medicaoRef}</td>
                                <td style={{ ...tdStyle, fontSize: '8px' }}>{item.endereco}</td>
                                <td style={{ ...tdStyle, textAlign: 'center', fontSize: '8px' }}>
                                  {idVal !== null ? (Number.isInteger(idVal) ? String(idVal) : idVal.toFixed(2).replace('.', ',')) : '0'}
                                </td>
                                <td style={{ ...tdStyle, fontSize: '8px' }}>Conj. X Mês</td>
                                <td style={tdStyle}></td>
                                <td style={{ ...tdStyle, textAlign: 'right', fontSize: '8px' }}>
                                  {mensalDisplay}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>

                {/* ── Footer ── */}
                <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>ENGº FISCAL</div>
                    <div style={{ marginTop: '24px', borderTop: b, paddingTop: '4px', width: '220px' }}>
                      Engº Renato Bergamo Matines
                    </div>
                    <div>DER/SP - CGR.14 Barretos</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold' }}>CONTRATADA:</div>
                    <div style={{ marginTop: '24px', borderTop: b, paddingTop: '4px', width: '260px', textAlign: 'center' }}>
                      Eng.° David Luan de Oliveira
                    </div>
                    <div style={{ textAlign: 'center' }}>Splice Industria Comércio e Serviços Ltda</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '3px 6px', fontSize: '8.5px', fontWeight: 'bold', textAlign: 'center',
};

const tdStyle: React.CSSProperties = {
  padding: '2px 6px', verticalAlign: 'top',
};
