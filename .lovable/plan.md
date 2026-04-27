## Renomear sistema para "Splice News - Analytics"

Atualizar todas as ocorrências visíveis do nome "DER Analytics" para **"Splice News - Analytics"**, mantendo o subtítulo "Índices de Desempenho".

### Arquivos a alterar

1. **`src/components/AppSidebar.tsx`** (linha 46)
   - Texto do logo no topo da sidebar: `DER Analytics` → `Splice News - Analytics`

2. **`src/pages/Indices.tsx`** (linha 196)
   - Título da página de índices: `DER Analytics` → `Splice News - Analytics`

3. **`index.html`** (linhas 7, 20, 21)
   - `<title>`, `og:title` e `twitter:title`: `DER Analytics — Índices de Desempenho` → `Splice News - Analytics — Índices de Desempenho`

### O que NÃO será alterado

- Referências a "DER" que se referem ao órgão (Departamento de Estradas de Rodagem) em documentos oficiais, formulários DER-621, módulo de Medição, brasão e logos — pois fazem parte da identidade contratual do Edital 145/2023.
- Memória `mem://style/visual-identity` (mantém regras de brasão SP / logo DER nos relatórios oficiais).

### Resultado

A sidebar, a aba do navegador e o título da página de Índices passarão a exibir **Splice News - Analytics**, enquanto toda a lógica e os documentos oficiais permanecem intactos.