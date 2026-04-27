## Objetivo

Diferenciar claramente os dois cards de ID Médio do Dashboard:

1. **Card "ID Médio"** → média considerando apenas faixas/equipamentos com ID **válido e maior que zero** (exclui nulos **e** zerados).
2. **Card "ID Médio (Todos Importados)"** → média de **todas** as faixas importadas (inclui zerados; nulos seguem fora porque não há valor numérico para somar).

Hoje os dois cards excluem apenas nulos — zerados entram em ambos, então o primeiro card fica artificialmente baixo e os dois ficam quase iguais.

## Mudanças

### 1. `src/lib/finance-engine.ts`
Adicionar dois campos novos em `FinanceTotals`, sem mexer nos existentes (que continuam servindo cálculos contábeis/pagamento):

- `idMedioFaixaSemZero: number` — média de `f_ID ?? c_ID` filtrando `null` **e** `0` (e ≤ 0 por segurança).
- `numFaixasComIDPositivo: number` — denominador correspondente, para o subtítulo do card.

`idMedioFaixa` (já existente, inclui zerados) permanece intocado — é a base oficial do pagamento e não pode mudar.

### 2. `src/pages/Dashboard.tsx`
- Card **"ID Médio"** (linha 440) passa a consumir `idMedioFaixaSemZero` (via novo memo local que filtra `getDisplayID(r) !== null && getDisplayID(r)! > 0`). Subtítulo: `"X de Y faixas com ID > 0"`.
- Card **"ID Médio (Todos Importados)"** (linha 450) continua usando `avgAllIDs` (lógica atual, exclui apenas nulos). Ajustar o rótulo do subtítulo para deixar explícito: `"Inclui faixas com ID = 0"`.
- Quando o toggle estiver em visão "Equipamento", aplicar a mesma regra: filtro `c_ID !== null && c_ID > 0` para o card principal.

### 3. Testes — `src/test/finance-engine.test.ts`
Adicionar caso garantindo que:
- Faixa com ID = 0 entra em `idMedioFaixa` mas **não** em `idMedioFaixaSemZero`.
- Faixa com ID = `null` fica fora de ambos.

### 4. Memória
Atualizar `mem://features/finance-engine` registrando a nova métrica e a regra: "ID Médio (operacional) ignora zerados; ID Médio (Todos Importados) inclui zerados".

## O que NÃO muda

- `idMedioFaixa` (pagamento), severidade, perdas IDF/IEF/ICV, sub-IEF — toda a contabilidade financeira segue idêntica.
- Cards de severidade (críticos/alerta/OK) seguem contando zerados como críticos (correto pelo edital).
- Tabelas, ranking e exports não são alterados.

## Resultado visual esperado

| Card | Antes | Depois |
|---|---|---|
| ID Médio | Inclui zerados (puxa para baixo) | Apenas operacionais (>0) |
| ID Médio (Todos Importados) | Inclui zerados | Inclui zerados (igual, mas rótulo deixa claro) |

A diferença entre os dois cards passa a representar exatamente o impacto dos equipamentos zerados na média geral.
