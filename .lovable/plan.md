
Objetivo: parar de “brigar” com renderização HTML/CSS no DR-08 e entregar um PDF estável, com texto centralizado entre linhas, sem vazamento de célula e sem símbolos fora de posição.

Plano de correção (DR-08 apenas)

1) Trocar o motor do DR-08 para desenho direto no jsPDF
- Em `src/pages/Medicao.tsx`, o DR-08 deixa de usar `html2canvas` (somente para DR-08).
- O DR-14 continua como está.
- Motivo: o problema recorrente vem de variações do `html2canvas` em alinhamento de tabela/baseline.

2) Criar um “template geométrico” fixo (A4 paisagem) com coordenadas
- Definir constantes de layout em mm (página 297x210) para:
  - Cabeçalho
  - Linha “Continuação”
  - Bloco de itens (9 linhas sinalização + separador + 5 linhas equipamentos + linhas vazias)
  - Rodapé em 5 colunas
- Todas as linhas com altura fixa e sem cálculo implícito do navegador.

3) Centralização vertical real em todas as linhas
- Criar helper para escrever texto no centro vertical da célula:
  - `yTexto = yLinha + (alturaLinha / 2)` com baseline middle.
- Remover dependência de `line-height`/`vertical-align` de HTML.
- Aplicar o mesmo método para descrição, valores e textos do rodapé.

4) Garantir que texto nunca ultrapasse a célula
- Criar helper de ajuste por largura:
  - Para linhas de item: texto de 1 linha com truncamento controlado por medição (`getTextWidth`) se necessário.
  - Para “Objeto/Empresa”: quebra em múltiplas linhas com largura máxima da coluna.
- Resultado: nada invade borda nem coluna vizinha.

5) Corrigir símbolos/checkboxes com desenho vetorial
- Substituir o `chk()` baseado em `<span>` por desenho direto:
  - quadrado vazio = `rect`
  - quadrado preenchido = `rect` + `fill`
- Posicionar por coordenada (x,y) alinhada ao texto da mesma linha.
- Elimina deslocamento de símbolo entre exportações.

6) Ajustar escala de exportação para 1:1 no DR-08
- Não usar `fitScale` do canvas para DR-08.
- Gerar já no tamanho final A4 sem reamostragem.
- Isso remove distorção/subpixel que desloca texto e bordas.

7) Preservar o fluxo atual do usuário
- Botão “Exportar PDF” mantém comportamento.
- Só muda internamente:
  - DR-08 => função nova `exportDR08WithJsPDF()`
  - DR-14 => fluxo atual (`html2canvas` + `jsPDF`)

Critérios de aceite (o que será validado)
- Nenhuma palavra/símbolo passa da borda da célula.
- Todas as linhas de itens com texto visualmente centralizado entre a linha superior e inferior.
- “Continuação: [ ] sim [■] não” alinhado na mesma base.
- Rodapé com colunas alinhadas e texto contido.
- PDF DR-08 em uma única página A4 paisagem, visualmente aderente ao anexo.

Detalhes técnicos (implementação)
- Arquivo: `src/pages/Medicao.tsx`
- Funções novas:
  - `exportDR08WithJsPDF()`
  - `drawDR08Frame(doc)`
  - `drawCellText(doc, text, box, opts)`
  - `fitOneLineText(doc, text, maxWidth)`
  - `drawCheckbox(doc, x, y, checked)`
- `handleExportPDF`:
  - `if (activeLote === 'DR-08')` chama exportação vetorial e encerra.
  - caso contrário, mantém caminho atual.
