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
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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

  const PDF_PAGE_WIDTH_MM = 297;
  const PDF_PAGE_HEIGHT_MM = 210;
  const PDF_MARGIN_MM = 6;
  const PDF_CONTENT_WIDTH_MM = 268;

  // ════════════════════════════════════════════
  // DR-08: Direct jsPDF vector drawing
  // ════════════════════════════════════════════
  const exportDR08WithJsPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = 297, H = 210;
    const M = 6; // margin
    const L = M, R = W - M, T = M, B = H - M;
    const CW = R - L; // content width
    const valColW = CW * 0.10; // value column width
    const descColW = CW - valColW; // description column width

    // Helpers
    const drawLine = (x1: number, y1: number, x2: number, y2: number, w = 0.3) => {
      doc.setLineWidth(w);
      doc.line(x1, y1, x2, y2);
    };

    const drawRect = (x: number, y: number, w: number, h: number, lineW = 0.5) => {
      doc.setLineWidth(lineW);
      doc.rect(x, y, w, h);
    };

    const drawCheckbox = (x: number, y: number, checked: boolean, size = 2.8) => {
      doc.setLineWidth(0.4);
      doc.rect(x, y - size / 2, size, size);
      if (checked) {
        doc.setFillColor(0, 0, 0);
        doc.rect(x + 0.3, y - size / 2 + 0.3, size - 0.6, size - 0.6, 'F');
      }
    };

    const drawCellText = (
      text: string,
      x: number,
      y: number,
      cellW: number,
      cellH: number,
      opts: { align?: 'left' | 'right' | 'center'; fontSize?: number; bold?: boolean; maxLines?: number } = {}
    ) => {
      const { align = 'left', fontSize = 8, bold = false, maxLines = 1 } = opts;
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');

      const textY = y + cellH / 2;
      const padding = 2;

      if (maxLines === 1) {
        // Truncate to fit
        let t = text;
        const maxW = cellW - padding * 2;
        while (doc.getTextWidth(t) > maxW && t.length > 0) {
          t = t.slice(0, -1);
        }
        if (t.length < text.length && t.length > 3) t = t.slice(0, -3) + '...';

        let tx = x + padding;
        if (align === 'right') tx = x + cellW - padding;
        else if (align === 'center') tx = x + cellW / 2;

        doc.text(t, tx, textY, { baseline: 'middle', align });
      } else {
        // Multi-line wrap
        const maxW = cellW - padding * 2;
        doc.setFontSize(fontSize);
        const lines = doc.splitTextToSize(text, maxW) as string[];
        const lineH = fontSize * 0.4;
        const totalH = lines.length * lineH;
        let startY = y + (cellH - totalH) / 2 + lineH / 2;
        lines.forEach((line: string) => {
          let tx = x + padding;
          if (align === 'right') tx = x + cellW - padding;
          else if (align === 'center') tx = x + cellW / 2;
          doc.text(line, tx, startY, { baseline: 'middle', align });
          startY += lineH;
        });
      }
    };

    // ── Outer border ──
    drawRect(L, T, CW, B - T, 0.7);

    let curY = T;

    // ── HEADER ──
    const headerH = 14;
    // Brasão
    try {
      doc.addImage('/images/brasao-sp.png', 'PNG', L + 3, curY + 1.5, 10, 11);
    } catch {}
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('SECRETARIA DO MEIO AMBIENTE INFRAESTRUTURA E LOGÍSTICA', L + CW / 2, curY + 5, { align: 'center', baseline: 'middle' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DEPARTAMENTO DE ESTRADAS DE RODAGEM', L + CW / 2, curY + 10, { align: 'center', baseline: 'middle' });
    curY += headerH;
    drawLine(L, curY, R, curY);

    // ── CONTINUAÇÃO ──
    const contH = 5;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    const contTextX = R - 3;
    const contTextY = curY + contH / 2;
    drawCheckbox(contTextX - 32, contTextY, false, 2.5);
    doc.text('sim', contTextX - 28.5, contTextY, { baseline: 'middle' });
    drawCheckbox(contTextX - 18, contTextY, true, 2.5);
    doc.text('não', contTextX - 14.5, contTextY, { baseline: 'middle' });
    doc.text('Continuação:', contTextX - 40, contTextY, { baseline: 'middle', align: 'right' });
    curY += contH;
    drawLine(L, curY, R, curY);

    // ── SINALIZAÇÃO ROWS ──
    const rowH = 4.8;
    DR08_SINALIZACAO.forEach(r => {
      drawCellText(`${r.cod} ${r.desc}`, L, curY, descColW, rowH, { fontSize: 7.5 });
      curY += rowH;
      drawLine(L, curY, R, curY, 0.15);
    });

    // ── SEPARATOR ──
    const sepH = 1.5;
    curY += sepH;
    drawLine(L, curY, R, curY, 0.15);

    // ── EQUIPAMENTO ROWS ──
    DR08_EQUIPS.forEach(r => {
      const val = dr08Data.sums[r.cod] ?? 0;
      drawCellText(`${r.cod} ${r.desc}`, L, curY, descColW, rowH, { fontSize: 7.5 });
      if (val > 0) {
        drawCellText(val.toFixed(2).replace('.', ','), L + descColW, curY, valColW, rowH, { align: 'right', fontSize: 7.5 });
      }
      curY += rowH;
      drawLine(L, curY, R, curY, 0.15);
    });

    // ── EMPTY ROWS (fill space until footer) ──
    // Footer heights
    const footerRow1H = 22;
    const footerRow2H = 12;
    const derLabelH = 4;
    const footerTotalH = footerRow1H + footerRow2H + derLabelH;
    const footerStartY = B - footerRow1H - footerRow2H;

    // Draw a line at the footer start
    drawLine(L, footerStartY, R, footerStartY, 0.3);

    // ── FOOTER ROW 1 ──
    const f1Y = footerStartY;
    // Column positions (percentages of CW)
    const fCol1W = CW * 0.18;
    const fCol2W = CW * 0.14;
    const fCol3W = CW * 0.18;
    const fCol4W = CW * 0.42;
    const fCol5W = CW * 0.08;
    const fX1 = L;
    const fX2 = fX1 + fCol1W;
    const fX3 = fX2 + fCol2W;
    const fX4 = fX3 + fCol3W;
    const fX5 = fX4 + fCol4W;

    // Vertical dividers
    drawLine(fX2, f1Y, fX2, f1Y + footerRow1H, 0.3);
    drawLine(fX3, f1Y, fX3, f1Y + footerRow1H, 0.3);
    drawLine(fX4, f1Y, fX4, f1Y + footerRow1H, 0.3);
    drawLine(fX5, f1Y, fX5, f1Y + footerRow1H, 0.3);

    // Col1: De acordo
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text('De acordo:', fX1 + 2, f1Y + 4, { baseline: 'middle' });
    doc.text('____________________', fX1 + 2, f1Y + footerRow1H - 4, { baseline: 'middle' });

    // Col2: Continua
    doc.text('Continua:', fX2 + 2, f1Y + 4, { baseline: 'middle' });
    drawCheckbox(fX2 + 2, f1Y + 10, false, 2.5);
    doc.text('sim', fX2 + 5.5, f1Y + 10, { baseline: 'middle' });
    drawCheckbox(fX2 + 2, f1Y + 15, true, 2.5);
    doc.text('não', fX2 + 5.5, f1Y + 15, { baseline: 'middle' });

    // Col3: Medição
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(medicaoLabel, fX3 + fCol3W / 2, f1Y + 4.5, { align: 'center', baseline: 'middle' });
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    drawCheckbox(fX3 + 5, f1Y + 9.5, true, 2.5);
    doc.text('Provisória', fX3 + 8.5, f1Y + 9.5, { baseline: 'middle' });
    drawCheckbox(fX3 + 5, f1Y + 13.5, false, 2.5);
    doc.text('Final', fX3 + 8.5, f1Y + 13.5, { baseline: 'middle' });
    doc.setFontSize(6.5);
    doc.text(`obras executadas até ${obrasLabel}`, fX3 + fCol3W / 2, f1Y + 19, { align: 'center', baseline: 'middle' });

    // Col4: Contrato
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Contrato n.º:', fX4 + 2, f1Y + 3.5, { baseline: 'middle' });
    doc.setFont('helvetica', 'bold');
    doc.text('22.583-6', fX4 + 20, f1Y + 3.5, { baseline: 'middle' });
    doc.setFont('helvetica', 'normal');
    const objetoText = 'Objeto: Contratação de Serviços de Fiscalização do Controle de Velocidade e Contagem Classificatória, nas Rodovias Localizadas no Estado de São Paulo Sob Circunscrição do DER/SP, divididos em 14 lotes. Lote 8.';
    const objetoLines = doc.splitTextToSize(objetoText, fCol4W - 4) as string[];
    let objY = f1Y + 6.5;
    objetoLines.forEach((line: string) => {
      doc.text(line, fX4 + 2, objY, { baseline: 'middle' });
      objY += 2.5;
    });
    doc.setFont('helvetica', 'bold');
    doc.text('Empresa', fX4 + 2, objY + 1, { baseline: 'middle' });
    doc.setFont('helvetica', 'normal');
    doc.text(': Splice Industria Comércio e Serviços Ltda.', fX4 + 12, objY + 1, { baseline: 'middle' });

    // Col5: Fls
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Fls.', fX5 + fCol5W / 2, f1Y + 5, { align: 'center', baseline: 'middle' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('01/01', fX5 + fCol5W / 2, f1Y + 13, { align: 'center', baseline: 'middle' });

    // ── FOOTER ROW 2 (signatures) ──
    const f2Y = f1Y + footerRow1H;
    drawLine(L, f2Y, R, f2Y, 0.3);

    const sCol1W = CW * 0.18;
    const sCol2W = CW * 0.32;
    const sCol3W = CW * 0.42;
    const sCol4W = CW * 0.08;
    const sX1 = L;
    const sX2 = sX1 + sCol1W;
    const sX3 = sX2 + sCol2W;
    const sX4 = sX3 + sCol3W;

    drawLine(sX2, f2Y, sX2, B, 0.3);
    drawLine(sX3, f2Y, sX3, B, 0.3);
    drawLine(sX4, f2Y, sX4, B, 0.3);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('________________________', sX1 + sCol1W / 2, f2Y + 5, { align: 'center', baseline: 'middle' });
    doc.text('Contratante', sX1 + sCol1W / 2, f2Y + 8.5, { align: 'center', baseline: 'middle' });

    doc.text('________________________________', sX2 + sCol2W / 2, f2Y + 5, { align: 'center', baseline: 'middle' });
    doc.text('Engenheiro Fiscal', sX2 + sCol2W / 2, f2Y + 8.5, { align: 'center', baseline: 'middle' });

    doc.setFontSize(7);
    doc.text('Firma: Consórcio Peso Certo Móvel', sX3 + 2, f2Y + 4, { baseline: 'middle' });

    // ── DER-621 label ──
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('DER-621', L + 1, B + 3, { baseline: 'middle' });

    // Save
    const pdfFileName = `Medicao_${numMedicao || 'X'}_DR-08.pdf`;
    doc.save(pdfFileName);
  };

  const handleExportPDF = async () => {
    if (activeLote === 'DR-08') {
      exportDR08WithJsPDF();
      return;
    }

    // DR-14: keep html2canvas flow
    const ref = printRef14.current;
    if (!ref) return;

    const pdfFileName = `Medicao_${numMedicao || 'X'}_${activeLote}.pdf`;

    const canvas = await html2canvas(ref, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      width: ref.offsetWidth,
      height: ref.offsetHeight,
      windowWidth: ref.offsetWidth,
      windowHeight: ref.offsetHeight,
    });

    const imageData = canvas.toDataURL('image/jpeg', 0.98);
    const marginMm = 5;
    const availW = PDF_PAGE_WIDTH_MM - marginMm * 2;
    const availH = PDF_PAGE_HEIGHT_MM - marginMm * 2;
    const fitScale = Math.min(availW / canvas.width, availH / canvas.height);
    const renderW = canvas.width * fitScale;
    const renderH = canvas.height * fitScale;
    const offsetX = (PDF_PAGE_WIDTH_MM - renderW) / 2;
    const offsetY = (PDF_PAGE_HEIGHT_MM - renderH) / 2;

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    pdf.addImage(imageData, 'JPEG', offsetX, offsetY, renderW, renderH, undefined, 'FAST');
    pdf.save(pdfFileName);
  };

  const medicaoLabel = numMedicao ? `${numMedicao}ª MEDIÇÃO` : '___ª MEDIÇÃO';
  const medicaoRef = numMedicao ? `${numMedicao}ª Medição` : '___ª Medição';
  const obrasLabel = formatDateBR(obrasAte);
  const periodoLabel = periodoInicio && periodoFim
    ? `${formatDateShort(periodoInicio)} a ${formatDateShort(periodoFim)}`
    : '__/__/__ a __/__/__';

  const b = '1px solid #000';
  const b2 = '2px solid #000';

  const chk = (filled: boolean) => (
    <span style={{
      display: 'inline-block', width: '10px', height: '10px',
      border: '1.5px solid #000', verticalAlign: 'middle', marginRight: '2px',
      background: filled ? '#000' : '#fff',
      position: 'relative', top: '-1px',
    }}>{'\u00A0'}</span>
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
                width: '960px', margin: '0 auto', border: '2px solid #000', fontSize: '11px',
              }}>
                {/* ── HEADER ── */}
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: b, padding: '6px 12px' }}>
                  <img src="/images/brasao-sp.png" alt="" style={{ width: '48px', height: '52px', objectFit: 'contain', marginRight: '12px' }} />
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', letterSpacing: '0.3px' }}>SECRETARIA DO MEIO AMBIENTE INFRAESTRUTURA E LOGÍSTICA</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '1px' }}>DEPARTAMENTO DE ESTRADAS DE RODAGEM</div>
                  </div>
                </div>

                {/* ── CONTINUAÇÃO ── */}
                <div style={{ borderBottom: b, padding: '3px 12px', textAlign: 'right', fontSize: '10px' }}>
                  Continuação: &nbsp;{chk(false)} sim &nbsp;&nbsp;{chk(true)} não
                </div>

                {/* ── SINALIZAÇÃO ── */}
                {DR08_SINALIZACAO.map(r => (
                  <div key={r.cod} style={{
                    display: 'flex', borderBottom: '1px solid #000', height: '22px', alignItems: 'center',
                  }}>
                    <div style={{ flex: 1, padding: '0 10px', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.cod} {r.desc}
                    </div>
                    <div style={{ width: '90px', textAlign: 'right', padding: '0 10px', fontSize: '10px' }}></div>
                  </div>
                ))}

                {/* ── SEPARADOR ── */}
                <div style={{ borderBottom: '1px solid #000', height: '6px' }}></div>

                {/* ── EQUIPAMENTOS ── */}
                {DR08_EQUIPS.map(r => {
                  const val = dr08Data.sums[r.cod] ?? 0;
                  return (
                    <div key={r.cod} style={{
                      display: 'flex', borderBottom: '1px solid #000', height: '22px', alignItems: 'center',
                    }}>
                      <div style={{ flex: 1, padding: '0 10px', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.cod} {r.desc}
                      </div>
                      <div style={{ width: '90px', textAlign: 'right', padding: '0 10px', fontSize: '10px', fontFamily: 'monospace' }}>
                        {val > 0 ? val.toFixed(2).replace('.', ',') : ''}
                      </div>
                    </div>
                  );
                })}

                {/* ── LINHAS VAZIAS ── */}
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={`e${i}`} style={{ borderBottom: '1px solid #000', height: '22px' }}></div>
                ))}

                {/* ── RODAPÉ ── */}
                <div style={{ display: 'flex', borderTop: '2px solid #000', fontSize: '10px' }}>
                  {/* Col 1 - De acordo */}
                  <div style={{ width: '18%', borderRight: b, padding: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <div>De acordo:</div>
                    <div style={{ marginTop: '16px', borderTop: b, paddingTop: '2px', fontSize: '9px' }}>____________________</div>
                  </div>
                  {/* Col 2 - Continua */}
                  <div style={{ width: '14%', borderRight: b, padding: '8px' }}>
                    <div style={{ marginBottom: '6px' }}>Continua:</div>
                    <div style={{ marginBottom: '4px' }}>{chk(false)} sim</div>
                    <div>{chk(true)} não</div>
                  </div>
                  {/* Col 3 - Medição */}
                  <div style={{ width: '18%', borderRight: b, padding: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>{medicaoLabel}</div>
                    <div style={{ textAlign: 'left', paddingLeft: '20%', fontSize: '10px' }}>
                      <div style={{ marginBottom: '3px' }}>{chk(true)} Provisória</div>
                      <div>{chk(false)} Final</div>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '9px' }}>obras executadas até {obrasLabel}</div>
                  </div>
                  {/* Col 4 - Contrato */}
                  <div style={{ width: '42%', borderRight: b, padding: '8px', fontSize: '9px', lineHeight: '1.4' }}>
                    <div>Contrato n.º: <strong>22.583-6</strong></div>
                    <div style={{ wordWrap: 'break-word' }}>Objeto: Contratação de Serviços de Fiscalização do Controle de Velocidade e Contagem Classificatória, nas Rodovias Localizadas no Estado de São Paulo Sob Circunscrição do DER/SP, divididos em 14 lotes. Lote 8.</div>
                    <div style={{ marginTop: '2px' }}><strong>Empresa</strong>: Splice Industria Comércio e Serviços Ltda.</div>
                  </div>
                  {/* Col 5 - Fls */}
                  <div style={{ width: '8%', padding: '8px', textAlign: 'center' }}>
                    <div>Fls.</div>
                    <div style={{ fontWeight: 'bold', marginTop: '10px', fontSize: '12px' }}>01/01</div>
                  </div>
                </div>

                {/* ── ASSINATURAS ── */}
                <div style={{ display: 'flex', borderTop: b, fontSize: '9px' }}>
                  <div style={{ width: '18%', borderRight: b, padding: '6px', textAlign: 'center' }}>
                    <div style={{ marginTop: '12px' }}>________________________________</div>
                    <div>Contratante</div>
                  </div>
                  <div style={{ width: '32%', borderRight: b, padding: '6px', textAlign: 'center' }}>
                    <div style={{ marginTop: '12px' }}>________________________________</div>
                    <div>Engenheiro Fiscal</div>
                  </div>
                  <div style={{ width: '42%', borderRight: b, padding: '6px', fontSize: '9px' }}>
                    Firma: Consórcio Peso Certo Móvel
                  </div>
                  <div style={{ width: '8%', padding: '6px' }}></div>
                </div>
              </div>
              <div style={{ fontSize: '9px', marginTop: '3px', paddingLeft: '6px', color: '#000' }}>DER-621</div>
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
              <div ref={printRef14} data-pdf-root style={{
                background: '#fff', color: '#000', fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '9px', width: '268mm', lineHeight: 1.3, padding: '10px 14px', boxSizing: 'border-box',
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
  padding: '4px 6px', fontSize: '8.5px', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle',
};

const tdStyle: React.CSSProperties = {
  padding: '4px 6px', verticalAlign: 'middle',
};
