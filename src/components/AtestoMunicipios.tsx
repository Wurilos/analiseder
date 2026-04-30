import React, { useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileDown } from 'lucide-react';
import { EQUIP_CATALOG } from '@/lib/equip-catalog';
import { groupByEquipamento } from '@/lib/grouping';
import { IDRecord } from '@/types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface Props {
  lote: string;
  records: IDRecord[];
  numMedicao: string;
  periodoInicio: string;
  periodoFim: string;
}

interface LinhaAtesto {
  equip: string;
  codMedicao: string;
  endereco: string;
  faixas: string;          // ex: "Sul1 0,954 / Norte1 0,887"
  resultado: number;       // média das faixas (3 casas)
  conjMes: number;         // arredondado 2 casas
  municipio: string;
  valorUnit: number;
  valorTotal: number;
}

function formatBRL(v: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2,
  }).format(v);
}

function formatDateShort(s: string): string {
  if (!s) return '__/__/__';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

function normalizeMunicipio(s: string): string {
  return (s || '').trim().toUpperCase();
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|\s|-|\/)([\wáéíóúâêôãõàç])/g, (_, p, c) => p + c.toUpperCase());
}

export default function AtestoMunicipios({ lote, records, numMedicao, periodoInicio, periodoFim }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const data = useMemo(() => {
    // Município por equipamento (primeiro valor não vazio nas faixas)
    const municipioByEquip: Record<string, string> = {};
    records.forEach(r => {
      if (!r.equipamento) return;
      if (!municipioByEquip[r.equipamento] && r.municipio) {
        municipioByEquip[r.equipamento] = r.municipio;
      }
    });

    // ÚNICA fonte de valor: finance-engine (valorRecebidoTotal por equipamento).
    // Mesma lógica que alimenta o card do Dashboard.
    const equipGroups = groupByEquipamento(records).filter(g => {
      const cat = EQUIP_CATALOG[g.equipamento];
      return cat && cat.lote === lote && cat.codMedicao;
    });

    // % por município baseado em valorRecebidoTotal
    const porMunicipio: Record<string, number> = {};
    let totalFase34 = 0;
    equipGroups.forEach(g => {
      const valor = g.valorRecebidoTotal || 0;
      totalFase34 += valor;
      const m = normalizeMunicipio(municipioByEquip[g.equipamento] || '');
      if (!m) return;
      porMunicipio[m] = (porMunicipio[m] || 0) + valor;
    });

    const linhas: LinhaAtesto[] = [];

    const municipios = Object.entries(porMunicipio)
      .map(([m, v]) => ({
        municipio: titleCase(m),
        valor: v,
        pct: totalFase34 > 0 ? (v / totalFase34) * 100 : 0,
      }))
      .sort((a, b) => b.pct - a.pct);

    const somaPct = municipios.reduce((s, m) => s + m.pct, 0);

    return { linhas, totalFase34, municipios, somaPct };
  }, [lote, records]);

  const handleExportPDF = async () => {
    const ref = printRef.current;
    if (!ref) return;
    const canvas = await html2canvas(ref, {
      scale: 2, useCORS: true, backgroundColor: '#ffffff',
      width: ref.offsetWidth, height: ref.offsetHeight,
      windowWidth: ref.offsetWidth, windowHeight: ref.offsetHeight,
    });
    const imageData = canvas.toDataURL('image/jpeg', 0.97);
    // Página A4 retrato
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const pageW = 210, pageH = 297, margin = 8;
    const availW = pageW - margin * 2;
    const ratio = canvas.height / canvas.width;
    const renderW = availW;
    const renderH = renderW * ratio;
    const availH = pageH - margin * 2;

    if (renderH <= availH) {
      pdf.addImage(imageData, 'JPEG', margin, margin, renderW, renderH, undefined, 'FAST');
    } else {
      // múltiplas páginas
      const pageHeightInCanvasPx = (availH / renderW) * canvas.width;
      let yOffset = 0;
      let pageIdx = 0;
      while (yOffset < canvas.height) {
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.min(pageHeightInCanvasPx, canvas.height - yOffset);
        const ctx = pageCanvas.getContext('2d');
        if (!ctx) break;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(canvas, 0, -yOffset);
        const pageData = pageCanvas.toDataURL('image/jpeg', 0.97);
        const h = (pageCanvas.height / canvas.width) * renderW;
        if (pageIdx > 0) pdf.addPage();
        pdf.addImage(pageData, 'JPEG', margin, margin, renderW, h, undefined, 'FAST');
        yOffset += pageHeightInCanvasPx;
        pageIdx++;
      }
    }

    pdf.save(`Atesto_${lote}_${numMedicao || 'X'}.pdf`);
  };

  const periodoLabel = periodoInicio && periodoFim
    ? `${formatDateShort(periodoInicio)} a ${formatDateShort(periodoFim)}`
    : '__/__/__ a __/__/__';
  const medicaoRef = numMedicao ? `${numMedicao}ª Medição Provisória` : '___ª Medição Provisória';
  const medicaoNumLabel = numMedicao || '___';
  const loteNum = lote.replace('DR-', '');
  const contrato = lote === 'DR-08' ? '22.583-6' : '22.589-7';

  // Cabeçalho de assinatura por lote
  const fiscalConfig: Record<string, { cidade: string; orgao: string; nome: string; cargo: string }> = {
    'DR-08': {
      cidade: 'Ribeirão Preto',
      orgao: 'DER/SP - Coordenadoria Geral Regional - CGR.08',
      nome: '_______________________________',
      cargo: 'Engº Fiscal do Contrato',
    },
    'DR-14': {
      cidade: 'Barretos',
      orgao: 'DER/SP - Coordenadoria Geral Regional - CGR.14 Barretos',
      nome: 'Renato Bergamo Martines',
      cargo: 'Engº Fiscal do Contrato',
    },
  };
  const cfg = fiscalConfig[lote] || fiscalConfig['DR-14'];
  const cidadeFiscal = cfg.cidade;
  const orgaoFiscal = cfg.orgao;
  const nomeFiscal = cfg.nome;
  const cargoFiscal = cfg.cargo;

  // Data por extenso (usa periodoFim como referência, fallback hoje)
  const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const refDate = periodoFim ? new Date(periodoFim + 'T00:00:00') : new Date();
  const dataExtenso = `${refDate.getDate()} de ${meses[refDate.getMonth()]} de ${refDate.getFullYear()}`;

  const b = '1px solid #000';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Pré-visualização — Atesto / % por Município</CardTitle>
        <Button onClick={handleExportPDF} size="sm" className="gap-2">
          <FileDown className="w-4 h-4" /> Exportar PDF
        </Button>
      </CardHeader>
      <CardContent className="p-3 overflow-x-auto" style={{ background: '#e5e5e5' }}>
        <div ref={printRef} style={{
          background: '#fff', color: '#000', fontFamily: 'Arial, Helvetica, sans-serif',
          width: '194mm', margin: '0 auto', padding: '10mm 8mm', fontSize: '9.5px', boxSizing: 'border-box',
        }}>
          {/* ── Cabeçalho ── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
            <tbody>
              <tr>
                <td style={{ width: '15%', verticalAlign: 'middle' }}>
                  <img src="/images/logo-der.jpg" alt="DER" style={{ width: '60px', objectFit: 'contain' }} />
                </td>
                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                  <div style={{ fontSize: '10px' }}>SECRETARIA DE MEIO AMBIENTE, INFRAESTRUTURA E LOGÍSTICA</div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold' }}>DEPARTAMENTO DE ESTRADAS DE RODAGEM</div>
                </td>
                <td style={{ width: '15%', textAlign: 'right', verticalAlign: 'middle' }}>
                  <img src="/images/brasao-sp.png" alt="SP" style={{ width: '45px', objectFit: 'contain' }} />
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ borderTop: b, borderBottom: b, padding: '4px 0', fontSize: '8.5px', fontWeight: 'bold', textAlign: 'center', lineHeight: 1.3 }}>
            CONTRATAÇÃO DE SERVIÇOS DE FISCALIZAÇÃO DO CONTROLE DE VELOCIDADE E CONTAGEM CLASSIFICATÓRIA,
            NAS RODOVIAS LOCALIZADAS NO ESTADO DE SÃO PAULO SOB CIRCUNSCRIÇÃO DO DER/SP, DIVIDIDOS EM 14 LOTES. LOTE {loteNum}
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '6px', fontSize: '9px' }}>
            <tbody>
              <tr>
                <td><strong>Contrato:</strong> {contrato}</td>
                <td style={{ textAlign: 'right' }}><strong>Assunto:</strong> Atesto da {medicaoRef}</td>
              </tr>
              <tr>
                <td><strong>Contratada:</strong> Splice Industria Comércio e Serviços Ltda</td>
                <td style={{ textAlign: 'right' }}><strong>Período:</strong> {periodoLabel}</td>
              </tr>
            </tbody>
          </table>

          {/* ── Resumo % por município ── */}
          <div style={{ marginTop: '14px', fontWeight: 'bold', fontSize: '10px' }}>
            Municípios abrangidos — % do faturamento (Fase 34)
          </div>
          <table style={{ width: '70%', borderCollapse: 'collapse', marginTop: '4px', fontSize: '9.5px' }}>
            <thead>
              <tr style={{ background: '#d9d9d9' }}>
                <th style={{ ...thA, textAlign: 'left' }}>Município</th>
                <th style={{ ...thA, textAlign: 'right' }}>Valor (R$)</th>
                <th style={{ ...thA, textAlign: 'right' }}>%</th>
              </tr>
            </thead>
            <tbody>
              {data.municipios.map((m, i) => (
                <tr key={i}>
                  <td style={{ ...tdA, textAlign: 'left' }}>{m.municipio}</td>
                  <td style={{ ...tdA, textAlign: 'right' }}>{formatBRL(m.valor)}</td>
                  <td style={{ ...tdA, textAlign: 'right', fontWeight: 'bold' }}>{m.pct.toFixed(2).replace('.', ',')}%</td>
                </tr>
              ))}
              <tr style={{ background: '#f0f0f0', fontWeight: 'bold' }}>
                <td style={{ ...tdA, textAlign: 'left' }}>TOTAL</td>
                <td style={{ ...tdA, textAlign: 'right' }}>{formatBRL(data.totalFase34)}</td>
                <td style={{ ...tdA, textAlign: 'right' }}>{data.somaPct.toFixed(2).replace('.', ',')}%</td>
              </tr>
            </tbody>
          </table>

          {/* ── Atesto / Assinatura (formato do anexo) ── */}
          <div style={{ marginTop: '34px', fontSize: '10px' }}>
            Atesto para os devidos fins, a&nbsp;&nbsp;<strong>{medicaoNumLabel}ª Medição Provisória</strong>
          </div>

          <div style={{ marginTop: '32px', fontSize: '10px' }}>
            {cidadeFiscal}, {dataExtenso}.
          </div>

          <div style={{ marginTop: '54px', textAlign: 'center', fontSize: '10px' }}>
            <div style={{ borderTop: b, width: '60%', margin: '0 auto', paddingTop: '3px' }}>
              {orgaoFiscal}
            </div>
            <div>{nomeFiscal}</div>
            <div>{cargoFiscal}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const thA: React.CSSProperties = {
  padding: '4px 5px', border: '1px solid #000', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold',
};
const tdA: React.CSSProperties = {
  padding: '3px 5px', border: '1px solid #000', textAlign: 'center', verticalAlign: 'middle',
};
