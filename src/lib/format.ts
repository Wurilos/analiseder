export function normStr(s: unknown): string {
  return String(s ?? '').trim();
}

export function safeNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).replace(',', '.').replace(/[^0-9.\-]/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function fmt(n: number | null, d = 0): string {
  return n !== null ? n.toFixed(d) : '—';
}

export function pct(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return (Number(n) * 100).toFixed(1) + '%';
}

export function formatMoeda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || isNaN(valor)) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(valor);
}

export function getStatusColor(value: number | null, meta: number): {
  color: string;
  label: string;
} {
  if (value === null || value === undefined) return { color: 'neon-cyan', label: 'Sem dado' };
  if (value < meta) return { color: 'neon-red', label: 'Crítico' };
  if (value < meta + 0.08) return { color: 'neon-amber', label: 'Atenção' };
  return { color: 'neon-green', label: 'OK' };
}

export function getPercColor(value: number): string {
  if (value > 20) return 'neon-red';
  if (value > 10) return 'neon-amber';
  return 'neon-green';
}
