## Exportar Relatório Executivo em Excel (.xlsx)

Adicionar um botão **"Exportar Excel"** na página `Resumo`, ao lado do atual "Exportar PDF", gerando um arquivo `.xlsx` editável onde você poderá adicionar comentários, observações e imagens manualmente.

### O que será exportado

Arquivo `Relatorio_Executivo_<periodo>.xlsx` com **3 abas**:

**Aba 1 — "Resumo Executivo"**
- Cabeçalho: título, período ativo, data de geração
- KPIs gerais: Equipamentos Críticos / Alerta / OK / Desconto Total
- Linhas em branco reservadas para você inserir observações gerais e imagens

**Aba 2 — "Equipamentos"** (uma linha por equipamento)
Colunas:
- Equipamento, Rodovia, km, Tipo, Lote, Nº Faixas
- ID, IDF, IEF, ICV (índices principais, em %)
- ICId, ICIn, IEVri, IEVdt, ILPd, ILPn (subíndices, em %)
- Severidade (Crítico/Alerta/OK)
- Valor Contratado, Valor Recebido, Desconto (R$)
- Principal Alavanca + Recuperação Potencial (R$)
- **Coluna "Observações"** vazia para você preencher
- **Coluna "Imagem"** vazia para inserir foto do equipamento

Formatação: cabeçalho em negrito com fundo navy, células de severidade coloridas (vermelho/âmbar/verde), valores monetários em R$, percentuais com 1 casa decimal, congelar primeira linha, larguras ajustadas, autofiltro ativo.

**Aba 3 — "Recomendações Detalhadas"**
- Equipamento + Severidade + bloco de texto com todas as recomendações geradas (mesmo conteúdo do PDF), uma linha por recomendação, agrupadas por equipamento. Espaço para anexar imagens entre os blocos.

### Como ficará tecnicamente

- Nova lib: **`xlsx`** (SheetJS) — já leve, mesma família usada no parser de upload, sem peso extra significativo.
- Novo arquivo: `src/lib/excel-export.ts` com a função `exportResumoToExcel(groups, stats, periodo)` — isolando a lógica de montagem das planilhas, estilos e download.
- `src/pages/Resumo.tsx`: adicionar botão "Exportar Excel" ao lado do PDF, chamando essa função.
- A fonte dos dados continua sendo a mesma do PDF (`groups` + `computeFinanceForGroups`), garantindo paridade total entre os dois formatos.
- Não haverá alterações em backend, banco, finance-engine, parser ou qualquer cálculo existente.

### Fora do escopo

- Inserir imagens automaticamente no .xlsx (SheetJS comunidade não suporta imagens embutidas de forma confiável). A coluna "Imagem" fica reservada para você arrastar fotos manualmente no Excel — que é o fluxo natural quando se quer adicionar evidências por equipamento.
