## Cérebro Único de Cálculo (`src/lib/finance-engine.ts`)

Hoje cada página calcula seus próprios totais e médias, gerando diferenças entre Dashboard, Resumo, Valores e Modal de Análise. A solução é centralizar tudo em **um único módulo**, com **uma única função de agregação** que cada página consome.

### Problema diagnosticado

| Página/Card | Como calcula hoje | Risco |
|---|---|---|
| Dashboard — ID Médio | média simples sobre faixas filtradas | ✅ correto |
| Dashboard — Perdas IDF/IEF/ICV + sub-IEF normalizados | lógica própria (linhas 360-410) | ✅ correto, mas duplicada |
| Valores — Totais | soma própria sobre `groups` | duplicação |
| Resumo — Desconto Total | soma própria | duplicação, suscetível a divergir |
| LoteAnaliseModal — Totais | função `calcResumo` própria | já alinhado, mas duplicado |
| Indices/Mapa | recalculam médias e somas | propenso a drift |
| `grouping.ts` | calcula `perdaIDF/IEF/ICV` por equipamento usando `c_*` | ok como base, mas os subíndices ficam soltos |

### Solução: um único motor com uma única API

**Novo arquivo `src/lib/finance-engine.ts`** exporta:

```ts
export interface FinanceTotals {
  // Universos
  numEquipamentos: number;
  numFaixas: number;
  numFaixasComID: number;
  // Financeiro
  valorContratado: number;
  valorRecebido: number;
  descontoTotal: number;
  pctDesconto: number;
  // ID
  idMedioFaixa: number;        // média simples por faixa (oficial p/ pagamento)
  idMedioEquipamento: number;  // média simples por equipamento
  // Severidade (cortes oficiais Dashboard: <0.60 / 0.60-0.85 / ≥0.85)
  faixasCriticas: number; faixasAlerta: number; faixasOk: number;
  equipCriticos: number;  equipAlerta: number;  equipOk: number;
  // Perdas (decompostas proporcionalmente — IDF+IEF+ICV = descontoTotal)
  perdaIDF: number; perdaIEF: number; perdaICV: number;
  // Subíndices do IEF (normalizados para somar perdaIEF)
  perdaSub: { ICId: number; ICIn: number; IEVri: number; IEVdt: number; ILPd: number; ILPn: number };
}

export function computeFinance(records: IDRecord[]): FinanceTotals;
export function computeFinanceForGroups(groups: EquipGroup[], records: IDRecord[]): FinanceTotals;
```

Toda a lógica que hoje vive em `Dashboard.tsx` (perdas + sub-IEF normalizados) e em `LoteAnaliseModal.tsx` (decomposição proporcional) é movida para cá. Se houver dúvida entre 2 implementações, prevalece a do **Dashboard atual** (que você confirmou como referência).

### Refatorações nas páginas

Cada página passa a chamar o motor:

1. **`Dashboard.tsx`** — substitui o bloco `perdas` (linhas 359-410) e os contadores `below6/below85` por `computeFinance(filtered)`.
2. **`Valores.tsx`** — substitui o `useMemo` `totals` (linhas 108-115) por `computeFinanceForGroups(groups, records)`. Mantém apenas a lógica de tabela/lista.
3. **`Resumo.tsx`** — substitui os contadores `criticos/alerta/ok/descontoTotal` (linhas 130-134) por campos do motor.
4. **`LoteAnaliseModal.tsx`** — `calcResumo` interna é substituída por `computeFinanceForGroups`. Os blocos por fabricante chamam o mesmo motor passando o subset Splice/Focalle.
5. **`Indices.tsx` / `Mapa.tsx`** — passam a usar o motor para qualquer total financeiro ou contagem por severidade exibida.

### Regras de consistência (memorizadas)

- **ID Geral / pagamento** = média simples por faixa (decisão sua confirmada).
- **Cortes de severidade** = `<0.60 Crítico`, `0.60–0.85 Alerta`, `≥0.85 OK` (cortes oficiais do Dashboard).
- **Perda Total** = soma de `descontoTotal` por equipamento.
- **IDF + IEF + ICV** = decomposição proporcional → soma exatamente Perda Total.
- **Sub-IEF (6 cards)** = ganho marginal real (simular sub=1.0) normalizado para somar Perda IEF.
- **`f_*` (planilha) tem prioridade sobre `c_*` (calculado)**, mantendo a regra do projeto.

### Garantia anti-regressão

- Adiciono testes em `src/test/` cobrindo: identidade `IDF+IEF+ICV = descontoTotal`, identidade `Σ sub-IEF = perdaIEF`, e que duas páginas diferentes (Dashboard vs Resumo vs Valores) recebem os mesmos números do motor para o mesmo input.
- Memória do projeto atualizada: novo arquivo `mem://features/finance-engine` registrando que **toda página deve consumir `finance-engine.ts`** — proibido recalcular localmente.

### Impacto visual

Nenhuma mudança visual intencional. Os números do Resumo, Valores e Modal vão **passar a bater** com o Dashboard (que é a referência). Se algum card hoje exibe valor diferente do Dashboard, ele será corrigido — não o contrário.

### Arquivos editados

- **Novo**: `src/lib/finance-engine.ts`, `src/test/finance-engine.test.ts`, `mem://features/finance-engine.md`
- **Editados**: `src/pages/Dashboard.tsx`, `src/pages/Valores.tsx`, `src/pages/Resumo.tsx`, `src/pages/Indices.tsx`, `src/pages/Mapa.tsx`, `src/components/LoteAnaliseModal.tsx`
- **Atualizado**: `mem://index.md` (referência ao novo motor no Core)

Aprove para eu implementar.
