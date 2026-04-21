import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Sparkles, TrendingUp, Activity, Gauge, RotateCcw } from "lucide-react";

const INDICES_IDS = ["lcid", "lcin", "ievri", "ievdt", "ilpd", "ilpn", "icv", "idf"] as const;
type IndiceKey = typeof INDICES_IDS[number];
type TipoEquip = "CEV" | "REV" | "CEC" | "REC";

const LABELS: Record<IndiceKey, string> = {
  lcid: "LCID", lcin: "LCIn", ievri: "IEVRI", ievdt: "IEVDT",
  ilpd: "ILPD", ilpn: "ILPN", icv: "ICV", idf: "IDF",
};

const DESCRICOES: Record<IndiceKey, string> = {
  lcid: "Captura de Imagens Diurnas",
  lcin: "Captura de Imagens Noturnas",
  ievri: "Envio de Registros de Imagens",
  ievdt: "Envio de Dados de Tráfego",
  ilpd: "Leitura Diurna de Placas",
  ilpn: "Leitura Noturna de Placas",
  icv: "Classificação de Veículos",
  idf: "Disponibilidade de Faixas",
};

const GRUPOS = [
  { label: "iEF — Capturas", keys: ["lcid", "lcin"] as IndiceKey[] },
  { label: "iEF — Envios", keys: ["ievri", "ievdt"] as IndiceKey[] },
  { label: "iEF — Leituras", keys: ["ilpd", "ilpn"] as IndiceKey[] },
];

type Valores = Record<IndiceKey, number>;

const DEFAULT_VALORES: Valores = {
  lcid: 85, lcin: 80, ievri: 90, ievdt: 88,
  ilpd: 75, ilpn: 70, icv: 95, idf: 92,
};

function calcIEF(v: Valores): number {
  const mc = (v.lcid + v.lcin) / 2 / 100;
  const me = (v.ievri + v.ievdt) / 2 / 100;
  const ml = (v.ilpd + v.ilpn) / 2 / 100;
  return 0.8 * mc * me + 0.2 * ml;
}

function calcID(tipo: TipoEquip, v: Valores): number {
  const idf = v.idf / 100;
  const ief = calcIEF(v);
  const icv = v.icv / 100;
  if (tipo === "CEV") return idf * (0.9 * ief + 0.1 * icv);
  return idf * (0.7 * ief + 0.1 * icv + 0.2);
}

function getColorClass(val: number): string {
  if (val >= 0.95) return "text-emerald-600 dark:text-emerald-400";
  if (val >= 0.80) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getBarColor(val: number): string {
  if (val >= 0.95) return "bg-emerald-500";
  if (val >= 0.80) return "bg-amber-500";
  return "bg-red-500";
}

function getStatusText(id: number): string {
  if (id >= 0.95) return "Desempenho excelente";
  if (id >= 0.80) return "Atenção — abaixo da meta";
  if (id >= 0.50) return "Crítico — impacto no faturamento";
  return "Muito crítico — ação urgente";
}

function fmt(val: number): string {
  return (val * 100).toFixed(1) + "%";
}

function MetricCard({
  label, sublabel, value, raw, icon: Icon,
}: {
  label: string; sublabel: string; value: string; raw: number; icon: React.ElementType;
}) {
  const colorClass = getColorClass(raw);
  const barClass = getBarColor(raw);
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">{sublabel}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
            <Icon className={`w-4 h-4 ${colorClass}`} />
          </div>
        </div>
        <div className={`text-3xl font-mono font-bold tabular-nums ${colorClass}`}>{value}</div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-3">
          <div className={`h-full ${barClass} transition-all duration-300`} style={{ width: value }} />
        </div>
        <p className="text-[10.5px] text-muted-foreground mt-2 leading-tight">{getStatusText(raw)}</p>
      </CardContent>
    </Card>
  );
}

function SliderRow({
  label, desc, value, onChange,
}: {
  label: string; desc: string; value: number; onChange: (v: number) => void;
}) {
  const colorClass = getColorClass(value / 100);
  return (
    <div className="space-y-2 py-2">
      <div className="flex justify-between items-baseline">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold">{label}</span>
          <span className="text-[11px] text-muted-foreground">{desc}</span>
        </div>
        <span className={`text-sm font-mono font-bold tabular-nums ${colorClass}`}>{value}%</span>
      </div>
      <Slider
        min={0}
        max={100}
        step={1}
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
      />
    </div>
  );
}

export default function SimuladorPage() {
  const [tipo, setTipo] = useState<TipoEquip>("CEV");
  const [valores, setValores] = useState<Valores>(DEFAULT_VALORES);

  const handleChange = useCallback((key: IndiceKey, val: number) => {
    setValores((prev) => ({ ...prev, [key]: val }));
  }, []);

  const ief = calcIEF(valores);
  const id = calcID(tipo, valores);
  const idf = valores.idf / 100;

  const impacts = INDICES_IDS
    .map((key) => {
      if (valores[key] >= 100) return { key, gain: 0 };
      const newVals = { ...valores, [key]: 100 };
      const newID = calcID(tipo, newVals);
      return { key, gain: Math.max(0, newID - id) };
    })
    .filter((x) => x.gain > 0.0001)
    .sort((a, b) => b.gain - a.gain);

  const maxGain = impacts.length ? impacts[0].gain : 1;
  const ranks = ["1º", "2º", "3º", "4º", "5º", "6º", "7º", "8º"];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-primary" />
            Simulador de Índices
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Edital 145/2023 — Simule cenários de desempenho ajustando os subíndices em tempo real.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setValores(DEFAULT_VALORES)}>
          <RotateCcw className="w-4 h-4" />
          Resetar
        </Button>
      </header>

      {/* Tipo de equipamento */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Tipo de Equipamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(["CEV", "REV", "CEC", "REC"] as TipoEquip[]).map((t) => (
              <button
                key={t}
                onClick={() => setTipo(t)}
                className={[
                  "py-2.5 text-sm font-mono font-bold rounded-md border-2 transition-all",
                  tipo === t
                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                    : "border-border text-muted-foreground hover:bg-muted hover:border-muted-foreground/30",
                ].join(" ")}
              >
                {t}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resultado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="ID" sublabel="Índice de Desempenho" value={fmt(id)} raw={id} icon={Gauge} />
        <MetricCard label="iEF" sublabel="Eficiência dos Equipamentos" value={fmt(ief)} raw={ief} icon={Activity} />
        <MetricCard label="IDF" sublabel="Disponibilidade de Faixas" value={fmt(idf)} raw={idf} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sliders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subíndices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {GRUPOS.map((grupo) => (
              <div key={grupo.label}>
                <p className="text-[11px] font-bold text-primary uppercase tracking-wider mb-2 pb-1.5 border-b border-border">
                  {grupo.label}
                </p>
                <div className="divide-y divide-border/50">
                  {grupo.keys.map((key) => (
                    <SliderRow
                      key={key}
                      label={LABELS[key]}
                      desc={DESCRICOES[key]}
                      value={valores[key]}
                      onChange={(v) => handleChange(key, v)}
                    />
                  ))}
                </div>
              </div>
            ))}
            <div>
              <p className="text-[11px] font-bold text-primary uppercase tracking-wider mb-2 pb-1.5 border-b border-border">
                Outros Componentes
              </p>
              <div className="divide-y divide-border/50">
                {(["icv", "idf"] as IndiceKey[]).map((key) => (
                  <SliderRow
                    key={key}
                    label={LABELS[key]}
                    desc={DESCRICOES[key]}
                    value={valores[key]}
                    onChange={(v) => handleChange(key, v)}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alavancas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Alavancas de Recuperação
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Ganho potencial no ID se cada índice fosse elevado a 100%.
            </p>
          </CardHeader>
          <CardContent>
            {impacts.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-medium">ID máximo atingido</p>
                <p className="text-xs text-muted-foreground">Todos os índices estão em 100%.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {impacts.slice(0, 8).map((x, i) => {
                  const barW = ((x.gain / maxGain) * 100).toFixed(1) + "%";
                  return (
                    <div
                      key={x.key}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-border bg-card hover:bg-muted/40 transition-colors"
                    >
                      <span className="text-[11px] font-mono text-muted-foreground w-6">{ranks[i]}</span>
                      <div className="w-14">
                        <div className="text-xs font-mono font-bold">{LABELS[x.key]}</div>
                        <div className="text-[9px] text-muted-foreground leading-tight">{DESCRICOES[x.key].split(" ").slice(0, 2).join(" ")}</div>
                      </div>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-300"
                          style={{ width: barW }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold w-16 text-right text-primary tabular-nums">
                        +{(x.gain * 100).toFixed(2)}pp
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
