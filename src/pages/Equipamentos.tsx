import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EQUIP_CATALOG, EquipInfo } from '@/lib/equip-catalog';
import { formatMoeda } from '@/lib/format';
import { Search, Server, MapPin, DollarSign, Hash } from 'lucide-react';
import { motion } from 'framer-motion';

type EquipRow = EquipInfo & { codigo: string };

export default function EquipamentosPage() {
  const [search, setSearch] = useState('');
  const [loteFilter, setLoteFilter] = useState('todos');

  const rows: EquipRow[] = useMemo(() =>
    Object.entries(EQUIP_CATALOG).map(([codigo, info]) => ({ codigo, ...info })),
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
                <TableHead className="pl-6">Cód. Medição</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Nº Série</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead className="text-right pr-6">Valor (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r, i) => (
                <TableRow key={r.codigo} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                  <TableCell className="pl-6 font-mono text-xs">
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
                  <TableCell className="text-right pr-6 font-mono text-xs font-semibold">
                    {formatMoeda(r.valor)}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
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
