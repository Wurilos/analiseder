## Ideia

Manter os cálculos atuais **exatamente como estão** (não-lineares, isolados) e adicionar, **logo abaixo dos 3 cards de perda (IDF/IEF/ICV)**, uma faixa de mini-cards de auditoria que prova ao usuário que o sistema está consistente.

## Mini-cards de auditoria (linha abaixo dos cards de perda)

Quatro chips compactos, lado a lado, em fonte menor (estilo "rodapé matemático"):

```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Σ Perdas isoladas│ Desconto real    │ Δ (sobreposição) │ Conferência      │
│ R$ 12.480,00     │ R$ 9.320,00      │ +R$ 3.160,00     │ V. Total − Receb │
│ IDF+IEF+ICV      │ V.Tot − V.Receb  │ 33,9% sobrepostos│ R$ 9.320,00 ✓    │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

1. **Σ Perdas isoladas** — soma dos três cards acima (`perdaIDF + perdaIEF + perdaICV`)
2. **Desconto real** — `valorTotal − valorRecebido` (cálculo financeiro direto da planilha)
3. **Δ Sobreposição** — diferença entre os dois (`Σ − desconto real`) com % relativa. Explica, em uma linha, *por que* não bate: "ganhos marginais que se sobrepõem na fórmula multiplicativa ID = IDF × (0,9·IEF + 0,1·ICV)"
4. **Conferência** — recalcula `valorTotal − valorRecebido` mostrando os dois números fonte, provando que o desconto real está correto

Tudo derivado dos valores **já calculados** em `totals` no `Valores.tsx` — zero código novo de cálculo, apenas exibição.

## Tooltip explicativo

Ícone `Info` no card "Δ Sobreposição" abre tooltip:

> Cada perda mostra "quanto ganharíamos se *apenas este índice* fosse 1.0". Como o ID é multiplicativo, esses ganhos se sobrepõem — a soma dos três é maior que o desconto real. Ambos os números estão corretos: as barras mostram **potencial isolado de recuperação** por índice; o desconto real é o efeito **combinado** da fórmula do edital.

## Onde aplicar

Arquivo único: **`src/pages/Valores.tsx`**

- Inserir nova `<div>` com 4 mini-cards logo após a grade atual de cards de perda IDF/IEF/ICV
- Estilo: cards menores (~`p-3 text-xs`), borda tracejada sutil, label em uppercase pequeno, valor em `font-mono`
- Cor neutra/slate para diferenciar visualmente dos KPIs principais e indicar "informação de auditoria"
- Ícone `Calculator` ou `CheckCircle2` no card "Conferência"

## O que NÃO muda

- Nenhuma fórmula é alterada
- Nenhum outro card, gráfico, tabela ou tela é tocado
- `grouping.ts`, `calc-engine.ts`, modal de Resumo, Dashboard — todos intactos
- O usuário ganha **transparência total**: vê os dois números lado a lado e entende a relação matemática entre eles