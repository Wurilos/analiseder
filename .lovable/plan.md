# Alinhar Resumo ao Dashboard

Hoje as duas telas usam regras diferentes, então os números nunca batem. Vamos padronizar tudo pelo Dashboard (que é a referência oficial).

## Divergências encontradas

| Item | Dashboard (referência) | Resumo (hoje) |
|---|---|---|
| Severidade | <0.60 Crítico · 0.60–0.85 Alerta · ≥0.85 OK | <0.85 Crítico · 0.85–0.95 Regular · ≥0.95 Ótimo |
| ID exibido por equipamento | `f_ID ?? c_ID` (planilha primeiro) | `c_ID` (calculado) |
| Filtros (rodovia, tipo, fabricante, etc.) | Aplica | Não aplica |
| Cálculo de Desconto Total | Soma `g.descontoTotal` dos grupos filtrados | Soma de todos os grupos (sem filtro) |

Como a fonte de `descontoTotal` no `groupByEquipamento` já usa `f_ID`, o valor financeiro só diverge porque o Resumo ignora filtros e porque a contagem de Críticos/Regulares/Ótimos usa cortes diferentes.

## Mudanças

### 1. `src/pages/Resumo.tsx` — alinhar severidade
- `severidade(id)`:
  - `id >= 0.85` → "OK" (verde)
  - `id >= 0.60` → "Alerta" (âmbar)
  - `id < 0.60` → "Crítico" (vermelho)
- `stats`: trocar contagens para
  - `criticos = c_ID < 0.60`
  - `alerta = 0.60 ≤ c_ID < 0.85`
  - `ok = c_ID ≥ 0.85`
- Renomear o card "Regulares" → "Alerta" e "Ótimos" → "OK", mantendo as cores do Dashboard.
- Ajustar a função `gerarTextoMelhoria`:
  - "desempenho excelente" passa a usar `id >= 0.85` (era 0.98).
  - Os textos por subíndice continuam iguais (já são limites independentes).

### 2. `src/pages/Resumo.tsx` — usar o mesmo ID do Dashboard
- Trocar a ordenação e exibição para usar `f_ID ?? c_ID` (o `groupByEquipamento` já preenche `c_ID` com `f_ID ?? c_ID`, então só precisamos garantir que o componente leia `g.c_ID` — já está correto). Vamos validar lendo o agrupador e adicionando um helper `getDisplayID(g) = g.c_ID` para deixar explícito.

### 3. `src/pages/Resumo.tsx` — refletir filtros (opcional, mas recomendado)
- Adicionar no topo do Resumo um aviso "Sem filtros aplicados — mostrando todos os equipamentos do período" para deixar claro por que o número pode diferir do Dashboard quando o usuário tem filtros ativos. (Não vamos duplicar a barra de filtros — o Resumo é executivo e abrange o período inteiro.)

### 4. Cabeçalho do Resumo
- Atualizar o subtítulo: "Diagnóstico completo · Critérios alinhados ao Dashboard (Crítico <60% · Alerta 60–85% · OK ≥85%)".

## Arquivos alterados
- `src/pages/Resumo.tsx` (única alteração)

Nenhuma migração de banco e nenhuma alteração no Dashboard ou no engine de cálculo.
