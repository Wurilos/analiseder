

## Plan: Remove extra pages and adapt sidebar

### Changes

1. **Simplify `AppSidebar.tsx`**
   - Remove Dashboard, Contratos, Equipamentos, Configurações menu items
   - Keep only "Análise de Imagens" (`/classificacao`) and "Análise de Índices" (`/indices`)
   - Remove the "Cadastros" section entirely
   - Set `/classificacao` as the default landing

2. **Simplify `App.tsx`**
   - Remove `Index` page import and route
   - Change default route `/` to redirect to `/classificacao`
   - Remove unused imports

3. **Delete `src/pages/Index.tsx`**
   - No longer needed

4. **Delete `src/components/PageHeader.tsx` and `src/components/SectionCard.tsx`**
   - Only used by Index page

### Files affected
- `src/components/AppSidebar.tsx` — simplify menu
- `src/App.tsx` — remove Index route, redirect `/` to `/classificacao`
- `src/pages/Index.tsx` — delete
- `src/components/PageHeader.tsx` — delete
- `src/components/SectionCard.tsx` — delete

