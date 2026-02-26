

## Plan: Update colors and style to match reference image

The reference image shows a clean Enterprise SaaS style with dark navy sidebar, light gray main background, white cards, and colorful KPI icons. The current CSS variables are close but need refinement to match the reference more precisely.

### Changes

1. **`src/index.css`** — Refine CSS variables:
   - Sidebar background to darker navy (`228 33% 17%`)
   - Sidebar text colors brighter
   - Background slightly warmer light gray
   - Card shadows more subtle
   - Remove neon-themed gradients (`text-gradient-primary`, `text-gradient-danger`) — replace with solid colors
   - Update `.card-glass` to cleaner white card style

2. **`src/components/AppSidebar.tsx`** — Update sidebar styling:
   - Header text colors to use `text-sidebar-foreground` and `text-sidebar-foreground/60` for subtitle
   - Logo icon background to match reference (white/primary circle)
   - Footer user avatar and text use sidebar color tokens
   - Active menu item styling: lighter accent bg with white text

3. **`src/components/KPIGrid.tsx`** — Update KPI card style:
   - Larger, more prominent colored circles for icons (matching reference)
   - Clean white card with subtle shadow instead of border-heavy style

4. **`src/pages/Classificacao.tsx`** — Remove emoji prefixes from headings, use cleaner text styling (solid colors instead of gradients)

5. **`src/pages/Indices.tsx`** — Same: remove emojis from headings, use solid primary color text

6. **`src/components/UploadCard.tsx`** — Simplify hover effects, remove neon gradient backgrounds, use clean primary color accents

7. **`src/components/RankingCard.tsx`** — Use solid color headings instead of gradient text

### Files affected
- `src/index.css`
- `src/components/AppSidebar.tsx`
- `src/components/KPIGrid.tsx`
- `src/pages/Classificacao.tsx`
- `src/pages/Indices.tsx`
- `src/components/UploadCard.tsx`
- `src/components/RankingCard.tsx`

