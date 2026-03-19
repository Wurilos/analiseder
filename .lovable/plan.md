

## Plano: PDF DR-08 idêntico ao modelo de referência

### Problema
O layout atual do DR-08 gera um PDF com texto desalinhado, colunas cortadas e proporções incorretas. O usuário quer um PDF **idêntico** ao documento de referência anexado.

### Estratégia
Criar um **div de impressão dedicado** (oculto na tela) com layout pixel-perfect que replica o documento de referência. O div visível na pré-visualização permanece como está. O botão "Exportar PDF" usará o div oculto para gerar o PDF via `html2canvas` + `jsPDF`.

### Estrutura do layout de referência (A4 paisagem)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ [brasão]  SECRETARIA DO MEIO AMBIENTE INFRAESTRUTURA E LOGÍSTICA           │
│           DEPARTAMENTO DE ESTRADAS DE RODAGEM                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                          Continuação:  □ sim   ■ não       │
├──────────────────────────────────────────────────────────────────────────────┤
│ 28.88.30.01 Placa Alum. Composto...                                        │
│ 28.88.30.02 Semi-Portico Metalico...                                       │
│ ... (9 linhas de sinalização, sem valores)                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│ (linha separadora vazia)                                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│ 34.88.78.01 Disp. e Manut. Equip Control...                         9,90  │
│ 34.88.78.02 Disp. e Manut. Equip Control...                         3,12  │
│ ... (5 linhas de equipamentos, com valores à direita)                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│               (espaço vazio grande — preenche o restante da página)         │
│                                                                             │
├────────┬──────────┬──────────────┬────────────────────────────────┬────────┤
│De acor.│Continua: │  11ª MEDIÇÃO │ Contrato n.º: 22.583-6        │ Fls.   │
│        │□sim ■não │ ■ Provisória │ Objeto: Contratação de...      │ 01/01  │
│        │          │ □ Final      │ Empresa: Splice...             │        │
│        │          │ obras exec.. │                                │        │
├────────┴──────────┴──────────────┴────────────────────────────────┴────────┤
│ Contratante       │    Engenheiro Fiscal   │                      │        │
└──────────────────────────────────────────────────────────────────────────────┘
DER-621
```

### Alterações em `src/pages/Medicao.tsx`

1. **Criar div oculto de impressão** (`printHiddenRef08`):
   - Dimensões fixas: `1122px x 793px` (A4 paisagem a 96dpi)
   - Layout com `display: flex; flex-direction: column; height: 100%` para que o espaço vazio preencha automaticamente o meio da página (usando `flex-grow: 1`)
   - Tabela com `table-layout: fixed`, largura da coluna de descrição ~88%, coluna de valores ~12%
   - Linhas com `height: 22px`, `line-height: 22px`, `vertical-align: middle` para centralização perfeita
   - Footer com 5 colunas proporcionais conforme o modelo

2. **Atualizar `handleExportPDF`**:
   - Para DR-08, usar `printHiddenRef08` em vez de `printRef08`
   - Tornar o div visível temporariamente (`visibility: visible`) durante a captura
   - `html2canvas` com `scale: 2` para alta qualidade
   - Calcular proporção para preencher A4 paisagem inteiro com margens mínimas (5mm)

3. **Pré-visualização** permanece inalterada — apenas o PDF muda.

### Detalhes técnicos

- O div oculto terá `position: absolute; left: -9999px` para não afetar o layout da página
- Font: Arial 11px para descrições, 14px bold para título MEDIÇÃO, 8px para texto do contrato
- Bordas: linhas horizontais simples `1px solid #000` entre cada item (sem bordas verticais nos itens)
- Footer: bordas completas (top, right) entre as 5 colunas conforme o modelo

