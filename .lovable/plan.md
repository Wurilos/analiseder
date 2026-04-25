## O que muda

Substituir o texto técnico do tooltip do ícone Info no card "Δ Sobreposição" (Dashboard) pela explicação simples com analogia do jantar.

## Onde

Arquivo único: `src/pages/Dashboard.tsx`, linhas 635-637 (dentro do `TooltipContent` do bloco de auditoria matemática).

## Novo conteúdo do tooltip

- **Título**: "Por que a soma não bate com o desconto real?"
- **Parágrafo 1**: analogia das 3 notas multiplicadas e a pergunta "e se só este fosse 100%?"
- **Parágrafo 2**: analogia do jantar (3 pessoas × R$ 100 ≠ R$ 300 reais economizados)
- **Lista**: o que cada um dos 3 mini-cards representa (Σ Perdas isoladas / Desconto real / Δ Sobreposição)
- **Fecho**: "Os dois números estão certos — respondem a perguntas diferentes."

Tooltip ficará um pouco mais largo (`max-w-sm`) e com `space-y-2` para boa legibilidade.

## O que NÃO muda

- Nenhum cálculo, nenhuma fórmula, nenhum outro tooltip ou card.
- Apenas o texto interno desse `TooltipContent` específico.