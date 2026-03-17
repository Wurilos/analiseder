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

// Fixed structure of the DER-621 form for DR-08
const SINALIZACAO_ROWS = [
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

const EQUIP_ROWS = [
  { cod: '34.88.78.01', desc: 'Disp. e Manut. Equip Control. Elet. Velocidade (CEV), com OCR 02 FXS' },
  { cod: '34.88.78.02', desc: 'Disp. e Manut. Equip Control. Elet. Velocidade (CEV), com OCR 03 FXS' },
  { cod: '34.88.78.03', desc: 'Disp. e Manut. Equip Control. Elet. Velocidade (CEV), com OCR 04 FXS' },
  { cod: '34.88.78.06', desc: 'Disp. e Manut. Equip Control. Elet. Velocidade (CEV), com OCR 02 FXS' },
  { cod: '34.88.78.07', desc: 'Disp. e Manut. Equip Control. Elet. Velocidade (CEV), com OCR 03 FXS' },
];

const TOTAL_FORM_ROWS = 25; // total visible rows in the table

export default function MedicaoPage() {
  const { getActiveRecords } = useData();
  const [numMedicao, setNumMedicao] = useState('');
  const [obrasAte, setObrasAte] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  // Calculate ID sums per codMedicao for DR-08
  const idSums = useMemo(() => {
    const records = getActiveRecords();
    const sums: Record<string, number> = {};

    // Get all DR-08 equipment codes grouped by codMedicao
    const dr08Equips: Record<string, string[]> = {};
    Object.entries(EQUIP_CATALOG).forEach(([codigo, info]) => {
      if (info.lote === 'DR-08' && info.codMedicao) {
        if (!dr08Equips[info.codMedicao]) dr08Equips[info.codMedicao] = [];
        dr08Equips[info.codMedicao].push(codigo);
      }
    });

    // For each codMedicao group, sum the ID from active records
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
    const opt = {
      margin: [5, 5, 5, 5],
      filename: `Medicao_${numMedicao || 'X'}_DR08.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    };
    html2pdf().set(opt).from(printRef.current).save();
  };

  const medicaoLabel = numMedicao ? `${numMedicao}ª MEDIÇÃO` : '___ª MEDIÇÃO';
  const obrasLabel = obrasAte || '___/___/______';

  // Empty rows to fill the table
  const emptyRowsCount = TOTAL_FORM_ROWS - SINALIZACAO_ROWS.length - EQUIP_ROWS.length - 1; // -1 for blank separator

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Medição — DR-08</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Geração do formulário DER-621 para medição de serviços do Lote 8.
        </p>
      </motion.div>

      {/* User inputs */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Dados da Medição
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="numMedicao">Número da Medição</Label>
            <Input
              id="numMedicao"
              placeholder="Ex: 12"
              value={numMedicao}
              onChange={e => setNumMedicao(e.target.value)}
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="obrasAte">Obras executadas até</Label>
            <Input
              id="obrasAte"
              type="date"
              value={obrasAte}
              onChange={e => setObrasAte(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleExportPDF} className="gap-2">
              <FileDown className="w-4 h-4" />
              Exportar PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pré-visualização</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <div ref={printRef} style={{ background: '#fff', color: '#000', padding: '0', fontFamily: 'Arial, sans-serif', fontSize: '10px', width: '277mm' }}>
            {/* ====== FORM ====== */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000' }}>
              {/* Header */}
              <thead>
                <tr>
                  <td colSpan={2} style={{ ...cellBase, borderRight: 'none', width: '60%', padding: '6px 10px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '7px', fontWeight: 'bold', textAlign: 'center', lineHeight: 1.1 }}>
                          SECRETARIA<br />LOGÍSTICA
                        </span>
                      </div>
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: '10px', fontWeight: 'normal' }}>SECRETARIA DO MEIO AMBIENTE INFRAESTRUTURA E LOGÍSTICA</div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold' }}>DEPARTAMENTO DE ESTRADAS DE RODAGEM</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ ...cellBase, width: '40%', padding: '6px 10px', textAlign: 'right', fontSize: '10px' }}>
                    Continuação: &nbsp; <span style={checkboxStyle}>☐</span> sim &nbsp; <span style={{ ...checkboxStyle, background: '#000', color: '#fff' }}>☒</span>não
                  </td>
                </tr>
              </thead>

              <tbody>
                {/* Sinalização rows */}
                {SINALIZACAO_ROWS.map(row => (
                  <tr key={row.cod}>
                    <td style={{ ...cellBase, width: '90px', padding: '3px 6px', fontFamily: 'monospace', fontSize: '9px' }}>{row.cod}</td>
                    <td style={{ ...cellBase, padding: '3px 6px', fontSize: '9px' }}>{row.desc}</td>
                    <td style={{ ...cellBase, width: '60px', textAlign: 'right', padding: '3px 6px' }}></td>
                  </tr>
                ))}

                {/* Blank separator row */}
                <tr>
                  <td style={{ ...cellBase, height: '6px' }}></td>
                  <td style={cellBase}></td>
                  <td style={cellBase}></td>
                </tr>

                {/* Equipment rows with values */}
                {EQUIP_ROWS.map(row => {
                  const val = idSums[row.cod] ?? 0;
                  const display = val > 0 ? val.toFixed(2).replace('.', ',') : '';
                  return (
                    <tr key={row.cod}>
                      <td style={{ ...cellBase, padding: '3px 6px', fontFamily: 'monospace', fontSize: '9px' }}>{row.cod}</td>
                      <td style={{ ...cellBase, padding: '3px 6px', fontSize: '9px' }}>{row.desc}</td>
                      <td style={{ ...cellBase, textAlign: 'right', padding: '3px 6px', fontFamily: 'monospace', fontSize: '9px', fontWeight: 'bold' }}>
                        {display}
                      </td>
                    </tr>
                  );
                })}

                {/* Empty rows to fill the form */}
                {Array.from({ length: emptyRowsCount }).map((_, i) => (
                  <tr key={`empty-${i}`}>
                    <td style={{ ...cellBase, height: '18px' }}></td>
                    <td style={cellBase}></td>
                    <td style={cellBase}></td>
                  </tr>
                ))}

                {/* Footer section */}
                <tr>
                  <td colSpan={3} style={{ ...cellBase, padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          {/* De acordo + Continua */}
                          <td style={{ ...cellBase, width: '22%', padding: '8px 6px', verticalAlign: 'bottom', fontSize: '9px' }}>
                            De acordo:____________________
                          </td>
                          <td style={{ ...cellBase, width: '18%', padding: '8px 6px', verticalAlign: 'bottom', fontSize: '9px' }}>
                            Continua: &nbsp; <span style={checkboxStyle}>☐</span> sim &nbsp; <span style={{ ...checkboxStyle, background: '#000', color: '#fff' }}>☒</span> não
                          </td>

                          {/* Medição */}
                          <td style={{ ...cellBase, width: '22%', padding: '6px', textAlign: 'center', verticalAlign: 'top' }}>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>{medicaoLabel}</div>
                            <div style={{ fontSize: '9px' }}>
                              <span style={{ ...checkboxStyle, background: '#000', color: '#fff' }}>☒</span> Provisória
                            </div>
                            <div style={{ fontSize: '9px', marginTop: '2px' }}>
                              <span style={checkboxStyle}>☐</span> Final
                            </div>
                            <div style={{ fontSize: '9px', marginTop: '6px' }}>
                              obras executadas até {obrasLabel}
                            </div>
                          </td>

                          {/* Contrato info */}
                          <td style={{ ...cellBase, width: '30%', padding: '6px', fontSize: '8px', lineHeight: 1.4, verticalAlign: 'top' }}>
                            <div>Contrato n.º: <strong>22.583-6</strong></div>
                            <div>Objeto: Contratação de Serviços de Fiscalização do Controle de Velocidade e Contagem Classificatória, nas Rodovias Localizadas no Estado de São Paulo Sob Circunscrição do DER/SP, divididos em 14 lotes. Lote 8.</div>
                            <div style={{ marginTop: '2px' }}>Empresa: <strong>Splice Industria Comércio e Serviços Ltda.</strong></div>
                          </td>

                          {/* Fls */}
                          <td style={{ ...cellBase, width: '8%', padding: '6px', textAlign: 'center', verticalAlign: 'top', fontSize: '9px' }}>
                            <div>Fls.</div>
                            <div style={{ fontWeight: 'bold', marginTop: '4px' }}>01/01</div>
                          </td>
                        </tr>

                        {/* Signature row */}
                        <tr>
                          <td style={{ ...cellBase, padding: '4px 6px', fontSize: '8px', textAlign: 'center' }}>
                            ________________________________<br />Contratante
                          </td>
                          <td colSpan={2} style={{ ...cellBase, padding: '4px 6px', fontSize: '8px', textAlign: 'center' }}>
                            ________________________________<br />Engenheiro Fiscal
                          </td>
                          <td colSpan={2} style={{ ...cellBase, padding: '4px 6px' }}></td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* DER-621 footer */}
            <div style={{ fontSize: '8px', marginTop: '2px', padding: '0 4px' }}>DER-621</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const cellBase: React.CSSProperties = {
  border: '1px solid #000',
  verticalAlign: 'middle',
};

const checkboxStyle: React.CSSProperties = {
  display: 'inline-block',
  width: '10px',
  height: '10px',
  border: '1px solid #000',
  textAlign: 'center',
  lineHeight: '10px',
  fontSize: '8px',
  verticalAlign: 'middle',
};
