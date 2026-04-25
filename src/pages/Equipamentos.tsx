import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EQUIP_CATALOG, EquipInfo, getFabricante } from '@/lib/equip-catalog';
import { formatMoeda } from '@/lib/format';
import { Search, Server, MapPin, DollarSign, Hash, Factory, Info, MessageSquarePlus, MessageSquareText, Loader2, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { useObservacoes } from '@/hooks/useObservacoes';
import { toast } from 'sonner';

type EquipRow = EquipInfo & { codigo: string; codMedicao?: string; fabricante: 'Splice' | 'Focalle' };

export default function EquipamentosPage() {
  const [search, setSearch] = useState('');
  const [loteFilter, setLoteFilter] = useState('todos');
  const { obs: obsMap, save: saveObs } = useObservacoes();

  const rows: EquipRow[] = useMemo(() =>
    Object.entries(EQUIP_CATALOG).map(([codigo, info]) => ({
      codigo,
      ...info,
      fabricante: getFabricante(info.lote, info.obs)
    })),
    []
  );

  const lotes = useMemo(() => [...new Set(rows.map(r => r.lote))].sort(), [rows]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (loteFilter !== 'todos' && r.lote !== loteFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        r.codigo.toLowerCase().includes(q) ||
        String(r.serie).includes(q) ||
        r.endereco.toLowerCase().includes(q)
      );
    });
  }, [rows, search, loteFilter]);

  const totalValor = useMemo(() => filtered.reduce((s, r) => s + r.valor, 0), [filtered]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Catálogo de Equipamentos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Relação de equipamentos e valores contratuais considerados pelo sistema.
        </p>
      </motion.div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Server, label: 'Equipamentos', value: String(filtered.length), color: 'bg-primary/10 text-primary' },
          { icon: DollarSign, label: 'Valor Total', value: formatMoeda(totalValor), color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
          { icon: MapPin, label: 'Lotes', value: String(lotes.length), color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.color}`}>
                  <kpi.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-lg font-bold text-foreground">{kpi.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar código, série ou endereço…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={loteFilter} onValueChange={setLoteFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Lote" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os lotes</SelectItem>
              {lotes.map(l => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Equipamentos</CardTitle>
          <CardDescription>{filtered.length} registro(s)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Fabricante</TableHead>
                <TableHead>Cód. Medição</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Nº Série</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead className="text-right">Valor (R$)</TableHead>
                <TableHead className="text-center pr-6">Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r, i) => {
                const userObs = obsMap[r.codigo];
                const hasObs = !!userObs;
                return (
                <TableRow key={r.codigo} className={`${hasObs ? 'bg-amber-50 dark:bg-amber-500/10 border-l-2 border-l-amber-400' : (i % 2 === 0 ? 'bg-muted/30' : '')}`}>
                  <TableCell className="pl-6">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${r.fabricante === 'Splice' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'}`}>
                      <Factory className="w-3 h-3" />
                      {r.fabricante}
                      {r.obs && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3 h-3 ml-0.5 opacity-70 hover:opacity-100 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">{r.obs}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {r.codMedicao || <span className="text-muted-foreground italic">—</span>}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-medium">{r.codigo}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-xs">
                      <Hash className="w-3 h-3 text-muted-foreground" />
                      {r.serie > 0 ? r.serie : <span className="text-muted-foreground italic">Pendente</span>}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-block px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary">
                      {r.lote}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.endereco}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold">
                    {formatMoeda(r.valor)}
                  </TableCell>
                  <TableCell className="text-center pr-6">
                    <ObsEditor
                      codigo={r.codigo}
                      value={userObs ?? ''}
                      onSave={saveObs}
                    />
                  </TableCell>
                </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    Nenhum equipamento encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ObsEditor({ codigo, value, onSave }: { codigo: string; value: string; onSave: (codigo: string, obs: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const hasObs = !!value;

  React.useEffect(() => { if (open) setDraft(value); }, [open, value]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(codigo, draft);
      toast.success(draft.trim() ? 'Observação salva.' : 'Observação removida.');
      setOpen(false);
    } catch {
      toast.error('Erro ao salvar observação.');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await onSave(codigo, '');
      toast.success('Observação removida.');
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={hasObs ? 'secondary' : 'ghost'}
          size="sm"
          className={`h-7 px-2 ${hasObs ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200 dark:hover:bg-amber-500/30' : 'text-muted-foreground'}`}
          title={hasObs ? value : 'Adicionar observação'}
        >
          {hasObs ? <MessageSquareText className="w-3.5 h-3.5" /> : <MessageSquarePlus className="w-3.5 h-3.5" />}
          <span className="ml-1 text-[11px] max-w-[140px] truncate">
            {hasObs ? value : 'Adicionar'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold">Observação do equipamento</h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Código <span className="font-mono">{codigo}</span>. Linhas com observação ficam destacadas no Ranking.
            </p>
          </div>
          <Textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Ex.: Equipamento em manutenção entre 12 e 14/03 — pode interferir nos índices."
            rows={4}
            className="text-sm"
          />
          <div className="flex justify-between gap-2">
            {hasObs ? (
              <Button variant="ghost" size="sm" onClick={handleClear} disabled={saving} className="text-destructive hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Remover
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
              <Button size="sm" onClick={handleSave} disabled={saving || draft.trim() === value.trim()}>
                {saving && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

