
## Substituir KPI "Mediana" por "ID Médio (Operantes)" no Dashboard

### Alteração
Arquivo único: `src/pages/Dashboard.tsx`

1. Criar `withIDOperante = filtered.filter(r => r.c_ID !== null && r.c_ID > 0)` e calcular `avgOperante`.
2. Remover o `KPICard` da Mediana da grade principal.
3. Inserir no lugar um novo `KPICard`:
   - Label: "ID Médio (Operantes)"
   - Valor: `avgOperante.toFixed(4)`
   - Sub: `${withIDOperante.length} faixas (exclui zerados/nulos)`
   - Cor: `teal` para diferenciar do "ID Médio" geral
   - Ícone: `Activity` ou similar do lucide-react

A grade mantém o mesmo número de colunas — apenas troca um card pelo outro. Nenhuma outra métrica ou aba é afetada.
