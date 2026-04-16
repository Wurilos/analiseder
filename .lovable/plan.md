

## Comparativo Multi-Períodos com Gráficos de Evolução

### Objetivo
Expandir a página Comparativo para aceitar N períodos (não apenas 2) e adicionar uma aba "Evolução" com filtros por equipamento e gráficos de linha mostrando a evolução do ID ao longo do tempo.

### Estrutura

A página será dividida em **2 abas** (usando o componente Tabs do shadcn):

**Aba 1 — Tabela Comparativa (atual, expandida)**
- Seleção múltipla de períodos via checkboxes em vez de 2 selects
- KPIs: ID Médio por período selecionado, variação entre primeiro e último
- Tabela com colunas dinâmicas: Série | Equipamento | Tipo | Rodovia | ID per1 | ID per2 | ... | Δ total | Status

**Aba 2 — Evolução (nova)**
- Filtro por equipamento(s) — multi-select com busca por série ou código
- Filtro por tipo (Fixo/Estático/Móvel)
- Gráfico de linhas (Recharts `LineChart`) mostrando ID no eixo Y e períodos no eixo X
  - Uma linha por equipamento selecionado
  - Tooltip com detalhes do equipamento e valor
  - Linha pontilhada de referência em ID = 1.0
- Abaixo do gráfico: tabela resumo com min, max, média e tendência de cada equipamento

### Detalhes técnicos

1. **src/pages/Comparativo.tsx** — Reescrever com:
   - Estado `selectedPeriods: string[]` (checkboxes) em vez de `periodA`/`periodB`
   - Estado `activeTab: 'comparativo' | 'evolucao'`
   - Estado `selectedEquips: string[]` para filtro de equipamentos na aba Evolução
   - `useMemo` para gerar dados da tabela multi-período (colunas dinâmicas)
   - `useMemo` para gerar séries do gráfico (array de pontos por equipamento)

2. **Componentes utilizados**:
   - `Tabs/TabsList/TabsContent` do shadcn para as abas
   - `Checkbox` do shadcn para seleção de períodos
   - Recharts `LineChart`, `Line`, `XAxis`, `YAxis`, `Tooltip`, `ReferenceLine` para o gráfico
   - `ChartContainer` existente em `src/components/ui/chart.tsx`
   - `FiltersBar`/`FilterField` existentes para os filtros

3. **Lógica de dados da Aba Evolução**:
   - Para cada equipamento selecionado, percorrer todos os períodos selecionados
   - Calcular média do `c_ID` das faixas do equipamento em cada período
   - Gerar array `{ periodo, id }` para alimentar o gráfico

