

## Plan: Revert Equipment Catalog Data Changes

The last edit modified `codMedicao` values for 3 equipment entries in `src/lib/equip-catalog.ts`. The user wants to revert those specific data changes while keeping the Medição page layout (DR-14 Memória de Cálculo) intact.

### Changes

**`src/lib/equip-catalog.ts`** — Revert the 3 corrected `codMedicao` values back to their original mappings:
- `CEC260191`: revert from `34.88.78.01` back to `34.88.78.06`
- `CEC250184`: revert from `34.88.78.06` back to `34.88.78.06` (verify if changed)
- `CEV250260`: revert from `34.88.78.03` back to `34.88.78.03` (verify if changed)

I will check the git diff to confirm which exact values were changed and restore them precisely. No changes to `Medicao.tsx` layout.

### Build Error Fix

The `vite: command not found` error is a transient environment issue unrelated to code — no code fix needed.

