import React, { useState, useMemo } from 'react';
import { useParalisacao } from '@/context/ParalisacaoContext';
import { EQUIP_CATALOG } from '@/lib/equip-catalog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PauseCircle, Trash2, Plus, Search } from 'lucide-react';

const ParalisacoesPage: React.FC = () => {
  const { entries, addEntry, removeEntry } = useParalisacao();
  const [selectedEquip, setSelectedEquip] = useState('');
  const [motivo, setMotivo] = useState('');
  const [dataInicio, setDataInicio] = useState(() => new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');

  const allEquips = useMemo(() => Object.keys(EQUIP_CATALOG).sort(), []);
  const availableEquips = useMemo(() => {
    const paralisados = new Set(entries.map(e => e.equipamento));
    return allEquips.filter(e => !paralisados.has(e));
  }, [allEquips, entries]);

  const filteredAvailable = useMemo(() => {
    if (!search) return availableEquips.slice(0, 50);
    const s = search.toLowerCase();
    return availableEquips.filter(e => {
      const info = EQUIP_CATALOG[e];
      return e.toLowerCase().includes(s) || 
             info?.endereco?.toLowerCase().includes(s) || 
             info?.lote?.toLowerCase().includes(s) ||
             String(info?.serie ?? '').includes(s);
    }).slice(0, 50);
  }, [availableEquips, search]);

  const handleAdd = () => {
    if (!selectedEquip) return;
    addEntry({ equipamento: selectedEquip, motivo: motivo || 'Não informado', dataInicio });
    setSelectedEquip('');
    setMotivo('');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title flex items-center gap-2">
            <PauseCircle className="w-6 h-6 text-destructive" />
            Paralisações
          </div>
          <div className="page-subtitle">
            Equipamentos com pendências de paralização — linhas destacadas em salmão nas listagens
          </div>
        </div>
      </div>

      {/* Add form */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4" /> Adicionar Equipamento Paralisado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground mb-1 block">Equipamento</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar equipamento..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 mb-1"
                />
              </div>
              <Select value={selectedEquip} onValueChange={setSelectedEquip}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o equipamento" />
                </SelectTrigger>
                <SelectContent className="max-h-[250px]">
                  {filteredAvailable.map(e => {
                    const info = EQUIP_CATALOG[e];
                    return (
                      <SelectItem key={e} value={e}>
                        <span className="font-mono font-bold">{e}</span>
                        <span className="text-muted-foreground text-xs ml-2">
                          Série {info?.serie ?? '—'} · {info?.lote} · {info?.endereco}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[200px]">
              <label className="text-xs text-muted-foreground mb-1 block">Motivo</label>
              <Input
                placeholder="Ex: Manutenção preventiva"
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
              />
            </div>
            <div className="min-w-[150px]">
              <label className="text-xs text-muted-foreground mb-1 block">Data Início</label>
              <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
            </div>
            <Button onClick={handleAdd} disabled={!selectedEquip}>
              <Plus className="w-4 h-4 mr-1" /> Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {entries.length} Equipamento{entries.length !== 1 ? 's' : ''} Paralisado{entries.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <PauseCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Nenhum equipamento paralisado cadastrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Série</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Data Início</TableHead>
                  <TableHead className="w-[80px]">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map(entry => {
                  const info = EQUIP_CATALOG[entry.equipamento];
                  return (
                    <TableRow key={entry.equipamento} className="bg-salmon/20">
                      <TableCell className="font-mono font-bold">{entry.equipamento}</TableCell>
                      <TableCell className="font-mono">{info?.serie ?? '—'}</TableCell>
                      <TableCell>{info?.lote ?? '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{info?.endereco ?? '—'}</TableCell>
                      <TableCell>{entry.motivo}</TableCell>
                      <TableCell className="font-mono text-xs">{entry.dataInicio}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => removeEntry(entry.equipamento)} className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ParalisacoesPage;
