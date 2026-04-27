## Auditoria — Visão Ponderada Isolada (extensão do finance-engine)

Hoje o motor calcula as perdas em **visão contábil** (proporcional, IDF+IEF+ICV = Perda Total). Os cards principais usam essa visão e fecham. O que falta para a **auditoria** é a **visão ponderada isolada**: quanto cada índice custa em R$ sozinho, ponderado pelo valor de cada equipamento (sem normalização). É essa visão que permite responder "quanto da minha perda vem do IDF?" no sentido auditável.

### O que muda

**1) `src/lib/finance-engine.ts` — adicionar bloco `audit` em `FinanceTotals`:**

```ts
audit: {
  perdaIDF: number;        // Σ (ID se IDF=1 − ID atual) × valor_equip
  perdaIEF: number;        // idem para IEF
  perdaICV: number;        // idem para ICV
  perdaSub: FinancePerdaSub; // sub-IEF SEM normalização (R$ reais isolados)
  somaIsoladas: number;    // perdaIDF + perdaIEF + perdaICV (auditoria)
  sobreposicao: number;    // somaIsoladas − descontoTotal (efeito multiplicativo)
  pctSobreposicao: number; // sobreposicao / descontoTotal
}
```

Cálculo: simula cada índice = 1.0 mantendo os outros, mede o ganho marginal de ID e multiplica pelo `valorTotal` do equipamento. Os valores **brutos** (antes da normalização proporcional que já existe). Para `audit.perdaSub`, mesmo método dos sub-IEF mas **sem o passo de normalização final**.

**2) `src/pages/Dashboard.tsx` — bloco "Auditoria matemática" (linhas 579-639):**

- "Σ Perdas isoladas" passa a usar `finance.audit.somaIsoladas` (hoje calcula somando os 3 cards proporcionais — incorreto para auditoria).
- "Δ Sobreposição" passa a usar `finance.audit.sobreposicao` e `finance.audit.pctSobreposicao`.
- Nada mais muda visualmente; apenas os valores ficam matematicamente corretos.

**3) `src/test/finance-engine.test.ts` — novos asserts:**

- `audit.somaIsoladas = audit.perdaIDF + audit.perdaIEF + audit.perdaICV`
- `audit.sobreposicao = audit.somaIsoladas − descontoTotal`
- `audit.somaIsoladas ≥ descontoTotal` (sobreposição é sempre ≥ 0 em fórmula multiplicativa com índices ≤1)
- `Σ audit.perdaSub` ≠ obrigatoriamente `audit.perdaIEF` (sub-IEF não-normalizado tem sua própria sobreposição interna entre os 6 sub-índices)

**4) Memória — atualizar `mem://features/finance-engine`:**

Documentar as **duas leituras**:
- **Contábil/proporcional** (`perdaIDF/IEF/ICV`, `perdaSub`): para cards que precisam fechar com a Perda Total.
- **Auditoria/ponderada isolada** (`audit.*`): para mostrar impacto financeiro real e isolado de cada índice. **Não somam** a Perda Total — a diferença é a `sobreposicao`.

### Por que duas visões coexistem

- **Pagamento** = soma das perdas decompostas (bate com o desconto contratual).
- **Auditoria** = "se eu pudesse zerar este índice, quanto recuperaria?" — resposta correta para priorizar manutenção.

A diferença (`sobreposicao`) existe porque o ID é multiplicativo (`IDF × (0.9·IEF + 0.1·ICV)`): melhorar dois índices ao mesmo tempo recupera menos do que a soma das melhorias isoladas.

### Arquivos editados

- `src/lib/finance-engine.ts` (adiciona `audit` em `FinanceTotals` e o cálculo)
- `src/pages/Dashboard.tsx` (bloco auditoria usa `finance.audit`)
- `src/test/finance-engine.test.ts` (novos testes)
- `mem://features/finance-engine.md` (documenta as 2 visões)

Aprove para implementar.
