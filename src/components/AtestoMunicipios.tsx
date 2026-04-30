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
    // Município por equipamento, vindo da planilha (mais frequente entre as faixas)
    const municipioByEquip: Record<string, string> = {};
    const faixasByEquip: Record<string, { faixa: string; id: number }[]> = {};

    records.forEach(r => {
      if (!r.equipamento) return;
      // município: pega o primeiro não vazio
      if (!municipioByEquip[r.equipamento] && r.municipio) {
        municipioByEquip[r.equipamento] = r.municipio;
      }
      const id = r.f_ID ?? r.c_ID;
      if (id !== null && id !== undefined && r.faixa) {
        if (!faixasByEquip[r.equipamento]) faixasByEquip[r.equipamento] = [];
        faixasByEquip[r.equipamento].push({ faixa: r.faixa, id });
      }
    });

    const equipGroups = groupByEquipamento(records);
    const idByEquip: Record<string, number | null> = {};
    equipGroups.forEach(g => { idByEquip[g.equipamento] = g.c_ID ?? null; });

    const linhas: LinhaAtesto[] = [];
    Object.entries(EQUIP_CATALOG).forEach(([equip, info]) => {
      if (info.lote !== lote || !info.codMedicao) return;
      const id = idByEquip[equip] ?? 0;
      const conjMes = Math.round((id ?? 0) * 100) / 100;
      const faixasList = faixasByEquip[equip] || [];
      const faixasStr = faixasList
        .map(f => `${f.faixa} ${f.id.toFixed(3).replace('.', ',')}`)
        .join(' / ') || '—';
      linhas.push({
        equip,
        codMedicao: info.codMedicao,
        endereco: info.endereco,
        faixas: faixasStr,
        resultado: id ?? 0,
        conjMes,
        municipio: municipioByEquip[equip] || '—',
        valorUnit: info.valor,
        valorTotal: Math.round(info.valor * conjMes * 100) / 100,
      });
    });

    // Ordena por código de medição e endereço
    linhas.sort((a, b) =>
      a.codMedicao.localeCompare(b.codMedicao) || a.endereco.localeCompare(b.endereco)
    );

    const totalFase34 = linhas.reduce((s, l) => s + l.valorTotal, 0);

    // % por município
    const porMunicipio: Record<string, number> = {};
    linhas.forEach(l => {
      const m = normalizeMunicipio(l.municipio);
      if (!m || m === '—') return;
      porMunicipio[m] = (porMunicipio[m] || 0) + l.valorTotal;
    });
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
  const loteNum = lote.replace('DR-', '');
  const contrato = lote === 'DR-08' ? '22.583-6' : '22.589-7';

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

          {/* ── Tabela detalhada ── */}
          <div style={{ marginTop: '10px', fontWeight: 'bold', fontSize: '10px' }}>FASE 34 — SERVIÇOS TERCEIRIZADOS</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4px', fontSize: '8px' }}>
            <thead>
              <tr style={{ background: '#d9d9d9' }}>
                <th style={thA}>Item</th>
                <th style={thA}>Local</th>
                <th style={thA}>Período</th>
                <th style={{ ...thA, textAlign: 'left' }}>Faixas / Detalhe</th>
                <th style={thA}>Resultado</th>
                <th style={thA}>Conj. Mês</th>
                <th style={{ ...thA, textAlign: 'left' }}>Município</th>
                <th style={{ ...thA, textAlign: 'right' }}>Valor Unitário (R$)</th>
                <th style={{ ...thA, textAlign: 'right' }}>Valor Total (R$)</th>
              </tr>
            </thead>
            <tbody>
              {data.linhas.map((l, i) => (
                <tr key={i}>
                  <td style={tdA}>{l.codMedicao}</td>
                  <td style={tdA}>{l.endereco}</td>
                  <td style={tdA}>{l.resultado > 0 ? '28 dias' : '—'}</td>
                  <td style={{ ...tdA, textAlign: 'left' }}>{l.faixas}</td>
                  <td style={tdA}>{l.resultado.toFixed(3).replace('.', ',')}</td>
                  <td style={tdA}>{l.conjMes.toFixed(2).replace('.', ',')}</td>
                  <td style={{ ...tdA, textAlign: 'left' }}>{titleCase(l.municipio || '—')}</td>
                  <td style={{ ...tdA, textAlign: 'right' }}>{formatBRL(l.valorUnit)}</td>
                  <td style={{ ...tdA, textAlign: 'right', fontWeight: 'bold' }}>{formatBRL(l.valorTotal)}</td>
                </tr>
              ))}
              <tr style={{ background: '#f0f0f0', fontWeight: 'bold' }}>
                <td colSpan={8} style={{ ...tdA, textAlign: 'right' }}>TOTAL FASE 34</td>
                <td style={{ ...tdA, textAlign: 'right' }}>{formatBRL(data.totalFase34)}</td>
              </tr>
            </tbody>
          </table>

          {/* ── Resumo % por município ── */}
          <div style={{ marginTop: '14px', fontWeight: 'bold', fontSize: '10px' }}>
            Municípios abrangidos — % do faturamento (Fase 34)
          </div>
          <table style={{ width: '60%', borderCollapse: 'collapse', marginTop: '4px', fontSize: '9.5px' }}>
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
                <td style={{ ...tdA, textAlign: 'right' }} colSpan={2}>TOTAL</td>
                <td style={{ ...tdA, textAlign: 'right' }}>{data.somaPct.toFixed(2).replace('.', ',')}%</td>
              </tr>
            </tbody>
          </table>

          {/* ── Atesto ── */}
          <div style={{ marginTop: '18px', fontSize: '9.5px' }}>
            Atesto para os devidos fins, a {medicaoRef}.
          </div>

          <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
            <div style={{ textAlign: 'center', width: '45%' }}>
              <div style={{ borderTop: b, paddingTop: '4px' }}>FISCAL DO CONTRATO</div>
              <div>DER/SP</div>
            </div>
            <div style={{ textAlign: 'center', width: '45%' }}>
              <div style={{ borderTop: b, paddingTop: '4px' }}>CONTRATADA</div>
              <div>Splice Industria Comércio e Serviços Ltda</div>
            </div>
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
