## Sim — é possível e faz total sentido inserir o impacto financeiro nesta tela

Hoje o modal "Análise de Faixa" (`RankingDetailModal.tsx`) mostra apenas o ID e os índices técnicos. Falta a leitura financeira da faixa, que já temos calculada no resto do sistema (`grouping.ts` / `finance-engine.ts`).

A faixa específica tem um valor associado (`valorFaixa = valorTotal do equipamento ÷ nº de faixas`), e como o pagamento é proporcional ao ID, podemos derivar exatamente quanto está sendo perdido em R$ nesta faixa — e, melhor, quanto cada índice (IDF, IEF, ICV) está custando.

## O que será adicionado

Um novo bloco **"Impacto Financeiro"** entre o cartão de "Potencial de Melhoria" e "Recomendações", em estilo coerente com o resto do modal (cartões pequenos, monoespaçado, mesma paleta).

**Linha 1 — Cabeçalho financeiro da faixa (3 cartões):**
- Valor Contratado (R$ da faixa no mês)
- Valor a Receber (Valor × ID da faixa)
- Perda no Faturamento (R$ e % do valor contratado) — destacado em vermelho/âmbar/verde por severidade

**Linha 2 — Quanto cada índice está custando (3 cartões verdes, alinhados ao bloco "Potencial de Melhoria"):**
- IDF=1 → +R$ recuperáveis se a disponibilidade fosse 100%
- IEF=1 → +R$ recuperáveis se a eficiência fosse 100%
- ICV=1 → +R$ recuperáveis se a classificação fosse 100%

Cada valor é o ganho marginal: `valorFaixa × max(0, ID_se_índice=1 − ID_atual)`. É a mesma lógica de auditoria já consolidada no `finance-engine` (visão isolada/marginal), só que aplicada à faixa única.

## Detalhes técnicos

- Arquivo único alterado: `src/components/RankingDetailModal.tsx`.
- Novo helper local `computeFaixaFinance(r)` que reaproveita `EQUIP_CATALOG[r.equipamento].valor` (com fallback `getValorEquip`) e divide pelo nº de faixas do equipamento. Para obter o nº de faixas da forma correta (sem refazer agrupamento), o modal passa a aceitar opcionalmente a lista `records` do contexto via prop ou usa `useData()` para contar faixas do mesmo equipamento.
- Reuso de `calcID` para os ganhos marginais por índice — mesma fórmula usada em `finance-engine.audit.*`, garantindo consistência com Dashboard / Valores / Resumo.
- Formatação via `formatCurrency` de `src/lib/format.ts` (padrão BRL já usado).
- Tratamento dos casos: faixa sem ID (`f_ID` e `c_ID` nulos) → mostra "—" e não calcula perda. Equipamento ausente do catálogo → usa fallback existente.
- Sem mudanças em engine, tipos ou outros componentes — isolamento total, zero risco para os números já validados.

## Memória

Atualizar `mem://features/ranking-module` adicionando que o modal de detalhe da faixa exibe impacto financeiro reaproveitando a lógica do `finance-engine` (visão marginal/auditoria), nunca recalculando totais de forma divergente.